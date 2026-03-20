import requests
import os

DID_API_URL = "https://api.d-id.com"

def _headers():
    api_key = os.environ.get("DID_API_KEY", "")
    return {
        "Authorization": f"Basic {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

def create_talk(script: str) -> str | None:
    payload = {
        "script": {
            "type": "text",
            "input": script,
            "provider": {"type": "microsoft", "voice_id": "en-US-JennyNeural"}
        },
        "presenter_id": "rian-lZC6n1GWaHg2ruD",
        "driver_id":    "uM00QS7drp",
        "config":       {"stitch": True},
    }
    try:
        response = requests.post(f"{DID_API_URL}/talks", json=payload, headers=_headers(), timeout=15)
        response.raise_for_status()
        return response.json().get("id")
    except requests.RequestException as e:
        print(f"[D-ID] create_talk failed: {e}")
        return None

def get_talk_status(talk_id: str) -> dict:
    try:
        response = requests.get(f"{DID_API_URL}/talks/{talk_id}", headers=_headers(), timeout=10)
        response.raise_for_status()
        data = response.json()
        return {"status": data.get("status", "unknown"), "result_url": data.get("result_url")}
    except requests.RequestException as e:
        print(f"[D-ID] get_talk_status failed: {e}")
        return {"status": "error", "result_url": None}
