import os
import json
import numpy as np
import requests
from dotenv import load_dotenv

load_dotenv()


def monte_carlo_simulation(base_value: float, iterations: int, volatility_scale: float, risk_threshold: float) -> str:
    """Runs a Monte Carlo simulation for financial risk analysis."""
    returns = np.random.normal(loc=1.05, scale=float(volatility_scale), size=(int(iterations), 5))
    portfolio = float(base_value) * np.cumprod(returns, axis=1)  # type: ignore
    final_values = portfolio[:, -1]  # type: ignore
    var_95 = np.percentile(final_values, 5)
    median_val = np.median(final_values)
    
    # Generate 50-bin histogram data for frontend Recharts
    counts, bin_edges = np.histogram(final_values, bins=50)
    total_runs = len(final_values)
    histogram_data = [
        {"value": round(float(bin_edges[i]), 2), "probability": round(float(counts[i] / total_runs) * 100, 2)}
        for i in range(len(counts))
    ]

    return json.dumps({
        "5th_Percentile_Value": round(float(var_95), 2),
        "Median_Value": round(float(median_val), 2),
        "Risk_Assessment": "High Risk" if var_95 < float(base_value) * float(risk_threshold) else "Acceptable Risk",
        "Histogram": histogram_data
    })


import typing

def _call(client, model: str, prompt: typing.Any, temperature: float = 0.3, tools=None,
          max_retries: int = 5, retry_delay: float = 6.0, progress_callback=None, response_mime_type: str = None) -> str:
    """Blocking generate_content call using direct HTTP requests to bypass Python 3.9 httpx deadlocks."""
    import time as _time
    import os
    import requests

    api_key = os.environ.get("GEMINI_API_KEY", "")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    parts = []
    if isinstance(prompt, list):
        for item in prompt:
            if hasattr(item, "uri"):
                parts.append({"fileData": {"mimeType": getattr(item, "mime_type", "application/pdf"), "fileUri": getattr(item, "uri", "")}})
            elif hasattr(item, "text"):
                parts.append({"text": getattr(item, "text")})
            else:
                parts.append({"text": str(item)})
    else:
        parts.append({"text": str(prompt)})

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": 65536
        }
    }
    
    if response_mime_type:
        payload["generationConfig"]["responseMimeType"] = response_mime_type
    
    # Only add Google Search tool if an actual tool object is provided (not None)
    if tools and any(t is not None for t in tools):
        payload["tools"] = [{"googleSearch": {}}]

    # Use longer timeout for heavy reasoning models (pro/latest/thinking)
    is_thinking = any(x in model.lower() for x in ["pro", "latest", "thinking"])
    timeout = 400 if is_thinking else 180

    # Log call parameters for debugging
    prompt_size = sum(len(p.get("text", "")) for p in parts)
    has_search = tools and any(t is not None for t in tools) if tools else False
    print(f"[Engine] _call: model={model}, prompt={prompt_size}chars, timeout={timeout}s, search={has_search}")

    last_exc: Exception = RuntimeError("_call: no attempts made")
    for attempt in range(1, max_retries + 1):
        try:
            resp = requests.post(url, json=payload, timeout=timeout)
            if not resp.ok:
                raise ValueError(f"HTTP {resp.status_code}: {resp.text[:500]}")
            
            data = resp.json()

            # Check for prompt-level blocking
            pf = data.get("promptFeedback", {})
            block_reason = pf.get("blockReason")
            if block_reason:
                raise ValueError(f"Prompt blocked by API: {block_reason} — {pf}")

            candidates = data.get("candidates", [])
            if not candidates:
                raise ValueError(f"No candidates returned. Full response keys: {list(data.keys())}")
            
            # Check finish reason
            finish_reason = candidates[0].get("finishReason", "UNKNOWN")
            if finish_reason not in ("STOP", "MAX_TOKENS"):
                print(f"[Engine] WARNING: finishReason={finish_reason} (attempt {attempt})")
            
            resp_parts = candidates[0].get("content", {}).get("parts", [])
            text = "".join([p.get("text", "") for p in resp_parts]).strip()
            
            # --- EXTRACT SEARCH TRACE TELEMETRY ---
            grounding = candidates[0].get("groundingMetadata", {})
            if grounding:
                web_retrieval = grounding.get("webSearchQueries", [])
                chunks = grounding.get("groundingChunks", [])
                urls = []
                for chunk in chunks:
                    web_info = chunk.get("web", {})
                    if "uri" in web_info:
                        urls.append(web_info["uri"])
                        
                # Only emit if actual web search was performed
                if web_retrieval or urls:
                    import itertools
                    from typing import List
                    safe_queries: List[str] = [str(q) for q in web_retrieval]
                    safe_urls: List[str] = list(str(u) for u in dict.fromkeys(urls))
                    
                    trace_payload = {
                        "queries": safe_queries,
                        "urls": list(itertools.islice(safe_urls, 10))
                    }
                    print(f"[Engine] Search Trace captured: {len(safe_queries)} queries, {len(safe_urls)} URLs")
                    if progress_callback:
                        progress_callback("search_trace", trace_payload)
            
            if not text:
                print(f"[Engine] DEBUG raw candidate payload: {json.dumps(candidates[0])}")
                raise ValueError(f"Model returned empty text (finishReason={finish_reason}, attempt {attempt})")
            
            print(f"[Engine] _call: SUCCESS in attempt {attempt}, {len(text)} chars, finishReason={finish_reason}")
            return text
        except Exception as exc:
            last_exc = exc
            print(f"[Engine] _call attempt {attempt}/{max_retries} FAILED: {type(exc).__name__}: {exc}")
            if attempt < max_retries:
                wait = retry_delay * attempt
                print(f"[Engine] Retrying in {wait:.0f}s...")
                _time.sleep(wait)

    print(f"[Engine] _call: ALL {max_retries} ATTEMPTS EXHAUSTED for model={model}")
    raise last_exc


def _run_search(query: str, client, model: str, tools=None, progress_callback=None) -> str:
    """Helper to explicitly run a search via the model."""
    prompt = f"Please search the web for the following query and provide a factual summary: {query}"
    return _call(client, model, prompt, tools=tools, progress_callback=progress_callback)


def _run_deep_research(api_key: str, topic: str, model: str, progress_callback=None, stage_name="stageX", start_prog=10, end_prog=40) -> str:
    """Helper to run the Gemini Interactions API for Deep Research."""
    if progress_callback:
        progress_callback("progress", start_prog)
        print(f"[Engine] {stage_name}: Dispatching {model}...")

    try:
        if "deep-research-pro" in model:
            # --- TRUE DEEP RESEARCH INTERACTIONS API FLOW ---
            import requests, json
            import time as _time
            
            print(f"[Engine] {stage_name}: Creating interaction via REST API...")
            headers = {"Content-Type": "application/json"}
            url = f"https://generativelanguage.googleapis.com/v1alpha/interactions?key={api_key}"
            payload = {
                "agent": model,
                "input": topic,
                "background": True
            }
            res = requests.post(url, headers=headers, json=payload, timeout=60)
            res.raise_for_status()
            
            interaction_data = res.json()
            interaction_id = interaction_data.get("id")
            if not interaction_id:
                raise ValueError("No interaction ID returned by API.")
                
            # Poll status
            poll_interval = 10
            max_polls = 180 # 30 mins
            for attempt in range(max_polls):
                poll_url = f"https://generativelanguage.googleapis.com/v1alpha/interactions/{interaction_id}?key={api_key}"
                poll_res = requests.get(poll_url, headers=headers, timeout=60)
                poll_res.raise_for_status()
                state = poll_res.json()
                
                # Report status to frontend
                if progress_callback:
                    # Fake progress bump while waiting — crawls slowly for up to 180 attempts (30 mins)
                    # Maps attempt (0->180) to progress (start_prog -> end_prog - 2)
                    max_bump = (end_prog - start_prog) - 2
                    crawl_amt = int((attempt / max_polls) * max_bump)
                    bump = start_prog + crawl_amt
                    progress_callback("progress", bump)
                    
                status = state.get("status", "unknown").lower()
                print(f"[Engine] {stage_name}: Interaction {interaction_id} status: {status}")
                
                if status == "completed":
                    print(f"[Engine] {stage_name}: Deep Research Interaction Completed.")
                    if progress_callback:
                        progress_callback("progress", end_prog)
                    
                    # Extract final response (handling potential nesting)
                    resp_obj = state.get("response", {})
                    final_text = ""
                    if hasattr(resp_obj, "get"):
                        if "text" in resp_obj:
                            final_text = resp_obj["text"]
                        elif "parts" in resp_obj and isinstance(resp_obj["parts"], list):
                            parts = resp_obj["parts"]
                            final_text = "".join([p.get("text", "") for p in parts if isinstance(p, dict)])
                    if not final_text:
                        final_text = json.dumps(resp_obj) # Fallback if structure changes

                    # Cache persistence for background runs
                    try:
                        import hashlib, os as _os, time as _ct
                        # Anchor cache to backend directory so it is CWD-independent
                        _backend_dir = _os.path.dirname(_os.path.abspath(__file__))
                        _cache_dir = _os.path.join(_backend_dir, "data", "research_cache")
                        _os.makedirs(_cache_dir, exist_ok=True)
                        # Use SHA-256 to avoid MD5 collision risk
                        h = hashlib.sha256(topic.encode()).hexdigest()
                        _cache_path = _os.path.join(_cache_dir, f"{h}.json")
                        # Check TTL: 7 days
                        _TTL_SECS = 7 * 24 * 3600
                        if _os.path.exists(_cache_path) and (_ct.time() - _os.path.getmtime(_cache_path)) > _TTL_SECS:
                            _os.remove(_cache_path)  # Expire stale entry
                        with open(_cache_path, "w") as f:
                            json.dump({"topic": topic, "result": final_text, "cached_at": _ct.time()}, f)
                    except Exception as ce:
                        print(f"[Engine] Cache write failed: {ce}")

                    return final_text
                    
                elif status == "failed":
                    raise ValueError(f"Interaction failed. Error: {state.get('error', 'Unknown')}")
                    
                _time.sleep(poll_interval)
                
            raise TimeoutError(f"Interaction timed out after {max_polls * poll_interval} seconds.")

        else:
            raise ValueError(f"Model {model} is not a valid deep research agent.")

    except Exception as e:
        print(f"[Engine] {stage_name}: Deep Research dispatch threw exception: {e}")
        return f"(Deep Research encountered an error: {e})"


