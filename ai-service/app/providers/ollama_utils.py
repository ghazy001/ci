import json
import re
from typing import Any


def extract_json_object(raw_text: str) -> dict[str, Any]:
    if not raw_text or not raw_text.strip():
        raise RuntimeError("Ollama returned an empty response")

    text = raw_text.strip()

    # Remove Qwen/DeepSeek thinking blocks if present.
    text = re.sub(
        r"<think>.*?</think>",
        "",
        text,
        flags=re.IGNORECASE | re.DOTALL,
    ).strip()

    # Remove markdown fences.
    text = re.sub(r"^```(?:json)?", "", text.strip(), flags=re.IGNORECASE)
    text = re.sub(r"```$", "", text.strip()).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    start = text.find("{")
    end = text.rfind("}")

    if start == -1 or end == -1 or end <= start:
        raise RuntimeError(f"No JSON object found in Ollama response: {text[:1000]}")

    candidate = text[start : end + 1]

    try:
        return json.loads(candidate)
    except json.JSONDecodeError as error:
        raise RuntimeError(
            f"Ollama response was not valid JSON. "
            f"Error: {str(error)}. "
            f"Response: {text[:1000]}"
        )