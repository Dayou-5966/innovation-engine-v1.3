import os
import json
import time
from dotenv import load_dotenv

load_dotenv()
os.environ["GEMINI_API_KEY"] = os.environ.get("GEMINI_API_KEY", "dummy_gemini_key")


def generate_concepts(keywords: str, model_name: str = "gemini-2.5-flash-lite") -> list:
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

            # Strip markdown fences if present
            if output_str.startswith("```json"):
                output_str = output_str[7:]
            if output_str.startswith("```"):
                output_str = output_str[3:]
            if output_str.endswith("```"):
                output_str = output_str[:-3]

            parsed = json.loads(output_str.strip())
            print(f"[Genesis] Generated {len(parsed)} concepts on attempt {attempt}")
            return parsed

        except Exception as e:
            err_str = str(e)
            print(f"[Genesis] Attempt {attempt}/{MAX_RETRIES} failed: {err_str}")
            if attempt < MAX_RETRIES:
                wait = RETRY_DELAY * attempt
                print(f"[Genesis] Retrying in {wait}s...")
                time.sleep(wait)
            else:
                print("[Genesis] All retries exhausted. Serving fallback concepts.")

    # All retries exhausted — return clearly-marked fallback
    return [
        {
            "id": 1,
            "title": f"[AI Unavailable] {keywords[:20]} Venture Alpha",
            "description": f"The AI model is temporarily overloaded. Please try again in a minute. This is a placeholder for a concept around: {keywords}."
        },
        {
            "id": 2,
            "title": "[AI Unavailable] Platform Beta",
            "description": "The AI model is under high demand. Retry shortly for real AI-generated concepts grounded in live market research."
        },
        {
            "id": 3,
            "title": "[AI Unavailable] Gamma Initiative",
            "description": "Gemini 2.5 Pro is temporarily unavailable. Your keywords have been saved — just hit Generate again in a moment."
        }
    ]
