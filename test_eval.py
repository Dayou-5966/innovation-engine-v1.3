import urllib.request, json, time
req = urllib.request.Request("http://127.0.0.1:8000/api/token", data=b'{"password":"EUREKA"}', headers={"Content-Type": "application/json"})
token = json.loads(urllib.request.urlopen(req).read().decode())["access_token"]
req = urllib.request.Request("http://127.0.0.1:8000/api/evaluate/async", data=b'{"idea":"Solar power over canals in California","model":"gemini-2.5-flash-lite"}', headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"})
job = json.loads(urllib.request.urlopen(req).read().decode())["job_id"]
print(f"Started job: {job}")
for _ in range(60):
    time.sleep(2)
    req = urllib.request.Request(f"http://127.0.0.1:8000/api/evaluate/status/{job}", headers={"Authorization": f"Bearer {token}"})
    status = json.loads(urllib.request.urlopen(req).read().decode())
    print(status.get("status"), status.get("current_stage"), status.get("current_progress"), status.get("error"))
    if status["status"] in ["done", "error", "cancelled"]: break
