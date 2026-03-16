import re
with open("backend.log", "r") as f:
    log = f.read()

# find the latest malformed json error and its context
import traceback
print("Searching for the JSON error...")
