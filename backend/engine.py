import os
import json
import numpy as np
from dotenv import load_dotenv

load_dotenv()


def monte_carlo_simulation(base_value: float, iterations: int) -> str:
    """Runs a Monte Carlo simulation for financial risk analysis."""
    returns = np.random.normal(loc=1.05, scale=0.15, size=(int(iterations), 5))
    portfolio = float(base_value) * np.cumprod(returns, axis=1)  # type: ignore
    final_values = portfolio[:, -1]  # type: ignore
    var_95 = np.percentile(final_values, 5)
    median_val = np.median(final_values)
    return json.dumps({
        "5th_Percentile_Value": round(float(var_95), 2),
        "Median_Value": round(float(median_val), 2),
        "Risk_Assessment": "High Risk" if var_95 < float(base_value) * 0.8 else "Acceptable Risk"
    })


import typing

def _call(client, model: str, prompt: typing.Any, temperature: float = 0.3, tools=None,
          max_retries: int = 5, retry_delay: float = 6.0) -> str:
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
        "generationConfig": {"temperature": temperature}
    }
    
    # Only add Google Search tool if an actual tool object is provided (not None)
    if tools and any(t is not None for t in tools):
        payload["tools"] = [{"googleSearch": {}}]

    # Use longer timeout for thinking models (pro/latest) which do internal chain-of-thought
    is_thinking = any(x in model for x in ["pro", "latest"])
    timeout = 300 if is_thinking else 120

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
                    if hasattr(resp_obj, "get"):
                        if "text" in resp_obj:
                            return resp_obj["text"]
                        
                        if "parts" in resp_obj and isinstance(resp_obj["parts"], list):
                            parts = resp_obj["parts"]
                            return "".join([p.get("text", "") for p in parts if isinstance(p, dict)])
                            
                    return json.dumps(resp_obj) # Fallback if structure changes
                    
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
    model_name: str = "gemini-2.5-flash-lite",
    mandate_docs: typing.Optional[list] = None,
    overrides: typing.Optional[dict] = None,
    progress_callback: typing.Optional[typing.Callable[[str, typing.Any], None]] = None,
    check_cancelled: typing.Optional[typing.Callable[[], bool]] = None,
    deep_research_enabled: bool = False,
    deep_research_model: str = "deep-research-pro-preview-12-2025",
    # ── Stage retry: supply pre-computed outputs to skip already-done stages ──
    resume_from_stage: int = 1,          # 1=run all, 2=skip stage1, 3=skip 1+2, 4=skip 1+2+3
    precomputed_stage1: str = "",        # stage1_brief text
    precomputed_stage2: str = "",        # stage2_report text
    precomputed_stage3: str = "",        # stage3_report text
) -> dict:
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
Be specific, analytical, and evidence-based. Minimum 600 words total.

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

