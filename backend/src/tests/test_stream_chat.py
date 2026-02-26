"""
Simple test for POST /agents/chat/stream

Run from the backend directory:
    python -m src.tests.test_stream_chat
"""

import httpx
import json

BASE_URL = "http://localhost:8081"


def stream_chat(question: str, user_id: str = "test_user", thread_id: str = "test_thread"):
    url = f"{BASE_URL}/agents/chat/stream"
    payload = {
        "question": question,
        "user_id": user_id,
        "thread_id": thread_id,
    }

    print(f"\nYou: {question}")
    print("Assistant: ", end="", flush=True)

    with httpx.Client(timeout=60.0) as client:
        with client.stream("POST", url, json=payload) as response:
            response.raise_for_status()
            for line in response.iter_lines():
                if not line.startswith("data:"):
                    continue
                raw = line[len("data:"):].strip()
                if raw == "[DONE]":
                    break
                try:
                    event = json.loads(raw)
                except json.JSONDecodeError:
                    continue

                if "error" in event:
                    print(f"\n[ERROR] {event['error']}", flush=True)
                    break

                chunk = event.get("content", "")
                print(chunk, end="", flush=True)

    print()  # newline after response


if __name__ == "__main__":
    stream_chat("What is the current price of gold?")


    stream_chat("What is the current price of gold? and what is the technical analysis of the gold price?")
