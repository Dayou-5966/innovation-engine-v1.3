import sys
import os

sys.path.insert(0, os.path.abspath("backend"))

from engine import evaluate_idea

if __name__ == "__main__":
    def my_progress_cb(key, val):
        print(f"PROGRESS UPDATE: {key} = {str(val)[:200]}")
        
    def check_cancel():
        return False
        
    print("Testing with Deep Research DISABLED (Fallback to Google Search)...")
    try:
        res = evaluate_idea(
            idea="Wireless charging roads for EVs",
            model_name="gemini-2.5-flash-lite",
            progress_callback=my_progress_cb,
            check_cancelled=check_cancel,
            deep_research_enabled=False
        )
        print("Disabled Test completed successfully.")
    except Exception as e:
        print(f"Disabled Test failed with exception: {e}")

    print("\nTesting with Deep Research ENABLED...")
    try:
        res = evaluate_idea(
            idea="Wireless charging roads for EVs",
            model_name="gemini-2.5-flash-lite",
            progress_callback=my_progress_cb,
            check_cancelled=check_cancel,
            deep_research_enabled=True,
            deep_research_model="deep-research-pro-preview-12-2025"
        )
        print("Enabled Test completed successfully.")
    except Exception as e:
        print(f"Enabled Test failed with exception: {e}")