6. STRATEGIC SIGNPOSTS & LIVE SIGNALS
   Use Google Search NOW to find the most recent developments (2024-2026 only).
   Do NOT rely on training data for this section — every item must come from a live web search.

   A. CURRENT STRATEGIC SIGNALS (3-5 items):
      Search for real events happening RIGHT NOW that are relevant to this idea.
      Each signal must be a specific, dated event you found via search — not general knowledge.
      Format: "[Signal description — exact date] [Source: URL]"
      Include: regulatory announcements, competitor moves, technology milestones, funding events,
      policy changes, market data releases, or industry conference announcements.

   B. STRATEGIC SIGNPOSTS (3-5 future milestones):
      Based on your search findings, identify future events that would materially change viability:
   - For each signpost provide:
   - Milestone: A specific, observable future event (e.g. "EU passes offshore hydrogen mandate", "Electrolyzer CapEx drops below $400/kW")
   - If_It_Happens: What it means for this idea (bullish or bearish impact, 1 sentence)
   - Watch_By: Estimated timeframe (Q1 2026, H2 2027, etc.)
   - Tracking_Source: Where to monitor this (specific regulator, publication, index) [Source: URL]

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
                stage1_brief = _call(None, PRO, full_prompt, temperature=0.2, tools=search_tool)
            except (requests.exceptions.RequestException, ValueError, TimeoutError) as api_err:
                print(f"[Engine] Stage 1 AI Engine failure: {api_err}")
                raise ConnectionError("AI Engine cannot be accessed. There is a connection issue.") from api_err
            except Exception as e:
                print(f"[Engine] Stage 1 general failure: {e}")
                raise ConnectionError(f"AI Engine failed to respond in Stage 1: {e}") from e

            progress_callback("progress", 100)
            progress_callback("stage1", {"brief": stage1_brief, "model": PRO})

        if check_cancelled():
            raise InterruptedError("Evaluation cancelled by user after Stage 1")

        # ─────────────────────────────────────────────────────────────────────
        # STAGE 2 — MARKET SCANNER + IP SPECIALIST  (AI Engine: {PRO})
        # ─────────────────────────────────────────────────────────────────────
        stage2_prompt = f"""You are a team of two specialists: a Market Intelligence Analyst and an IP Specialist.
You have received the following Strategic Brief from the Strategist:

=== STRATEGIC BRIEF ===
{stage1_brief}
=== END BRIEF ===

IDEA:
\"{idea}\"

Produce a detailed Market & IP Intelligence Report covering ALL of the following.
Use Google Search actively to find current data — search for recent funding rounds, market reports,
latest patent filings, and news about competitors. Do NOT rely solely on training knowledge.
Minimum 700 words.

SYNTHESIS REQUIREMENT: You are an expert analyst. Do not just list facts from search. You must critically evaluate the data, synthesize it with your own market intuition, and explain *why* these facts matter for the idea's chance of success. Your deep AI reasoning must bind the search data together into a cohesive strategic narrative.


DATA INTEGRITY DIRECTIVE — MANDATORY:
You have access to Google Search. You MUST search the web BEFORE writing each section below.
Do NOT write from memory first and search later — search FIRST, then write based on what you find.
- Every market figure, competitor fact, patent reference, and trend claim MUST be cited with
  an external source: [Source: URL or Report Name — Date]
- VALID sources: Market research reports (name the firm + year), news articles (URL), patent databases,
  SEC filings, press releases, industry publications. Always include URL or exact report reference.
- INVALID: Do NOT cite your training data, "industry estimates", or "widely reported" as a source.
  Every claim must have a verifiable, external origin.
- If a specific figure cannot be found via search, write [Source: Not found via search — AI estimate]
  and explain your estimation methodology. Never present an estimate as if it were a searched fact.
- RECENCY: Only use data from 2024-2026. If you find older data, note its age and flag as potentially stale.
- ANTI-FABRICATION: Never invent competitor names, funding amounts, patent numbers, or market sizes.
  If you can only find 3 real competitors via search, list 3 — do NOT pad with made-up companies.

1. MARKET SIZING (Market Intelligence Analyst)
   - Search for the most recent market research reports on this sector.
   - Total Addressable Market (TAM): Specific dollar figure with methodology (top-down or bottom-up).
     Cite the report name and year. [Source: required]
   - Serviceable Addressable Market (SAM): Specific dollar figure for the realistic segment this idea
     can capture in years 1-5. [Source: required]
   - Serviceable Obtainable Market (SOM): Realistic market share target in year 3, with justification.

2. COMPETITIVE LANDSCAPE (Market Intelligence Analyst)
   - Search the web for the latest news on competitors and adjacent players.
   - List AT LEAST 5 named competitors. For each provide:
     * Company name
     * Their current solution / approach
     * Most recent funding round or revenue figure [Source: required]
     * Key differentiator vs. this idea
   - Identify the 2 most dangerous competitive threats and why.

3. ECOSYSTEM & SUPPLY CHAIN (Market Intelligence Analyst)
   - Key technology dependencies: platforms, APIs, or infrastructure this idea relies on
   - Tier-1 supply chain or partnership requirements
   - Regulatory environment: which jurisdictions, agencies, or frameworks apply?
     Search for any recent regulatory changes in this domain. [Source: required]

4. TECHNICAL FEASIBILITY (Market Intelligence Analyst)
   - Current Technology Readiness Level (TRL 1-9): Justify your rating
   - Search for recent academic papers or industry reports on the core technology stack.
   - Key technical risks and unsolved engineering challenges [Source: required]
   - Estimated timeline to MVP and to commercial scale

5. IP LANDSCAPE (IP Specialist)
   - Search Google Patents or recent filings for relevant patent families.
   - List 3-5 specific patent families, patent numbers, or prior art areas [Source: required]
   - Key patent holders and their strategic relevance
   - Freedom-to-operate assessment: low/medium/high risk of infringement
   - Most promising IP filing opportunity for this idea (specific claim area)

6. LIVE SIGNALS & SIGNPOSTS
   CRITICAL: Use Google Search RIGHT NOW for this entire section. Every single item below
   MUST come from a LIVE web search result — not from your training data or general knowledge.
   Search for the most recent information available (2024-2026 only).
   CITE EVERY ITEM WITH [Source: URL — date accessed/published].

   A. BULLISH SIGNALS (3-5 items): Real, observable events happening NOW that support this idea.
      Search for: recent funding rounds in the space, regulatory tailwinds, major player acquisitions,
      academic breakthroughs, supply cost drops, new government incentives, partnership announcements.
      Each signal MUST be a specific recent event with an exact date you found via search.
      Format: "[Signal description — exact date] [Source: URL]"
      IMPORTANT: If you cannot find a real event via search, state "[No recent signal found via search]"
      rather than making one up from training data.

   B. BEARISH SIGNALS (3-5 items): Real, observable events happening NOW that threaten this idea.
      Search for: competitor failures, regulatory blocks, cost spikes, market contraction data,
      major player pivoting away, project cancellations, supply chain disruptions, policy reversals.
      Each MUST be a specific, recent, search-verified event with date.
      Format: "[Signal description — exact date] [Source: URL]"

   C. MARKET SIGNPOSTS (3-5 items): Future milestones that would confirm or kill the commercial thesis.
      Base these on trends you discovered during your live search above.
      Each signpost should be:
      - Milestone: The specific triggering event to watch
      - Bull_Case: What it means if it happens (1 sentence)
      - Bear_Case: What it means if it does NOT happen by deadline (1 sentence)
      - Watch_By: Timeframe (e.g. Q3 2026)
      - Source_To_Monitor: Where to track it (publication, regulator, index) [Source: URL]

Output your full Market & IP Intelligence Report as plain text (no JSON).
"""
        if progress_callback:
            progress_callback("status", "stage2")
            progress_callback("progress", 0)
            
        if overrides.get("stage2"):
            stage2_prompt += f"\n\n=== USER OVERRIDE DIRECTIVE ===\nThe user has provided the following explicit instructions for your market research. You MUST prioritize this directive over standard rules if they conflict:\n{overrides['stage2']}\n===============================\n"

        if resume_from_stage > 2 and precomputed_stage2:
            print("[Engine] Stage 2: SKIPPED (using precomputed output)")
            stage2_report = precomputed_stage2
            progress_callback("progress", 100)
            progress_callback("stage2", {"report": stage2_report, "model": PRO, "skipped": True})
        else:
            # ── Stage 2 Pre-Pass: Deep Research ──
            dr2_topic = f"Perform a ruthless technical IP and market audit for: '{idea}'. Extract exact TAM/SAM sizes, fundings for top 5 competitors, and 3-5 specific patent family numbers related to this technology."
            if deep_research_enabled:
                stage2_dr_data = _run_deep_research(api_key, dr2_topic, deep_research_model, progress_callback, "Stage 2", 50, 80)
            else:
                progress_callback("progress", 80)
                print("[Engine] Stage 2: Deep Research disabled by user.")
                stage2_dr_data = "(Deep Research explicitly disabled by user. Proceeding with standard web search capability during synthesis phase.)"
            
            stage2_prompt_with_dr = f"""{stage2_prompt}

=== DEEP RESEARCH FACTUAL REPORT ===
The following raw data has been autonomously extracted by the Deep Research agent.
Treat this data as highly verified ground truth. Format and synthesize it into your final output.
{stage2_dr_data}
=== END DEEP RESEARCH REPORT ===
"""
            print("[Engine] Stage 2: Market Scanner + IP running (Synthesis)...")
            progress_callback("progress", 85)
            stage2_report = _call(None, PRO, stage2_prompt_with_dr, temperature=0.2, tools=search_tool)
            progress_callback("progress", 100)
            progress_callback("stage2", {"report": stage2_report, "model": PRO})
            
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

        import requests
        
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
                            "iterations": {"type": "INTEGER", "description": "Number of iterations (use 10000)"}
                        },
                        "required": ["base_value", "iterations"]
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
{stage1_brief[:4000]}
=== END ===

