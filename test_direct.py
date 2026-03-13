import sys
import os

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath("backend"))

from engine import evaluate_idea

if __name__ == "__main__":
    print("Starting direct evaluation test...")
    
    def my_progress_cb(key, val):
        print(f"PROGRESS UPDATE: {key} = {str(val)[:100]}")
        
    def check_cancel():
        return False
        
    try:
        res = evaluate_idea(
            idea="Solid state batteries for long haul trucking",
            model_name="gemini-2.5-flash-lite",
            progress_callback=my_progress_cb,
            check_cancelled=check_cancel
        )
        print("Test completed successfully.")
    except Exception as e:
        print(f"Test failed with exception: {e}")
