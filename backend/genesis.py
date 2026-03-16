import os
import json
import time
from dotenv import load_dotenv

load_dotenv()


def generate_concepts(keywords: str, model_name: str = None) -> list:
    if model_name is None:
        model_name = os.environ.get("DEFAULT_MODEL", "gemini-2.5-flash-lite")
    """Generate 3 business concepts grounded in live web search.
    
    Uses the raw HTTP _call() from engine.py (not the Python SDK) to avoid
    httpx deadlocks that silently hang on certain model tiers.
    """
    model = model_name

    prompt = f"""You are a visionary Product Architect with access to live web search.
Search the web to understand the current landscape around: "{keywords}"
Look for: recent startup funding in this space, emerging technology breakthroughs, unsolved market gaps, and enterprise pain points.

Using those real-world signals AND your own deep strategic reasoning, generate EXACTLY 3 highly
disruptive, enterprise-grade business concepts. Each concept must synthesize real-world search
data with your AI perspective — not just rehash search results.

You MUST output ONLY a valid JSON array of exactly 3 objects matching this exact schema:
[
  {{
    "id": 1,
    "title": "Short, catchy project name",
    "description": "A 2-3 sentence description of the core value proposition, referencing a real market signal or gap you discovered."
  }},
  {{
    "id": 2,
    "title": "...",
    "description": "..."
  }},
  {{
    "id": 3,
    "title": "...",
    "description": "..."
  }}
]

DO NOT include markdown formatting like ```json. Output raw JSON ONLY."""

    MAX_RETRIES = 5
    RETRY_DELAY = 6  # seconds
    last_exc = RuntimeError("No generation attempts made")

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            # Use raw HTTP requests via engine._call to avoid SDK httpx deadlocks
            from engine import _call

            print(f"[Genesis] Attempt {attempt}/{MAX_RETRIES}: model={model}, keywords='{keywords[:40]}'")
            output_str = _call(
                client=None,  # _call doesn't use the client parameter
                model=model,
                prompt=prompt,
                temperature=0.7,
                tools=["google_search"],  # truthy + non-None triggers googleSearch in _call
                max_retries=2,  # inner retries per attempt
                retry_delay=4.0,
            )
            output_str = output_str.strip()

            if not output_str:
                raise ValueError("Model returned an empty response.")

            # Extract JSON robustly — handles preamble text from AI
            import re as _re
            _json_match = _re.search(r"```(?:json)?\s*(\[.*\])\s*```", output_str, _re.DOTALL)
            if _json_match:
                output_str = _json_match.group(1).strip()
            else:
                _bracket_match = _re.search(r"\[.*\]", output_str, _re.DOTALL)
                if _bracket_match:
                    output_str = _bracket_match.group(0).strip()

            parsed = json.loads(output_str.strip())
            
            # Normalize: If LLM wrapped it in a dict (e.g. {"concepts": [...]}), extract the list.
            if isinstance(parsed, dict):
                p_dict = dict(parsed)  # Safe copy for type checker
                for key in ["concepts", "data", "business_concepts", "ideas"]:
                    val = p_dict.get(key)
                    if isinstance(val, list):
                        parsed = val
                        break
            
            if not isinstance(parsed, list):
                raise ValueError(f"JSON parsed to {type(parsed)}, expected a list.")

            print(f"[Genesis] Generated {len(parsed)} concepts on attempt {attempt}")
            return parsed

        except Exception as e:
            last_exc = e
            err_str = str(e)
            print(f"[Genesis] Attempt {attempt}/{MAX_RETRIES} failed: {err_str}")
            if attempt < MAX_RETRIES:
                wait = RETRY_DELAY * attempt
                print(f"[Genesis] Retrying in {wait}s...")
                time.sleep(wait)
            else:
                print("[Genesis] All retries exhausted. Throwing error.")

    # All retries exhausted — throw the actual error to main.py
    raise last_exc