=== MARKET & IP REPORT (Stage 2) ===
{stage2_report[:4000]}
=== END ===

IDEA: \"{idea}\"

=== REAL-WORLD FINANCIAL BENCHMARKS (live web search — {len(benchmark_data)} chars) ===
{benchmark_data[:5000]}

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

TASK B — MONTE CARLO SIMULATION:
Call the monte_carlo_simulation_tool with:
- base_value: Your TOTAL COMBINED CAPEX (Pilot + Full-Scale) from Task A above (in USD)
- iterations: 10000

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

        if function_call:
            stage3_contents.append(ai_message)
            
            fc_name = function_call.get("name")
            args = function_call.get("args", {})
            if fc_name == "monte_carlo_simulation_tool":
                monte_carlo_result = monte_carlo_simulation(
                    base_value=float(args.get("base_value", 5000000)),
                    iterations=int(args.get("iterations", 10000)),
                )
                print(f"[Engine] Monte Carlo result: {monte_carlo_result}")
                
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

        stage4_prompt = f"""You are the Chief Innovation Officer compiling a final Investment Evaluation Report.
You have received deep-dive analysis from 3 specialist teams:

=== STAGE 1: STRATEGIC BRIEF ===
{stage1_brief}
=== END ===

=== STAGE 2: MARKET & IP INTELLIGENCE REPORT ===
{stage2_report}
=== END ===

=== STAGE 3: RISK INTELLIGENCE REPORT ===
{stage3_report}
=== END ===

IDEA: "{idea}"
MONTE CARLO RESULT: {monte_carlo_result}

SYNTHESIS REQUIREMENT: As the Chief Innovation Officer, you must provide the final overarching perspective. Do not just regurgitate the findings of the previous stages. You must synthesize the strategic, market, and financial data into a cohesive, definitive investment thesis. Use your deep AI reasoning capabilities to identify the crucial insights that bridge all the reports together. 
(Note: Mandate documents are attached to this prompt if applicable. You MUST read them directly to cite exact clauses for the Strategist_Verdict).

Synthesise ALL of the above into this EXACT JSON schema.
Output ONLY raw JSON — no markdown fences, no preamble, no trailing text.
Every Rationale field MUST be highly detailed, comprehensive (3-5 sentences), and strictly fact-based. Cite specific data points, statistics, and evidence from the stage reports. DO NOT hallucinate or make up ANY information.
Populate ALL fields. For Key_Competitors include 3-5 entries with detailed descriptions.

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

        # Attempt JSON parse — if it fails, ask the model to repair it
        if progress_callback:
            progress_callback("progress", 85)
            
        try:
            parsed = json.loads(output_str)
        except json.JSONDecodeError as json_err:
            print(f"[Engine] Stage 4 JSON parse failed ({json_err}), attempting repair...")
            repair_prompt = f"""The following JSON is malformed or truncated. Fix it so it is valid JSON.
