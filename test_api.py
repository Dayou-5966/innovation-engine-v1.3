import os, requests, json
key = os.environ.get("GEMINI_API_KEY", "")
def generate_content(agent):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{agent}:generateContent?key={key}"
    resp = requests.post(url, json={"contents": [{"parts": [{"text": "Hello, What are the 3 top advancements in quantum?"}]}]})
    print(resp.status_code, resp.text)
def direct_interaction(agent):
    url = f"https://generativelanguage.googleapis.com/v1alpha/interactions?key={key}"
    resp = requests.post(url, json={"agent": agent, "input": "Hello"})
    print(resp.status_code, resp.text)
generate_content("deep-research-pro-preview-12-2025")
direct_interaction("deep-research-pro-preview-12-2025")