import typing

def evaluate_idea(
    idea: str,
    model_name: str = None,
    mandate_docs: typing.Optional[list] = None,
    overrides: typing.Optional[dict] = None,
    progress_callback: typing.Optional[typing.Callable[[str, typing.Any], None]] = None,
    check_cancelled: typing.Optional[typing.Callable[[], bool]] = None,
    deep_research_enabled: bool = False,
    deep_research_model: str = None,
    # ── Stage retry: supply pre-computed outputs to skip already-done stages ──
    resume_from_stage: int = 1,          # 1=run all, 2=skip stage1, 3=skip 1+2, 4=skip 1+2+3
    precomputed_stage1: str = "",        # stage1_brief text
    precomputed_stage2: str = "",        # stage2_report text
    precomputed_stage3: str = "",        # stage3_report text
) -> dict:
    if model_name is None:
        model_name = os.environ.get("DEFAULT_MODEL", "gemini-2.5-flash-lite")
    if deep_research_model is None:
        deep_research_model = os.environ.get("DEFAULT_DEEP_RESEARCH_MODEL", "deep-research-pro-preview-12-2025")
        
    api_key = os.environ.get("GEMINI_API_KEY", "")
    mandate_docs = mandate_docs or []
    overrides = overrides or {}

    # Resolve Optional callbacks to no-op defaults so callers never need None checks
    def _noop_pcb(_stage: str, _data: typing.Any) -> None:
        pass

    def _noop_chk() -> bool:
        return False

    _pcb = progress_callback if progress_callback is not None else _noop_pcb
    _chk = check_cancelled if check_cancelled is not None else _noop_chk
    progress_callback = _pcb
    check_cancelled = _chk

    PRO   = model_name
    FLASH = model_name

    uploaded_files = []
    temp_files = []
    logic_trace = []

    try:
        # NOTE: We do NOT import google.genai or create genai.Client globally here.
        # The Python SDK uses httpx which DEADLOCKS in uvicorn's background threads for standard generation.
        # Stages 1, 2, 4 use _call() (raw HTTP requests) for generation synthesis.
        # We selectively use the SDK for Interactions (Deep Research) and Stage 3 Monte Carlo function calling.

        # ─────────────────────────────────────────────────────────────────────
        # STAGE 1 — STRATEGIST  (AI Engine: {PRO})
        # ─────────────────────────────────────────────────────────────────────
        mandate_contents = []
        if mandate_docs:
            import tempfile
            import time
            doc_block_parts = []
            for d in mandate_docs:
                # For PDFs in _call() mode: extract text instead of using File API
                if getattr(d, "mime_type", "text/plain") == "application/pdf":
                    try:
                        text_content = d.file_data.decode("utf-8", errors="replace")[:8000]
                    except Exception:
                        text_content = "(PDF binary — could not extract text)"
                    doc_block_parts.append(f"[Document: {d.filename}]\n{text_content}")
                else:
                    text_content = d.file_data.decode("utf-8", errors="replace")[:8000]
                    doc_block_parts.append(f"[Document: {d.filename}]\n{text_content}")
            
            if doc_block_parts:
                doc_block = "\n\n".join(doc_block_parts)
                mandate_section = f"=== STRATEGIC MANDATE DOCUMENTS ===\n{doc_block}\n=== END OF MANDATE DOCUMENTS ===\n\nYou MUST base your entire analysis exclusively on the mandate documents above."
            else:
                mandate_section = "You MUST base your entire analysis exclusively on the attached mandate documents."
        else:
            mandate_section = """
The organisation's standing mandate prioritises: technology leadership & IP ownership,
sustainability and ESG compliance, scalable B2B market expansion, and capital efficiency.
"""

        if progress_callback:
            progress_callback("status", "stage1")
            progress_callback("progress", 0)

        # Google Search grounding — always enabled for all stages that support it.
        search_tool = ["google_search"]  # truthy non-None flag for _call()

        stage1_prompt = f"""You are a senior Corporate Strategist conducting a rigorous strategic triage.
You have access to Google Search. Use it actively to look up the most current information relevant to this idea.
However, do NOT simply relay search results. You must synthesize search findings with your own deep strategic reasoning.

{mandate_section}

IDEA TO EVALUATE:
"{idea}"

Your task: Produce a comprehensive Strategic Brief covering ALL of the following.
Be specific, analytical, and evidence-based. A comprehensive report that is as long as necessary to be bulletproof, prioritizing density over length.

SYNTHESIS REQUIREMENT: Do not simply summarize search results. You must actively synthesize the facts you find with your own deep strategic reasoning, drawing logical conclusions, identifying hidden risks, and extrapolating market trajectories. Add your own expert "AI perspective" linking the raw data to the objective.

DATA INTEGRITY DIRECTIVE — MANDATORY:
You have access to Google Search. You MUST use it aggressively for this analysis.
- For EVERY factual claim (market data, trends, regulations, company moves, technology status),
  you MUST search the web and cite the ORIGINAL external source: [Source: URL or Report Name — Date]
- VALID sources: News articles, industry reports, government publications, company press releases,
  academic papers, financial databases. Always include the URL or exact report name + date.
- INVALID: Do NOT cite your own training data, general knowledge, or "widely known" as a source.
  If you know a fact from training, VERIFY it via search and cite the external source you found.
- If you cannot find a verifiable external source after searching, write [Unverified — not found via search]
  and flag the claim as needing confirmation. Do NOT present unverifiable claims as fact.
- RECENCY: Prioritize data from 2024-2026. If the most recent data you find is older, note the date
  and flag it as potentially outdated.
- ANTI-FABRICATION: It is better to have 3 well-sourced data points than 10 unsourced ones.
  Never invent statistics, market sizes, or company names to fill gaps.

1. KEY MANDATE EXTRACTS & INSIGHTS
   - If mandate documents are provided, explicitly extract and summarize 3-5 key points or insights from these documents that are highly relevant to evaluating this specific idea.
   - For each extracted point, cite the exact document name, provide a short direct quote, and explain its relevance.
   - These extracted insights MUST serve as direct references to support the final recommendation.
   - If no documents are provided, state "No explicit mandate documents provided."

2. MANDATE ALIGNMENT ANALYSIS
   - Explicitly map the idea to each strategic priority in the mandate.
   - For each priority: does the idea align, partially align, or conflict? Explain in 2-3 sentences.
   - Search for any recent news or announcements from the organisation that confirms or contradicts alignment.

3. KILL SWITCH ASSESSMENT (BE RUTHLESS)
   - State clearly: PASS or VETO.
   - You are a STRICT gatekeeper. Your default stance is VETO. You must ONLY output PASS if the idea unequivocally and strongly aligns with the explicit strategic priorities. Do not be optimistic or lenient. If there is any significant distraction, weak business case, or mandate conflict, you MUST output VETO.
   - If VETO: identify the exact mandate clause or principle that is violated and why this is disqualifying.
   - If PASS: identify the 2-3 strongest alignment points with specific evidence.

4. STRATEGIC SWOT
   - Strengths: 3 specific strategic advantages relative to the mandate (cite recent evidence)
   - Weaknesses: 3 specific strategic gaps or misalignments
   - Opportunities: 3 specific macro trends that amplify strategic fit (cite sources)
   - Threats: 3 specific strategic risks that could undermine mandate alignment

5. STRATEGIC ALIGNMENT SCORE (out of 10)
   - Provide a numeric score and a 2-sentence justification referencing your analysis above.

REPORT FORMAT REQUIREMENT:
You must strictly organize your report into the following exact sections:
### 1. Inputs: (what data you looked at)
### 2. Assumptions: (what strategic assumptions you are making)
### 3. Methodologies: (how you approached the alignment analysis)
### 4. Limitations: (what data is missing or what you cannot know)
### 5. Outputs & Recommendations: (your final strategic verdict)

Output your full Strategic Brief as plain text (no JSON, no markdown headers).
"""
        if overrides.get("stage1"):
            stage1_prompt += f"\n\n=== USER OVERRIDE DIRECTIVE ===\nThe user has provided the following explicit instructions for your analysis. You MUST prioritize this directive over standard rules if they conflict:\n{overrides['stage1']}\n===============================\n"

        if resume_from_stage > 1 and precomputed_stage1:
            print("[Engine] Stage 1: SKIPPED (using precomputed output)")
            stage1_brief = precomputed_stage1
            progress_callback("progress", 100)
            progress_callback("stage1", {"brief": stage1_brief, "model": PRO, "skipped": True})
        else:
            print("[Engine] Stage 1: Strategist running (Synthesis)...")
            progress_callback("progress", 50)
            full_prompt = stage1_prompt
            try:
                import requests
                stage1_brief = _call(None, PRO, full_prompt, temperature=0.2, tools=search_tool, progress_callback=progress_callback)
            except (requests.exceptions.RequestException, ValueError, TimeoutError) as api_err:
                print(f"[Engine] Stage 1 AI Engine failure: {api_err}")
                raise ConnectionError("AI Engine cannot be accessed. There is a connection issue.") from api_err
            except Exception as e:
                print(f"[Engine] Stage 1 general failure: {e}")
                raise ConnectionError(f"AI Engine failed to respond in Stage 1: {e}") from e

            progress_callback("progress", 100)
            progress_callback("stage1", {"brief": stage1_brief, "model": PRO})
            
            decision = "PASS" if "PASS" in stage1_brief else ("VETO" if "VETO" in stage1_brief else "Evaluated")
            logic_trace.append(f"Strategist issued a {decision} verdict based on mandate alignment.")
            progress_callback("logic_trace", logic_trace)

        if check_cancelled():
            raise InterruptedError("Evaluation cancelled by user after Stage 1")

        # ─────────────────────────────────────────────────────────────────────
        # STAGE 1.75 — THE SIGNAL SCRAPER  (AI Engine: {FLASH})
        # ─────────────────────────────────────────────────────────────────────
        stage1_75_prompt = f"""You are a specialized Financial Signal Scraper.
Your ONLY job is to search the live web for specific, real-world events that validate or threaten the following idea.
IDEA: "{idea}"
MANDATE BRIEF:
{str(stage1_brief)[:2000]}

CRITICAL RULES:
1. Every single signal MUST be a real, verifiable event from the last 6 months.
2. Every item MUST include an exact date (Month Year) and a specific URL source.
3. DO NOT output generic trends or theoretical possibilities. We need actual occurrences (e.g., funding rounds, bankruptcies, regulatory passes).
4. If you cannot find a real event via search for a category, state "[No recent signal found via web search]". Do NOT hallucinate.
5. SOURCE VARIETY: Pull from at least 3 distinct domains across your findings (e.g., 1 News publication, 1 Government/Regulatory site, 1 Community/Industry forum).

Search the web NOW and output the following sections in plain text:

A. BULLISH SIGNALS (3-5 items): Real, observable events happening NOW that support this idea.
   Format: "[Signal description — exact date] [Source: URL]"

B. BEARISH SIGNALS (3-5 items): Real, observable events happening NOW that threaten this idea.
   Format: "[Signal description — exact date] [Source: URL]"

C. STRATEGIC SIGNPOSTS (3-5 items): Future milestones that would confirm or kill the commercial thesis.
   Format:
   - Milestone: The specific triggering event to watch
   - Bull_Case: What it means if it happens (1 sentence)
   - Bear_Case: What it means if it does NOT happen by deadline (1 sentence)
   - Watch_By: Timeframe (e.g. Q3 2026)
   - Tracking_Source: Where to monitor this (specific regulator, publication, index) [Source: URL]
"""
        try:
            print("[Engine] Stage 1.75: Signal Scraper running...")
            progress_callback("status", "stage1_75")
            progress_callback("progress", 0)
            stage1_75_signals = _call(None, FLASH, stage1_75_prompt, temperature=0.2, tools=search_tool)
        except Exception as e:
            print(f"[Engine] Stage 1.75 Scraper failed: {e}")
            stage1_75_signals = "[Scraper failed to run]"
        
        progress_callback("stage1_75", {"signals": stage1_75_signals, "model": FLASH})
        progress_callback("progress", 25)

        if check_cancelled():
            raise InterruptedError("Evaluation cancelled by user after Stage 1.75")

        # ─────────────────────────────────────────────────────────────────────
        # STAGE 2 — MARKET SCANNER + IP SPECIALIST (AI Engine: {PRO} - SEGMENTED LOOPS)
        # ─────────────────────────────────────────────────────────────────────
        if progress_callback:
            progress_callback("status", "stage2")
            progress_callback("progress", 25)

        if resume_from_stage > 2 and precomputed_stage2:
            print("[Engine] Stage 2: SKIPPED (using precomputed output)")
            stage2_report = precomputed_stage2
            progress_callback("progress", 100)
            progress_callback("stage2", {"report": stage2_report, "model": PRO, "skipped": True})
        else:
            # ── Stage 1.5: The Ruthless Interrogator (Orchestration Pre-Pass) ──
            progress_callback("progress", 30)
            print("[Engine] Stage 1.5: The Ruthless Interrogator generating Research Directives...")
            scout_directive = "Find real-time financial friction (e.g., insurance rates, labor costs, recent bankruptcies in the sector)."
            researcher_directive = "Find structural barriers (e.g., specific patent numbers, regulatory temp deltas, or LCOE floor prices)."
            
            interrogator_prompt = f"""You are the Lead Market Intelligence Manager. For every business idea, you must NOT use generic questions. Instead, follow this protocol:
1. Identify Vulnerabilities: Find the 3 most dangerous assumptions in the user's idea.
2. Task the Scout (Google Search): Draft a directive that explicitly searches for NEGATIVE signals and real-time financial friction (e.g., insurance rates, labor costs, recent bankruptcies).
3. Task the Researcher (Deep Research / Fallback Web Search): Draft a directive to find structural barriers (e.g., specific patent numbers, regulatory temp deltas, or LCOE floor prices).
4. Verification Rule: Every agent task must ask for at least one specific number or date.
5. Search for the Opposite (Disconfirming Evidence): The `scout_directive` MUST explicitly instruct the scout to find evidence that contradicts or threatens the idea's core assumptions, avoiding confirmation bias.

IDEA: "{idea}"
MANDATE BRIEF:
{stage1_brief[:2000]}

You MUST output ONLY a valid JSON object matching this exact schema:
{{
  "top_vulnerabilities": ["Vulnerability 1", "Vulnerability 2", "Vulnerability 3"],
  "scout_directive": "Specific instructions for the live web scout to find disconfirming evidence...",
  "researcher_directive": "Specific instructions for the structural researcher..."
}}
DO NOT include markdown formatting like ```json. Output raw JSON ONLY.
"""
            try:
                interrogator_raw = _call(None, FLASH, interrogator_prompt, temperature=0.2)
                
                # Clean up markdown fences if present
                clean_json = interrogator_raw.strip()
                if clean_json.startswith("```json"):
                    clean_json = clean_json[7:]
                if clean_json.startswith("```"):
                    clean_json = clean_json[3:]
                if clean_json.endswith("```"):
                    clean_json = clean_json[:-3]
                    
                import json
                directives = json.loads(clean_json.strip())
                scout_directive = directives.get("scout_directive", scout_directive)
                researcher_directive = directives.get("researcher_directive", researcher_directive)
                vulnerabilities_list = directives.get("top_vulnerabilities", ["No specific vulnerabilities identified."])
                
                if isinstance(vulnerabilities_list, list):
                    formatted_vulnerabilities = "\n".join([f"- {v}" for v in vulnerabilities_list])
                else:
                    formatted_vulnerabilities = str(vulnerabilities_list)
                    
                print(f"[Engine] Stage 1.5 Interrogator Success. Scout: {len(scout_directive)} chars | Researcher: {len(researcher_directive)} chars")
                
                logic_trace.append(f"Interrogator identified {len(vulnerabilities_list)} critical vulnerabilities to stress-test.")
                progress_callback("logic_trace", logic_trace)
                
                if progress_callback:
                    progress_callback("stage1_5", {
                        "top_vulnerabilities": vulnerabilities_list,
                        "scout_directive": scout_directive,
                        "researcher_directive": researcher_directive
                    })
                    
            except Exception as e:
                print(f"[Engine] Stage 1.5 Interrogator failed ({e}). Falling back to default directives.")
                formatted_vulnerabilities = "- No specific vulnerabilities identified (Fallback)"
            
            progress_callback("progress", 50)

            # ── Stage 2 Pre-Pass: Deep Research ──
            dr2_topic = f"Perform a ruthless technical IP and market audit for: '{idea}'. Extract exact TAM/SAM sizes, fundings for top 5 competitors. For the IP landscape, you MUST explicitly search patents.google.com and worldwide.espacenet.com to extract 3-5 specific patent family numbers related to this technology. INTERROGATOR DIRECTIVE: {researcher_directive}"
            if deep_research_enabled:
                stage2_dr_data = _run_deep_research(api_key, dr2_topic, deep_research_model, progress_callback, "Stage 2", 50, 70)
            else:
                progress_callback("progress", 70)
                print("[Engine] Stage 2: Deep Research disabled by user.")
                stage2_dr_data = f"(Deep Research explicitly disabled by user. Proceeding with standard web search capability during synthesis phase. YOU MUST EXECUTE THIS RESEARCHER DIRECTIVE VIA GOOGLE SEARCH INSTEAD: {researcher_directive})"

            # ── Base Loop Context ──
            # Issue #12: escape curly braces in DR data and Stage 1 brief so they don't
            # trip up the f-string interpolation in the loop prompts below.
            _s1_safe = stage1_brief.replace("{", "{{").replace("}", "}}")
            _dr_safe = stage2_dr_data.replace("{", "{{").replace("}", "}}")

            base_s2_context = f"""You are the Lead Market Intelligence Manager. You are executing a segmented intelligence sweep for the following idea:
IDEA: \"{idea}\"

=== STRATEGIC BRIEF ===
{_s1_safe}

=== THE 3 MOST DANGEROUS ASSUMPTIONS (VULNERABILITIES) ===
The Interrogator has identified the following top vulnerabilities in this idea:
{formatted_vulnerabilities}
You MUST actively address and scrutinize these assumptions in your report.

=== GROUND TRUTH DEEP RESEARCH (The Structural Researcher) ===
Treat this data as verified ground truth unless your live Scout search directly contradicts it:
{_dr_safe}
"""
            if overrides.get("stage2"):
                base_s2_context += f"\n\n=== USER OVERRIDE DIRECTIVE ===\n{overrides['stage2']}\n===============================\n"

            print("[Engine] Stage 2 Loop 1: Competitive Landscape & Funding Audit running...")
            progress_callback("progress", 75)
            loop1_prompt = f"""{base_s2_context}

*** TASK: LOOP 1 - COMPETITIVE LANDSCAPE & MARKET SIZING ***
Write Chapters 1 & 2 of the final report. Use Google Search to verify recent funding rounds and market sizing against the deep research context.

MANAGER CONSTRAINTS (MANDATORY):
1. Quantitative Proof Requirement: Every claim in the Economic Logic / Market Sizing section must include at least one specific dollar value or percentage found in the source data.
2. The "Anti-Hallucination" Check: If you fail to find data on a specific entity's revenue or key metric, the report must state [Data Gap Identified] and MUST output a specific "Search Strategy" instruction explaining exactly how a human analyst should query databases to find this missing data. Do not let the gap be a dead end.

1. MARKET SIZING (Market Intelligence Analyst)
   - Total Addressable Market (TAM): Specific dollar figure with methodology (top-down or bottom-up). Cite the report name and year. [Source: required]
   - Serviceable Addressable Market (SAM): Specific dollar figure for years 1-5. [Source: required]
   - Serviceable Obtainable Market (SOM): Realistic market share target in year 3.
   - INVESTIGATE THIS SPECIFIC STRUCTURAL BARRIER (RESEARCHER DIRECTIVE): {researcher_directive}

2. COMPETITIVE LANDSCAPE (Market Intelligence Analyst)
   - List AT LEAST 5 named competitors. For each provide: Company name, their current solution, most recent funding round or revenue figure [Source: required], and Key differentiator.
   - Identify the 2 most dangerous competitive threats and why.

Output the two chapters in markdown formatting.
"""
            loop1_res = _call(None, PRO, loop1_prompt, temperature=0.2, tools=search_tool)

            print("[Engine] Stage 2 Loop 2: Regulatory Walls & Tech Feasibility running...")
            progress_callback("progress", 85)
            loop2_prompt = f"""{base_s2_context}

*** TASK: LOOP 2 - REGULATORY WALLS & TECH FEASIBILITY ***
Write Chapters 3 & 4 of the final report. Use Google Search to verify specific regulatory frameworks and technology timelines.

3. ECOSYSTEM & SUPPLY CHAIN (Market Intelligence Analyst)
   - Key technology dependencies: platforms, APIs, or infrastructure this idea relies on.
   - Tier-1 supply chain or partnership requirements.
   - Regulatory environment: which jurisdictions, agencies, or frameworks apply?
   - Search for any recent regulatory changes in this domain. [Source: required]

4. TECHNICAL FEASIBILITY (Market Intelligence Analyst)
   - Current Technology Readiness Level (TRL 1-9): Justify your rating.
   - Key technical risks and unsolved engineering challenges. [Source: required]
   - Estimated timeline to MVP and to commercial scale.

Output the two chapters in markdown formatting.
"""
            loop2_res = _call(None, PRO, loop2_prompt, temperature=0.2, tools=search_tool)

            print("[Engine] Stage 2 Loop 3: IP Landscape & Live Signals running...")
            progress_callback("progress", 95)
            stage1_75_signals_safe = stage1_75_signals.replace("{", "{{").replace("}", "}}")
            loop3_prompt = f"""{base_s2_context}

*** THE SIGNAL SCRAPER (PRE-CACHED SIGNALS) ***
{stage1_75_signals_safe}

*** TASK: LOOP 3 - IP LANDSCAPE & LIVE SIGNALS ***
Write Chapters 5 & 6 of the final report. You MUST search patents explicitly if not provided.

5. IP LANDSCAPE (IP Specialist)
   - List 3-5 specific patent families or patent numbers. [Source: required]
   - "White Space" Mandate: Explicitly identify domains where your active search yielded no direct patent coverage.
   - At the VERY END of this IP section, you MUST output a raw JSON block containing exactly this schema (NO markdown fences):
{{
  "white_space_coordinates": [
    {{ "label": "Specific Unpatented Application", "x_axis_tech_complexity": 75, "y_axis_market_saturation": 20 }}
  ]
}}
   - Freedom-to-operate assessment: low/medium/high risk.

6. LIVE SIGNALS & SIGNPOSTS
   Use Google Search RIGHT NOW. Every item MUST come from a live web search (2024-2026).
   INVESTIGATE THIS SPECIFIC FRICTION POINT (SCOUT DIRECTIVE): {scout_directive}
   A. BULLISH SIGNALS (3-5 items): Real events happening NOW. Format: "[Signal description — date] [Source: URL]"
   B. BEARISH SIGNALS (3-5 items): Real events happening NOW. Format: "[Signal description — date] [Source: URL]"
   C. MARKET SIGNPOSTS (3-5 items): Future milestones (Bull_Case, Bear_Case, Watch_By, Source_To_Monitor).

Output the final two chapters in markdown formatting.
"""
            loop3_res = _call(None, PRO, loop3_prompt, temperature=0.2, tools=search_tool)

            # ── Extract IP White Space coordinates from Loop 3 output ──
            import re as _re
            ip_white_space_data = None
            try:
                ws_match = _re.search(
                    r'"white_space_coordinates"\s*:\s*(\[.*?\])',
                    loop3_res, _re.DOTALL
                )
                if ws_match:
                    ip_white_space_data = json.loads(ws_match.group(1))
                    print(f"[Engine] IP White Space Map extracted: {len(ip_white_space_data)} coordinates")
            except Exception as _wse:
                print(f"[Engine] IP White Space extraction failed (non-fatal): {_wse}")
                ip_white_space_data = None

            # Assemble Unified Report
            stage2_report = f"{loop1_res}\n\n{loop2_res}\n\n{loop3_res}"
            progress_callback("progress", 100)
            progress_callback("stage2", {"report": stage2_report, "model": PRO})
            
            if "[Live Conflict Detected]" in stage2_report:
                logic_trace.append("Analyst identified a [Live Conflict Detected] regarding competitor viability.")
                progress_callback("logic_trace", logic_trace)
                
                # --- PROACTIVE UPGRADE: THE ADVERSARIAL DUEL ---
                duel_str = "\n⚖️ **THE ADVERSARIAL DUEL: SCOUT vs. RESEARCHER** ⚖️\n"
                logic_trace.append(duel_str.strip())
                if progress_callback: progress_callback("logic_trace", logic_trace)
                
                # Turn 1: Scout challenges the Structural Researcher
                t1_prompt = f"You are the SCOUT. Based on the conflict in the report below, attack the Deep Research structural assumption in 2 punchy sentences. REPORT: {stage2_report[-2500:]}"
                scout_attack = _call(None, FLASH, t1_prompt, temperature=0.6)
                duel_str += f"\n**Scout:** {scout_attack}\n"
                logic_trace.append(f"Scout: {scout_attack}")
                if progress_callback: progress_callback("logic_trace", logic_trace)
                
                # Turn 2: Researcher defends
                t2_prompt = f"You are the RESEARCHER. Defend your structural data against the Scout's attack in 2 punchy sentences. SCOUT ATTACK: {scout_attack}. REPORT: {stage2_report[-2500:]}"
                researcher_defense = _call(None, FLASH, t2_prompt, temperature=0.5)
                duel_str += f"\n**Researcher:** {researcher_defense}\n"
                logic_trace.append(f"Researcher: {researcher_defense}")
                if progress_callback: progress_callback("logic_trace", logic_trace)
                
                # Turn 3: Manager synthesizes consensus
                t3_prompt = f"You are the MANAGER. Resolve this dispute and establish a hard consensus on the core truth in 2 punchy sentences. SCOUT: {scout_attack}. RESEARCHER: {researcher_defense}."
                consensus_resolution = _call(None, FLASH, t3_prompt, temperature=0.2)
                duel_str += f"\n**Consensus:** {consensus_resolution}\n\n"
                logic_trace.append(f"Consensus: {consensus_resolution}")
                if progress_callback: progress_callback("logic_trace", logic_trace)
                
                # Inject the duel back into the final report so the UI tabs catch it
                stage2_report += duel_str
                
            elif "[Data Gap Identified]" in stage2_report:
                logic_trace.append("Analyst flagged a [Data Gap Identified]; generating human search strategy.")
            else:
                logic_trace.append("Analyst successfully cross-referenced structural data with live scout signals.")
            progress_callback("logic_trace", logic_trace)
            
            # Extract White Space Map Coordinates
            ip_white_space_data = None
            try:
                import re
                match = re.search(r'```json\s*({.*?"white_space_coordinates".*?})\s*```', stage2_report, re.DOTALL)
                if match:
                    white_space_json = json.loads(match.group(1))
                    ip_white_space_data = white_space_json.get("white_space_coordinates")
                    logic_trace.append(f"IP Specialist identified {len(ip_white_space_data)} generative white space domains.")
                    # Strip the JSON from the markdown report so it doesn't render ugly in the UI tab
                    stage2_report = stage2_report.replace(match.group(0), "")
                else: logic_trace.append("IP Specialist did not return strict JSON white space map.")
            except Exception as e:
                logic_trace.append(f"Failed to parse White Space mapping: {e}")
            if progress_callback: progress_callback("logic_trace", logic_trace)
            
        # --- PROACTIVE UPGRADE: STAGE 2.5 RE-INTERROGATION ---
        # Detect "Black Swan" events via severity tags or conflict blocks
        is_crisis = "[Live Conflict Detected]" in stage2_report and "CRITICAL" in stage2_report.upper()

        if is_crisis:
            logic_trace.append("🚨 CRITICAL CONFLICT: Black Swan event detected. Re-tasking Interrogator...")
            if progress_callback:
                progress_callback("logic_trace", logic_trace)
            
            # Generate a Pivot Directive based on the failure data
            pivot_prompt = f"""You are the Lead Market Intelligence Manager.
Stage 2 discovered a CRITICAL conflict that invalidates our initial assumptions.
CONFLICT DATA: {stage2_report[:2000]}

TASK: Generate a 'Pivot Directive' for the final synthesis. 
What specific new question must the Synthesizer answer to see if the idea can be salvaged?
"""
            pivot_directive = _call(None, FLASH, pivot_prompt, temperature=0.1)
            
            # Inject this into the context for Stage 4
            stage2_report += f"\n\n=== RECURSIVE PIVOT DIRECTIVE ===\n{pivot_directive}"
            logic_trace.append("Pivot Directive issued. Final Synthesis will now focus on salvageability.")
            if progress_callback:
                progress_callback("logic_trace", logic_trace)
            
        if check_cancelled and check_cancelled():
            raise InterruptedError("Evaluation cancelled by user after Stage 2")

        # ─────────────────────────────────────────────────────────────────────
        # STAGE 3 — STATISTICAL QUANT + RISK SPECIALIST  (AI Engine: {PRO} + tool)
        # ─────────────────────────────────────────────────────────────────────
        progress_callback("status", "stage3")
        progress_callback("progress", 0)

        _skip_stage3 = resume_from_stage > 3 and bool(precomputed_stage3)
        stage3_report = ""
        monte_carlo_result = "{}"
        
        tool_schema = {
            "functionDeclarations": [
                {
                    "name": "monte_carlo_simulation_tool",
                    "description": (
                        "Runs a Monte Carlo simulation for financial risk analysis. "
                        "Returns 5th percentile value, median return, and risk assessment."
                    ),
                    "parameters": {
                        "type": "OBJECT",
                        "properties": {
                            "base_value": {"type": "NUMBER", "description": "Base investment in USD"},
                            "volatility_scale": {"type": "NUMBER", "description": "Standard deviation for returns (0.15 for SaaS, 0.40+ for Hardware)"},
                            "iterations": {"type": "INTEGER", "description": "Number of iterations (use 10000)"},
                            "risk_threshold": {"type": "NUMBER", "description": "Threshold multiplier for risk assessment (e.g., 0.95 for low risk appetite mandate, 0.80 for standard)"}
                        },
                        "required": ["base_value", "volatility_scale", "iterations", "risk_threshold"]
                    }
                }
            ]
        }

        # ── Stage 3 pre-pass: Google Search for live cost/benchmark data ─────
        if progress_callback:
            progress_callback("progress", 20)
            
        print("[Engine] Stage 3 pre-pass: Searching for financial benchmarks (Deep Research)...")
        dr3_topic = (
            f"Find specific, numerical financial benchmarks for: '{idea}'. "
            f"Provide exact CAPEX costs, average OPEX salaries, current unit/commodity prices, "
            f"and recent funding valuations in this sector. Cite sources."
        )
        if deep_research_enabled:
            try:
                benchmark_data = _run_deep_research(api_key, dr3_topic, deep_research_model, progress_callback, "Stage 3", 20, 40)
                print(f"[Engine] Stage 3 benchmarks retrieved by Deep Research.")
            except Exception as _be:
                print(f"[Engine] Stage 3 benchmark search failed: {_be} — using Stage 2 data")
                benchmark_data = "(Web search unavailable — use best-estimate figures from Stage 2 report)"
        else:
            if progress_callback:
                progress_callback("progress", 40)
            print("[Engine] Stage 3: Deep Research disabled by user.")
            benchmark_data = "(Deep Research explicitly disabled by user. Please provide best estimates based on Stage 2 data or standard search.)"

        stage3_prompt_text = f"""You are a Chief Financial Analyst, Statistical Quant, and Risk Specialist.
You have received the following context:

=== STRATEGIC BRIEF (Stage 1) ===
{stage1_brief[:8000]}
=== END ===

=== MARKET & IP REPORT (Stage 2) ===
{stage2_report[:20000]}
=== END ===

=== LIVE FINANCIAL SIGNALS (Stage 1.75) ===
{stage1_75_signals}
=== END SIGNALS ===

IDEA: \"{idea}\"

=== REAL-WORLD FINANCIAL BENCHMARKS (live web search — {len(benchmark_data)} chars) ===
{benchmark_data[:12000]}

=== END BENCHMARKS ===

YOUR TASKS:

CRITICAL GROUNDING RULE: The financial benchmarks above contain REAL data from live web searches.
Every CAPEX line item, OPEX estimate, and revenue projection MUST be grounded in external data.
If the benchmarks contain a relevant figure with a URL, USE IT and cite the original external source.
If no benchmark exists for a line item, you MUST state [Source: Estimated — no external benchmark found]
and explain your estimation methodology step-by-step.

CITATION RULES — READ CAREFULLY:
- Every dollar figure MUST have a citation in brackets: [Source: ...]
- VALID sources: External URLs, named reports (e.g. "McKinsey 2025 Energy Report"), industry databases
  (e.g. "IEA World Energy Outlook 2025"), company filings, government publications, academic papers.
- INVALID sources: Do NOT cite "Stage 1", "Stage 2", "Stage 3", "Live Benchmark Data",
  "Strategic Brief", "Market Report", or any internal section name as a source. These are YOUR inputs,
  not external evidence. Trace back to the ORIGINAL external URL or report name.
- If a benchmark bullet above already includes a [Source: URL], propagate THAT exact URL into your model.
- If you cannot find any external source, write [Source: AI Estimate — methodology: ...]

COST MODELLING APPROACH — TWO-PHASE ANALYSIS:
You must build TWO separate financial models for comparison:
  MODEL A — PILOT / INNOVATION PHASE (Year 1-2): The cost to develop, test, and prove the concept.
  MODEL B — FULL-SCALE COMMERCIAL OPERATION (Year 3-5+): The cost to deploy and operate at scale.
Both models must have equally rigorous external data sourcing and benchmarking.
Do NOT copy numbers between models — each must be independently justified with external sources.

MACRO-SIGNAL ADJUSTMENT RULE:
Review the LIVE FINANCIAL SIGNALS (Stage 1.75). If macro signals indicate high inflation or rising interest rates, you MUST increase your OPEX estimates by at least 10% and your NPV discount rate by at least 2% before calling the Monte Carlo tool.

SYNTHESIS REQUIREMENT: The financial benchmarks provided are raw data. It is your job as an expert
financial analyst to actively synthesize these numbers, discount them for risk, and model them into
a highly realistic projection. Do not just copy the benchmark numbers — apply your own deep
AI reasoning to justify a cohesive financial thesis.

TASK A — DUAL FINANCIAL MODEL:
For EACH line item, provide a specific dollar figure with a tangible, real-world description
detailing exactly what this money buys (e.g. "3 senior electrochemical engineers × $180K avg salary
in Houston [Source: Glassdoor 2025]"). No generic corporate speak.

═══════════════════════════════════════════════
MODEL A — PILOT / INNOVATION PHASE (Year 1-2)
═══════════════════════════════════════════════

A1. PILOT CAPEX (one-time development costs)
   - R&D / Technology Development: $___ M (team size, roles, specific deliverables) [Source: external]
   - Prototype / Hardware / Equipment: $___ M (specific components, vendors) [Source: external]
   - IP Filing & Legal: $___ M (number of patents, jurisdictions) [Source: external]
   - Integration & Testing: $___ M (test site, integration work) [Source: external]
   - TOTAL PILOT CAPEX: $___ M
   → Cite a comparable real-world pilot project at similar scale for validation [Source: external]

A2. PILOT OPEX (annual operating costs during development)
   - Core Team: $___ M/yr (headcount × avg salary by role and geography) [Source: salary database]
   - Facilities & Lab/Workshop: $___ M/yr [Source: external]
   - Compliance & Regulatory (initial permits): $___ M/yr [Source: external]
   - G&A (admin, legal, accounting): $___ M/yr [Source: external]
   - TOTAL PILOT OPEX: $___ M/yr

A3. PILOT REVENUE (realistic early-stage income)
   - Year 1: $___ M (grants, R&D contracts, pilot fees — be conservative)
   - Year 2: $___ M (early customer pilots, partnerships)
   - Revenue sources: [list specific grant programs, pilot contract types]

═══════════════════════════════════════════════════
MODEL B — FULL-SCALE COMMERCIAL OPERATION (Year 3-5+)
═══════════════════════════════════════════════════

B1. FULL-SCALE CAPEX (deployment and scaling costs)
   - Production Infrastructure: $___ M (manufacturing facility, deployment hardware) [Source: external]
   - Equipment at Scale: $___ M (production units, installation costs) [Source: external]
   - Supply Chain Setup: $___ M (supplier agreements, logistics) [Source: external]
   - Regulatory & Certification: $___ M (full compliance, environmental permits) [Source: external]
   - TOTAL FULL-SCALE CAPEX: $___ M
   → Cite a comparable real-world full-scale project for validation [Source: external]

B2. FULL-SCALE OPEX (annual operating costs at commercial scale)
   - Full Team: $___ M/yr (expanded headcount by department) [Source: salary database]
   - Operations & Maintenance: $___ M/yr [Source: industry benchmark]
   - Sales, Marketing & BD: $___ M/yr [Source: external]
   - Raw Materials & Supply Chain: $___ M/yr [Source: commodity pricing]
   - Insurance & Compliance: $___ M/yr [Source: external]
   - G&A: $___ M/yr
   - TOTAL FULL-SCALE OPEX: $___ M/yr

B3. FULL-SCALE REVENUE PROJECTIONS
   - Year 3 Revenue: $___ M (first commercial customers, unit economics) [Source: market pricing]
   - Year 4 Revenue: $___ M (scaling) [Source: external]
   - Year 5 Revenue: $___ M (mature operations) [Source: external]
   - Primary Revenue Model: (SaaS / licensing / services / hardware / hybrid)
   - Unit Economics: price per unit/customer × expected volume [Source: external market data]

═══════════════════════════════════════════════
COMBINED METRICS (across both phases)
═══════════════════════════════════════════════

4. PROFITABILITY METRICS
   - Gross Margin Target: ___% (justify with industry benchmarks) [Source: external]
   - EBITDA Break-even: Month/Year ___ (justify which phase this occurs in)
   - Estimated NPV (5-year, 10% discount rate): $___ M
   - Estimated IRR: ___% (justify)
   - Payback Period: ___ years (from initial pilot investment)
   - Total Investment Required (Pilot + Scale-up): $___ M

5. KEY FINANCIAL ASSUMPTIONS (list the 5 most critical assumptions your model depends on,
   each with an external source or explicit "AI Estimate" tag)

6. PILOT vs FULL-SCALE COMPARISON SUMMARY
   Present a clear side-by-side comparison:
   | Metric              | Pilot (Yr 1-2) | Full-Scale (Yr 3-5) |
   | Total CAPEX         | $___ M          | $___ M               |
   | Annual OPEX         | $___ M/yr       | $___ M/yr            |
   | Annual Revenue      | $___ M/yr       | $___ M/yr            |
   | Team Size           | ___ people      | ___ people           |
   | Key Risk            | [describe]      | [describe]           |

TASK B — DYNAMIC MONTE CARLO:
You must select a `volatility_scale` for the simulation based on the following risk anchors:
* **SaaS / Pure Software:** 0.15 - 0.20
* **Logistics / Physical Goods:** 0.25 - 0.35
* **Deep Tech / SDCs / Hardware:** 0.40 - 0.55+

If the **Stage 1.5 Vulnerabilities** mention 'Structural CapEx Risk' or 'Maintenance Complexity,' you **MUST** use a scale ≥ 0.40.
Call `monte_carlo_simulation_tool` with:
* `base_value`: Total Combined CAPEX
* `volatility_scale`: [Your derived scale]
* `iterations`: 10000

TASK C — RISK SPECIALIST:
After receiving Monte Carlo results, produce a Risk Intelligence Report:

1. FINANCIAL RISK SUMMARY
   - Monte Carlo results (5th percentile, median, risk assessment)
   - Practical interpretation for an investor
   - 2 key financial assumptions driving variance

2. TOP 3 DEAL-KILLING RISKS (for each provide ALL fields):
   Risk #N:
   - Title: (one evocative phrase)
   - Description: (2-3 sentences)
   - Probability: Low / Medium / High (1-sentence justification)
   - Severity: Low / Medium / High / Critical (1-sentence justification)
   - Mitigation Pathway: (2-3 specific actionable steps)

Focus risks on: supply chain, regulatory/compliance, technology obsolescence, capital efficiency, talent.

TASK D — SENSITIVITY MAPPING:
After the Monte Carlo simulation, you MUST identify the **"Golden Lever"**.
* **Analysis**: Which single input (e.g., CAPEX, Price per Unit, Maintenance Frequency) caused the most failures in the 5th percentile?
* **The Delta**: Quantify the impact (e.g., "A 10% increase in [Variable] reduces IRR by 25%").
* **Strategic Label**: Categorize the project's true nature (e.g., "This is a **High-OpEx Maintenance Play**").

Output Format:
### **The Critical Failure Lever**

* **Primary Lever**: [e.g., Vessel Charter Rates]
* **Sensitivity Delta**: [e.g., A 15% increase in this variable leads to a 40% drop in NPV]
* **Strategic Verdict**: [e.g., This is a 'Logistics play' disguised as a 'Tech play'. Focus on long-term vessel contracts.]

REPORT FORMAT REQUIREMENT:
You must strictly organize your final Risk Intelligence Report into the following exact sections:
### 1. Inputs: (what financial data and signals you used)
### 2. Assumptions: (what mathematical and risk assumptions you made for the simulation)
### 3. Methodologies: (how you modelled the two phases and the Monte Carlo)
### 4. Limitations: (what financial variables are highly uncertain)
### 5. Outputs & Recommendations: (your final quantitative verdict and Golden Lever)

Output your full Financial Model + Risk Report as plain text (no JSON).
"""
        if overrides.get("stage3"):
            stage3_prompt_text += f"\n\n=== USER OVERRIDE DIRECTIVE ===\nThe user has provided the following explicit instructions for your financial model and risk assessment. You MUST prioritize this directive over standard rules if they conflict:\n{overrides['stage3']}\n===============================\n"

        stage3_contents = [
            {"role": "user", "parts": [{"text": stage3_prompt_text}]}
        ]

        print("[Engine] Stage 3: Quant + Risk running (with Monte Carlo tool)...")
        if progress_callback:
            progress_callback("status", "stage3")
            progress_callback("progress", 45)
            
        stage3_url = f"https://generativelanguage.googleapis.com/v1beta/models/{FLASH}:generateContent?key={api_key}"
        
        resp3a_data = None
        for s3_init_attempt in range(1, 4):
            try:
                import time as _t
                payload3a = {
                    "contents": stage3_contents,
                    "tools": [tool_schema],
                    "generationConfig": {"temperature": 0.2}
                }
                r = requests.post(stage3_url, json=payload3a, timeout=120)
                if not r.ok:
                    raise ValueError(f"HTTP {r.status_code}: {r.text[:500]}")
                resp3a_data = r.json()
                if resp3a_data.get("candidates"):
                    break
                raise ValueError("Stage 3 initial call returned no candidates")
            except Exception as e3:
                print(f"[Engine] Stage 3 init attempt {s3_init_attempt}/3 failed: {e3}")
                if s3_init_attempt < 3:
                    _t.sleep(6 * s3_init_attempt)
                else:
                    raise

        # Execute Monte Carlo tool call if requested
        if progress_callback:
            progress_callback("progress", 70)
            
        ai_message = resp3a_data["candidates"][0].get("content", {})
        ai_parts = ai_message.get("parts", [])
        
        function_call = None
        for p in ai_parts:
            if "functionCall" in p:
                function_call = p["functionCall"]
                break

        monte_carlo_result = "{}"
        volatility_scale = 0.15

        if function_call:
            stage3_contents.append(ai_message)
            
            fc_name = function_call.get("name")
            args = function_call.get("args", {})
            if fc_name == "monte_carlo_simulation_tool":
                volatility_scale = float(args.get("volatility_scale"))
                risk_threshold = float(args.get("risk_threshold"))
                monte_carlo_result = monte_carlo_simulation(
                    base_value=float(args.get("base_value", 5000000)),
                    iterations=int(args.get("iterations", 10000)),
                    volatility_scale=volatility_scale,
                    risk_threshold=risk_threshold
                )
                print(f"[Engine] Monte Carlo result: {monte_carlo_result}")
                logic_trace.append(f"Quant configured Monte Carlo with {volatility_scale} volatility and {risk_threshold} risk threshold based on mandate.")
                if progress_callback:
                    progress_callback("logic_trace", logic_trace)
                
            tool_response_part = {
                "functionResponse": {
                    "name": fc_name,
                    "response": {"result": monte_carlo_result}
                }
            }
            stage3_contents.append({"role": "tool", "parts": [tool_response_part]})

            # Retry Stage 3b synthesis call
            if progress_callback:
                progress_callback("progress", 85)
                
            stage3_report = ""
            for s3_attempt in range(1, 4):
                try:
                    import time as _t
                    payload3b = {
                        "contents": stage3_contents,
                        "generationConfig": {"temperature": 0.2}
                    }
                    r2 = requests.post(stage3_url, json=payload3b, timeout=120)
                    if not r2.ok:
                        raise ValueError(f"HTTP {r2.status_code}: {r2.text[:500]}")
                    
                    data3b = r2.json()
                    resp_parts = data3b.get("candidates", [])[0].get("content", {}).get("parts", [])
                    stage3_report = "".join([p.get("text", "") for p in resp_parts]).strip()
                    
                    if stage3_report:
                        break
                    raise ValueError("Stage 3b returned empty text")
                except Exception as e3b:
                    print(f"[Engine] Stage 3b attempt {s3_attempt}/3 failed: {e3b}")
                    if s3_attempt < 3:
                        _t.sleep(6 * s3_attempt)
                    else:
                        raise
        else:
            # No tool call — use direct Stage 3a output, with empty-response check
            stage3_report = "".join([p.get("text", "") for p in ai_parts]).strip()
            if not stage3_report:
                raise ValueError("Stage 3a returned empty text and no tool call was made")

        if progress_callback:
            progress_callback("progress", 100)
            progress_callback("stage3", {"report": stage3_report, "monte_carlo": monte_carlo_result, "model": FLASH})
            
            logic_trace.append(f"Quant Specialist executed Monte Carlo with {volatility_scale} scale based on technical risk.")
            progress_callback("logic_trace", logic_trace)
            
        if check_cancelled and check_cancelled():
            raise InterruptedError("Evaluation cancelled by user after Stage 3")


        # ─────────────────────────────────────────────────────────────────────
        # STAGE 4 — SYNTHESIZER  (AI Engine: {FLASH})
        # ─────────────────────────────────────────────────────────────────────
        if progress_callback:
            progress_callback("status", "stage4")
            progress_callback("progress", 0)
            
        json_schema = """{
  "Title": "Short evocative project name (not just the idea restated)",
  "Eureka_Moment": "1 punchy sentence capturing the core breakthrough value proposition.",
  "Mandate_Insights": [
    {
       "Key_Point": "<specific insight extracted from Stage 1>",
       "Source_Document": "<exact document name or source cited in Stage 1>",
       "Relevance": "<1 sentence on how this supports the final recommendation>"
    }
  ],
  "Strategist_Verdict": {
    "Kill_Switch": "<PASS or VETO>",
    "Mandate_Clause_Cited": "<exact quote or clause from mandate documents, or 'N/A'>",
    "Reasoning": "<2-3 sentences explaining the verdict with specific evidence>"
  },
  "D0_Scorecard": {
    "Total_Score": <integer out of 50, must equal sum of 5 sub-scores>,
    "Strategic_Alignment": {"Score": <0-10>, "Rationale": "<2-3 sentences citing Stage 1 evidence>"},
    "Disruptive_Potential": {"Score": <0-10>, "Rationale": "<2-3 sentences with specific market evidence>"},
    "Technical_Feasibility": {"Score": <0-10>, "Rationale": "<2-3 sentences citing TRL and specific challenges>"},
    "Commercial_Impact": {"Score": <0-10>, "Rationale": "<2-3 sentences citing SAM/SOM figures>"},
    "Scalability": {"Score": <0-10>, "Rationale": "<2-3 sentences about scale path and ecosystem fit>"}
  },
  "Top_3_Deal_Killing_Risks": [
    {
      "Title": "<string>",
      "Description": "<2-3 sentences>",
      "Probability": "<Low|Medium|High>",
      "Severity": "<Low|Medium|High|Critical>",
      "Mitigation": "<2-3 specific actionable steps>"
    },
    {"Title": "<string>", "Description": "<string>", "Probability": "<string>", "Severity": "<string>", "Mitigation": "<string>"},
    {"Title": "<string>", "Description": "<string>", "Probability": "<string>", "Severity": "<string>", "Mitigation": "<string>"}
  ],
  "Market_Verification": {
    "TAM": "<specific dollar figure with methodology>",
    "SAM": "<specific dollar figure>",
    "SOM": "<year-3 target with justification>",
    "Key_Competitors": [
      {"Name": "<company>", "Approach": "<string>", "Differentiator": "<vs this idea>"},
      {"Name": "<company>", "Approach": "<string>", "Differentiator": "<vs this idea>"},
      {"Name": "<company>", "Approach": "<string>", "Differentiator": "<vs this idea>"}
    ],
    "Supply_Chain": "<specific tier-1 dependencies>",
    "Regulatory_Environment": "<applicable frameworks and jurisdictions>"
  },
  "IP_Scan": {
    "Key_Patent_Families": "<specific patent numbers or families identified>",
    "Freedom_To_Operate_Risk": "<Low|Medium|High>",
    "Patent_Application_Opportunity": "<specific claim area to file>"
  },
  "Financial_Simulation": {
    "Pilot_CAPEX": {
      "RD_Technology": "<$Amount — specific breakdown [Source: ...]>",
      "Prototype_Hardware": "<$Amount — specific breakdown [Source: ...]>",
      "IP_Legal": "<$Amount — specific breakdown [Source: ...]>",
      "Integration_Testing": "<$Amount — specific breakdown [Source: ...]>",
      "Total_Pilot_CAPEX_USD": <number>,
      "Comparable_Project": "<name of comparable pilot project [Source: ...]>"
    },
    "Pilot_OPEX": {
      "Core_Team": "<$Amount/yr — headcount × salary [Source: ...]>",
      "Facilities": "<$Amount/yr — [Source: ...]>",
      "Compliance_Regulatory": "<$Amount/yr — [Source: ...]>",
      "GA": "<$Amount/yr — [Source: ...]>",
      "Total_Pilot_OPEX_USD": <number>
    },
    "FullScale_CAPEX": {
      "Production_Infrastructure": "<$Amount — specific breakdown [Source: ...]>",
      "Equipment_At_Scale": "<$Amount — specific breakdown [Source: ...]>",
      "Supply_Chain_Setup": "<$Amount — specific breakdown [Source: ...]>",
      "Regulatory_Certification": "<$Amount — specific breakdown [Source: ...]>",
      "Total_FullScale_CAPEX_USD": <number>,
      "Comparable_Project": "<name of comparable full-scale project [Source: ...]>"
    },
    "FullScale_OPEX": {
      "Full_Team": "<$Amount/yr — expanded headcount [Source: ...]>",
      "Operations_Maintenance": "<$Amount/yr — [Source: ...]>",
      "Sales_Marketing": "<$Amount/yr — [Source: ...]>",
      "Raw_Materials_Supply": "<$Amount/yr — [Source: ...]>",
      "Insurance_Compliance": "<$Amount/yr — [Source: ...]>",
      "GA": "<$Amount/yr — [Source: ...]>",
      "Total_FullScale_OPEX_USD": <number>
    },
    "Revenue_Projections": {
      "Year_1_USD": <number>,
      "Year_3_USD": <number>,
      "Year_5_USD": <number>,
      "Revenue_Model": "<SaaS | licensing | services | hardware | hybrid>"
    },
    "Profitability": {
      "Gross_Margin_Pct": <number>,
      "EBITDA_Breakeven": "<Month/Year estimate>",
      "NPV_5yr_USD": <number>,
      "IRR_Pct": <number>,
      "Payback_Years": <number>,
      "Total_Investment_USD": <number>
    },
    "Key_Assumptions": [
      "<Assumption 1 [Source: ...]>",
      "<Assumption 2 [Source: ...]>",
      "<Assumption 3 [Source: ...]>",
      "<Assumption 4 [Source: ...]>",
      "<Assumption 5 [Source: ...]>"
    ],
    "Monte_Carlo": {
      "Base_Investment_USD": <number>,
      "5th_Percentile_Value": <number>,
      "Median_Value": <number>,
      "Risk_Assessment": "<string>"
    }
  },
  "Signals_And_Signposts": {
    "Bullish_Signals": [
      {"Signal": "<specific observable event with date>", "Implication": "<1 sentence why this matters for the idea>"},
      {"Signal": "<string>", "Implication": "<string>"},
      {"Signal": "<string>", "Implication": "<string>"}
    ],
    "Bearish_Signals": [
      {"Signal": "<specific observable event with date>", "Implication": "<1 sentence why this threatens the idea>"},
      {"Signal": "<string>", "Implication": "<string>"},
      {"Signal": "<string>", "Implication": "<string>"}
    ],
    "Strategic_Signposts": [
      {
        "Milestone": "<specific future event to watch>",
        "Bull_Case": "<what it means if it happens>",
        "Bear_Case": "<what it means if it does NOT happen by deadline>",
        "Watch_By": "<timeframe e.g. Q3 2026>"
      },
      {"Milestone": "<string>", "Bull_Case": "<string>", "Bear_Case": "<string>", "Watch_By": "<string>"},
      {"Milestone": "<string>", "Bull_Case": "<string>", "Bear_Case": "<string>", "Watch_By": "<string>"}
    ]
  },
  "Agent_Summaries": {
    "Strategist": {
      "Theme": "<Overall strategic theme>",
      "Detailed_Observations": [
        "<Detailed observation 1>",
        "<Detailed observation 2>"
      ]
    },
    "Market_Researcher": {
      "Theme": "<Overall market theme>",
      "Detailed_Observations": [
        "<Detailed observation 1>",
        "<Detailed observation 2>"
      ]
    },
    "Risk_Specialist": {
      "Theme": "<Overall risk theme>",
      "Detailed_Observations": [
        "<Detailed observation 1>",
        "<Detailed observation 2>"
      ]
    }
  },
  "Deep_Research_Utilized": <boolean, true if deep research data was explicitly provided in the benchmark inputs>,
  "Recommendation": "<PROCEED TO INCUBATION or REJECT>",
  "Justification": "<2-3 sentences synthesising all 4 stages into a final investment thesis or rejection rationale>"
}"""

        # --- STAGE 4: PROACTIVE SYNTHESIS ---
        print("[Engine] Stage 4: Compiling final report with Pivot Intelligence...")

        import re
        lever_match = re.search(r"\*\s*\*\*Primary Lever\*\*:?\s*(.*?)\n", stage3_report, re.IGNORECASE)
        if not lever_match:
            lever_match = re.search(r"Primary Lever[:\s]+(.*?)\n", stage3_report, re.IGNORECASE)
        golden_lever = lever_match.group(1).strip() if lever_match else "General Market Volatility"
        
        logic_trace.append(f"Golden Lever identified: {golden_lever}. Final recommendation weighted against this sensitivity.")
        if progress_callback:
            progress_callback("logic_trace", logic_trace)

        stage4_prompt = f"""You are the Chief Innovation Officer compiling a final Investment Evaluation Report.
You have received deep-dive analysis from 4 specialist teams:

=== STAGE 1: STRATEGIC BRIEF ===
{stage1_brief}
=== END ===

=== STAGE 2: MARKET & IP INTELLIGENCE REPORT ===
{stage2_report}
=== END ===

=== STAGE 3: RISK INTELLIGENCE REPORT ===
{stage3_report}
=== END ===

=== STAGE 1.75: SIGNAL SCRAPER REPORT ===
{stage1_75_signals}
=== END ===

IDEA: "{idea}"
MONTE CARLO RESULT: {monte_carlo_result}

SYNTHESIS REQUIREMENT: As the Chief Innovation Officer, you must provide the final overarching perspective. Do not just regurgitate the findings of the previous stages. You must synthesize the strategic, market, and financial data into a cohesive, definitive investment thesis. Use your deep AI reasoning capabilities to identify the crucial insights that bridge all the reports together. 
(Note: Mandate documents are attached to this prompt if applicable. You MUST read them directly to cite exact clauses for the Strategist_Verdict).

Synthesise ALL of the above into this EXACT JSON schema.
Output ONLY raw JSON — no markdown fences, no preamble, no trailing text.
CRITICAL CONCISE MAPPING: For all JSON rationale fields, you are strictly limited to maximum 2 sentences and under 250 characters. Prioritize "Hard Data" (numbers, dates, competitor names) over qualitative descriptions. The Logic_Trace is handled by the backend—DO NOT include it in your output.
Populate ALL fields. For Key_Competitors include 3-5 entries with descriptions.

CRITICAL PIVOT RECONCILIATION:
If the input contains a `RECURSIVE PIVOT DIRECTIVE`, you MUST:
1. Stop and Analyze: Evaluate if the original idea is dead or if the "Pivot" makes it a PASS.
2. The "Logic Trace" Validation: Review the Logic_Trace to see how the Interrogator's original vulnerabilities were either confirmed, debunked, or pivoted.
3. Sensitivity Alignment: Map the Critical Failure Lever ({golden_lever}) from Stage 3 back to the original idea. If the "Lever" is out of the organization's control, the verdict should be VETO.

JSON Output Rule:
* Update the `Justification` field to lead with the Pivot result: "The original thesis was invalidated by [Conflict], but the Stage 2.5 Pivot reveals a viable path via [New Strategy]."
* The `Strategic_Signposts` must now reflect the Pivot milestones, not just the original idea's goals.

DATA VERIFICATION DIRECTIVE — MANDATORY:
As the final synthesizer, you are the LAST line of defense for data quality.
- Use Google Search to VERIFY the key claims from previous stages. If a stage claims a market size,
  competitor fact, or cost figure, spot-check it with a quick search.
- For every data point you include in the JSON output, ensure it has an external source.
  If a previous stage cited [Unverified] or [AI Estimate], search for the real data now and update it.
- For Signals_And_Signposts: Every Signal and Source field MUST contain real, verifiable, recent
  (2024-2026) events with actual URLs. Search for these NOW — do not copy generic placeholders.
- For D0_Scorecard: Base every sub-score on concrete, sourced evidence, not general impressions.
  Each Rationale must reference at least one specific external data point.
- ANTI-FABRICATION: If you cannot verify a claim from a previous stage, downgrade the corresponding
  score or flag it in the Justification. Do NOT propagate unverified numbers into the final report.

{json_schema}
"""
        if overrides.get("stage4"):
            stage4_prompt += f"\n\n=== USER OVERRIDE DIRECTIVE ===\nThe user has provided the following explicit instructions for your final synthesis and formatting. You MUST prioritize this directive over standard rules if they conflict:\n{overrides['stage4']}\n===============================\n"

        print("[Engine] Stage 4: Synthesizer compiling final report (with Google Search)...")
        if progress_callback:
            progress_callback("status", "stage4")
            progress_callback("progress", 50)
            
        full_prompt4 = stage4_prompt
        # Gemini 3 models currently hang on the REST API when googleSearch is provided
        search_tool_for_s4 = search_tool if "gemini-3" not in FLASH else None
        output_str = _call(None, FLASH, full_prompt4, temperature=0.35, tools=search_tool_for_s4)

        # Strip markdown fences if present
        output_str = output_str.strip()
        if output_str.startswith("```json"):
            output_str = output_str[7:]
        if output_str.startswith("```"):
            output_str = output_str[3:]
        if output_str.endswith("```"):
            output_str = output_str[:-3]
        output_str = output_str.strip()

        import re
        
        def clean_custom_escapes(raw_json: str) -> str:
            # 1. Temporarily replace valid escaped backslashes (\\) with a placeholder
            temp_json = raw_json.replace(r'\\', '__DOUBLE_SLASH__')
            # 2. Scrub any single backslash that isn't a valid JSON escape char (", \, /, b, f, n, r, t, u)
            temp_json = re.sub(r'\\(?=[^\"\\/bfnrtu])', '', temp_json)
            # 3. Restore valid escaped backslashes
            return temp_json.replace('__DOUBLE_SLASH__', r'\\')

        # Attempt JSON parse — if it fails, ask the model to repair it
        if progress_callback:
            progress_callback("progress", 85)
            
        output_str = clean_custom_escapes(output_str)        
        try:
            parsed = json.loads(output_str)
        except json.JSONDecodeError as json_err:
            print(f"[Engine] Stage 4 JSON parse failed ({json_err}), attempting repair...")
            err_pos = getattr(json_err, "pos", 0)
            if err_pos > 0:
                print(f"[Engine] DEBUG JSON Context: {repr(output_str[max(0, err_pos-50) : min(len(output_str), err_pos+50)])}")
                
            repair_prompt = f"""You are a master JSON syntax verifier. The following JSON string is malformed. It may have been cut off mid-generation due to a token limit, or it may contain internal syntax errors such as unescaped quotes, missing commas between keys, or unbalanced brackets.
Carefully review the text, identify all structural and formatting errors, and fully reconstruct the JSON object so that it corresponds to valid JSON. 
You MUST fix any missing commas, repair unescaped quotes, and gracefully close out any truncated arrays or objects. You have full permission to alter the text formatting to ensure the final output strictly adheres to standard JSON grammar.
Return ONLY the corrected, fully complete JSON string. No markdown fences.

BROKEN STRING:
{output_str}
"""
            try:
                # Use PRO for repair as it has a larger context window and better reasoning
                output_str2 = _call(None, PRO, repair_prompt, temperature=0.0, response_mime_type="application/json").strip()
                if output_str2.startswith("```"):
                    output_str2 = output_str2.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
                
                output_str2 = clean_custom_escapes(output_str2)
                parsed = json.loads(output_str2)
                print("[Engine] Stage 4: JSON repair successful!")
                
            except Exception as repair_err:
                print(f"[Engine] JSON repair also failed: {repair_err}. Raising ValueError.")
                if os.environ.get("DEBUG_JSON_DUMP"):
                    with open("/tmp/bad_output_str1.json", "w") as f:
                        f.write(output_str)
                    with open("/tmp/bad_output_str2.json", "w") as f:
                        f.write(locals().get("output_str2", ""))
                raise ValueError(f"AI returned irrevocably malformed JSON. Initial error: {json_err}")

        if progress_callback:
            progress_callback("progress", 100)
            
        # PROACTIVE OVERRIDE: Highlight the Pivot in the UI
        has_pivot = "RECURSIVE PIVOT DIRECTIVE" in stage2_report
        parsed["Golden_Lever"] = golden_lever
        parsed["Pivot_Triggered"] = has_pivot
        
        if has_pivot:
            if parsed.get("Recommendation") == "PROCEED TO INCUBATION":
                parsed["Recommendation"] = "PIVOT"
            if "Justification" in parsed:
                parsed["Justification"] = "🔄 PIVOT TRIGGERED: " + parsed["Justification"]
            logic_trace.append("Final Synthesis prioritized the Stage 2.5 Pivot over the original thesis.")
            if progress_callback:
                progress_callback("logic_trace", logic_trace)

        # Hard-override to prevent the LLM from hallucinating the research toggle state
        parsed["Logic_Trace"] = logic_trace
        parsed["Deep_Research_Utilized"] = deep_research_enabled
        
        # --- PROACTIVE UPGRADE: STAGE 5 - THE TACTICAL ROADMAP ---
        rec = parsed.get("Recommendation", "").upper()
        if "PROCEED" in rec or "PIVOT" in rec:
            print("[Engine] Stage 5: Execution Lead generating Tactical Roadmap...")
            if progress_callback: progress_callback("status", "stage5")
            
            top_risks = "\n".join([f"- {r.get('Title', 'Unknown')}: {r.get('Description', 'N/A')}" for r in parsed.get("Top_3_Deal_Killing_Risks", [])])
            
            stage5_prompt = f"""You are the Execution Lead (Stage 5). 
The CIO has decided to advance this idea: {idea}
Recommendation: {rec}
Primary Sensitivity (Golden Lever): {golden_lever}

TOP 3 RISKS TO MITIGATE:
{top_risks}

TASK: Generate a tactical execution roadmap.
Return exactly this JSON schema. No markdown fences.
{{
  "OKRs": [
    {{"Objective": "30-Day: ...", "Key_Results": ["...", "..."]}},
    {{"Objective": "60-Day: ...", "Key_Results": ["...", "..."]}},
    {{"Objective": "90-Day: ...", "Key_Results": ["...", "..."]}}
  ],
  "Hiring_Priority": [
    {{"RoleTitle": "...", "Why": "Mitigates Risk X by..."}},
    {{"RoleTitle": "...", "Why": "Mitigates Risk Y by..."}},
    {{"RoleTitle": "...", "Why": "Mitigates Risk Z by..."}}
  ]
}}
"""
            try:
                stage5_resp = _call(None, FLASH, stage5_prompt, temperature=0.2, response_mime_type="application/json")
                stage5_resp = stage5_resp.replace("```json", "").replace("```", "").strip()
                parsed["Tactical_Roadmap"] = json.loads(stage5_resp)
                logic_trace.append("Stage 5 Execution Lead generated 90-Day Tactical Roadmap and Hiring Plan.")
                if progress_callback: progress_callback("logic_trace", logic_trace)
            except Exception as e:
                print(f"[Engine] Stage 5 Tactical Roadmap failed: {e}")
                parsed["Tactical_Roadmap"] = None
        else:
            parsed["Tactical_Roadmap"] = None

        # PROACTIVE UPGRADE: Explicitly attach all three agent reports to the final payload
        parsed["Strategist_Report"] = stage1_brief
        parsed["Deep_Research_Market_Report"] = stage2_report
        parsed["Quant_Report"] = stage3_report
        try:
            parsed["Quant_Monte_Carlo"] = json.loads(monte_carlo_result)
        except Exception:
            parsed["Quant_Monte_Carlo"] = None
            
        if "ip_white_space_data" in locals() and ip_white_space_data:
            if "IP_Scan" not in parsed: parsed["IP_Scan"] = {}
            parsed["IP_Scan"]["White_Space_Map"] = ip_white_space_data
            
        return parsed

    except InterruptedError as e:
        print(f"[Engine] Pipeline gracefully interrupted: {e}")
        raise e
    except (ConnectionError, ValueError) as ce:
        print(f"[Engine] Pipeline aborted due to AI Engine connection or validation failure: {ce}")
        raise ce
    except Exception as e:
        import traceback
        print(f"[Engine] Pipeline unexpected error: {e}")
        print(traceback.format_exc())
        # Re-raise so main.py can surface a proper 500 error.
        # We do NOT silently return fabricated data here — that would mislead users
        # into treating a failed evaluation as a real result.
        raise RuntimeError(f"Pipeline failed at an unexpected stage: {e}") from e