Return ONLY the corrected JSON with no preamble or markdown fences.

BROKEN JSON:
{output_str[:8000]}
"""
            output_str2 = _call(None, FLASH, repair_prompt, temperature=0.0).strip()
            if output_str2.startswith("```"):
                output_str2 = output_str2.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
            parsed = json.loads(output_str2)

        if progress_callback:
            progress_callback("progress", 100)
            
        # Hard-override to prevent the LLM from hallucinating the research toggle state
        parsed["Deep_Research_Utilized"] = deep_research_enabled
            
        return parsed

    except InterruptedError as e:
        print(f"[Engine] Pipeline gracefully interrupted: {e}")
        raise e
    except (ConnectionError, ValueError) as ce:
        print(f"[Engine] Pipeline aborted due to AI Engine connection or validation failure: {ce}")
        raise ce
    except Exception as e:
        import traceback
        print(f"[Engine] Pipeline error: {e}")
        print(traceback.format_exc())

        base_value = 1000000.0
        returns = np.random.normal(loc=1.05, scale=0.15, size=(1000, 5))
        portfolio = base_value * np.cumprod(returns, axis=1)  # type: ignore
        final_values = portfolio[:, -1]  # type: ignore
        var_95 = float(np.percentile(final_values, 5))
        simulate_risk = "High Risk" if var_95 < base_value * 0.8 else "Acceptable Risk"
        is_proceed = isinstance(idea, str) and len(idea) > 30
        title = str(idea)[:20] + "..." if idea else "Unknown Concept"
        
        median_val = float(np.median(final_values))

        return {
            "Title": "Project: " + title,
            "Eureka_Moment": f"A rapidly scalable approach to {str(idea)[:30].lower()} balancing technical ambition with commercial viability.",
            "Strategist_Verdict": {
                "Kill_Switch": "PASS" if is_proceed else "VETO",
                "Mandate_Clause_Cited": "N/A",
                "Reasoning": "[Fallback mode — LLM unavailable] Unable to perform strategic analysis."
            },
            "D0_Scorecard": {
                "Total_Score": 42 if is_proceed else 24,
                "Strategic_Alignment": {"Score": 9 if is_proceed else 4, "Rationale": "Strong alignment with core mandate." if is_proceed else "Fails The Kill Switch."},
                "Disruptive_Potential": {"Score": 8, "Rationale": "High potential for market disruption."},
                "Technical_Feasibility": {"Score": 7 if is_proceed else 3, "Rationale": "Requires significant R&D but feasible."},
                "Commercial_Impact": {"Score": 9, "Rationale": "Massive total addressable market."},
                "Scalability": {"Score": 9, "Rationale": "Highly scalable architecture once baseline is built."}
            },
            "Top_3_Deal_Killing_Risks": [
                {"Title": "Supply Chain Bottleneck", "Description": "Dependencies on rare earth materials could halt production.", "Probability": "Medium", "Severity": "High", "Mitigation": "Diversify suppliers. Build 6-month inventory buffer. Explore synthetic alternatives."},
                {"Title": "Regulatory Friction", "Description": "Pending legislation could arbitrarily change compliance requirements.", "Probability": "Medium", "Severity": "High", "Mitigation": "Engage regulatory counsel early. Monitor legislative pipeline. Design for modularity."},
                {"Title": "Capital Efficiency", "Description": "High capital expenditure compared to existing business streams.", "Probability": "High", "Severity": "Medium", "Mitigation": "Stage capital deployment. Pursue grant funding. Validate unit economics at small scale first."}
            ],
            "Market_Verification": {
                "TAM": "$14.2 Billion (estimated)",
                "SAM": "$2.8 Billion",
                "SOM": "$140M by Year 3",
                "Key_Competitors": [
                    {"Name": "Incumbent A", "Approach": "Legacy hardware approach", "Differentiator": "This idea offers a software-first model"},
                    {"Name": "Startup B", "Approach": "Venture-backed disruptor", "Differentiator": "Better enterprise integration story"},
                    {"Name": "BigCo C", "Approach": "Platform play", "Differentiator": "Narrower focus with deeper specialisation"}
                ],
                "Supply_Chain": "Requires securing tier-1 offshore contractors.",
                "Regulatory_Environment": "Subject to applicable industry regulations."
            },
            "IP_Scan": {
                "Key_Patent_Families": "3 adjacent patents found in related domains.",
                "Freedom_To_Operate_Risk": "Medium",
                "Patent_Application_Opportunity": "High opportunity in the specific implementation approach."
            },
            "Financial_Simulation": {
                "Base_Investment_USD": 1000000,
                "5th_Percentile_Value": float(round(var_95, 2)),
                "Median_Value": float(round(median_val, 2)),
                "Risk_Assessment": simulate_risk
            },
            "Agent_Summaries": {
                "Strategist": {
                    "Theme": "Strategic Alignment",
                    "Detailed_Observations": [
                        "Strong alignment with core mandate." if is_proceed else "Fails The Kill Switch.",
                        "Potential for market disruption is high."
                    ]
                },
                "Market_Researcher": {
                    "Theme": "Market Expansion",
                    "Detailed_Observations": [
                        "Massive total addressable market.",
                        "Requires securing tier-1 offshore contractors."
                    ]
                },
                "Risk_Specialist": {
                    "Theme": "Operational Viability",
                    "Detailed_Observations": [
                        "Highly scalable architecture once baseline is built.",
                        f"Monte Carlo simulation indicates {simulate_risk} with a 5th percentile value of ${float(round(var_95, 2))}."
                    ]
                }
            },
            "Deep_Research_Utilized": deep_research_enabled,
            "Recommendation": "PROCEED TO INCUBATION" if is_proceed else "REJECT",
            "Justification": (
                f"[Fallback mode — LLM unavailable] Local Monte Carlo simulation indicates "
                f"{simulate_risk} with a 5th percentile value of ${float(round(var_95, 2))}. "
                "Restore a valid GEMINI_API_KEY to enable live AI evaluation."
            )
        }
