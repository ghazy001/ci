from typing import Any


def clean_schema_for_openai_strict(schema: dict[str, Any]) -> dict[str, Any]:
    """
    Cleans Pydantic JSON schema for OpenAI strict structured outputs.

    OpenAI strict JSON schemas require:
    - additionalProperties=False for object schemas
    - required containing every property on object schemas

    This function also removes schema keywords that commonly cause
    strict-mode compatibility issues.
    """
    forbidden_keys = {
        "default",
        "format",
        "title",
        "examples",
    }

    def clean(value: Any) -> Any:
        if isinstance(value, dict):
            cleaned: dict[str, Any] = {}

            for key, val in value.items():
                if key in forbidden_keys:
                    continue

                cleaned[key] = clean(val)

            if cleaned.get("type") == "object":
                properties = cleaned.get("properties")

                if isinstance(properties, dict):
                    cleaned["required"] = list(properties.keys())

                cleaned.setdefault("additionalProperties", False)

            return cleaned

        if isinstance(value, list):
            return [clean(item) for item in value]

        return value

    return clean(schema)