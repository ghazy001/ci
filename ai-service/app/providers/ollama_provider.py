import httpx

from app.core.config import get_settings
from app.providers.ollama_utils import extract_json_object
from app.schemas.generation import (
    GenerateTestCasesRequest,
    GeneratedTestCasesPayload,
)


OLLAMA_TEST_CASE_SCHEMA = {
    "type": "object",
    "properties": {
        "testCases": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "clientGeneratedId": {"type": "string"},
                    "title": {"type": "string"},
                    "type": {
                        "type": "string",
                        "enum": [
                            "FUNCTIONAL",
                            "VALIDATION",
                            "NEGATIVE",
                            "EDGE_CASE",
                            "SECURITY",
                            "UI",
                            "INTEGRATION",
                            "REGRESSION",
                        ],
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
                    },
                    "objective": {"type": ["string", "null"]},
                    "preconditions": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "steps": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "order": {"type": "integer"},
                                "action": {"type": "string"},
                                "expected": {"type": ["string", "null"]},
                            },
                            "required": ["order", "action", "expected"],
                        },
                    },
                    "expectedResult": {"type": "string"},
                    "testData": {
                        "type": "object",
                        "additionalProperties": {"type": "string"},
                    },
                    "tags": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "coverage": {
                        "type": "object",
                        "properties": {
                            "acceptanceCriteria": {
                                "type": "array",
                                "items": {"type": "string"},
                            },
                            "businessRules": {
                                "type": "array",
                                "items": {"type": "string"},
                            },
                        },
                        "required": ["acceptanceCriteria", "businessRules"],
                    },
                    "confidence": {"type": "number"},
                },
                "required": [
                    "clientGeneratedId",
                    "title",
                    "type",
                    "priority",
                    "objective",
                    "preconditions",
                    "steps",
                    "expectedResult",
                    "testData",
                    "tags",
                    "coverage",
                    "confidence",
                ],
            },
        },
        "warnings": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
    "required": ["testCases", "warnings"],
}


class OllamaTestCaseProvider:
    provider_name = "ollama"

    def __init__(self) -> None:
        self.settings = get_settings()
        self.model_name = self.settings.ollama_model

    def generate(
        self,
        request: GenerateTestCasesRequest,
        retrieved_context=None,
    ) -> GeneratedTestCasesPayload:
        item = request.normalizedContent
        options = request.generationOptions

        max_cases = min(options.maxTestCases, 3)

        acceptance_criteria = item.acceptanceCriteria[:5]
        business_rules = item.businessRules[:5]

        prompt = f"""
You are generating manual QA test cases.

Return ONLY valid JSON.
Do not use markdown.
Do not include explanation outside JSON.
Do not include <think>.
Do not include comments.

Generate exactly {max_cases} manual QA test cases.

Work item:
Title: {item.title}
Type: {item.type}
Priority: {item.priority or "MEDIUM"}
Description: {item.description or ""}
Acceptance criteria: {acceptance_criteria}
Business rules: {business_rules}
Language: {options.language or "same as work item"}

Important enum rules:
- type must be one of: FUNCTIONAL, VALIDATION, NEGATIVE, EDGE_CASE, SECURITY, UI, INTEGRATION, REGRESSION
- priority must be one of: LOW, MEDIUM, HIGH, CRITICAL
- confidence must be between 0 and 1
- testData values must be strings only
- every step must have order, action, expected
- coverage.acceptanceCriteria and coverage.businessRules must be arrays

Example output:
{{
  "testCases": [
    {{
      "clientGeneratedId": "TC-001",
      "title": "Verify main behavior",
      "type": "FUNCTIONAL",
      "priority": "MEDIUM",
      "objective": "Validate the expected behavior.",
      "preconditions": ["The application is accessible."],
      "steps": [
        {{
          "order": 1,
          "action": "Open the related feature.",
          "expected": "The feature is displayed."
        }},
        {{
          "order": 2,
          "action": "Perform the main action.",
          "expected": "The action is processed successfully."
        }}
      ],
      "expectedResult": "The feature behaves according to the requirement.",
      "testData": {{}},
      "tags": ["generated", "local-ai"],
      "coverage": {{
        "acceptanceCriteria": [],
        "businessRules": []
      }},
      "confidence": 0.6
    }}
  ],
  "warnings": ["Generated by local Ollama fallback model."]
}}
""".strip()

        response = httpx.post(
            f"{self.settings.ollama_base_url}/api/generate",
            json={
                "model": self.model_name,
                "prompt": prompt,
                "stream": False,
                # This is the important part:
                # Ollama will try to return structured JSON.
                "format": OLLAMA_TEST_CASE_SCHEMA,
                # For Qwen/DeepSeek-style reasoning models.
                # If your Ollama version does not support it, remove this line.
                "think": False,
                "options": {
                    "temperature": self.settings.ollama_temperature,
                    "num_predict": self.settings.ollama_num_predict,
                    "num_ctx": self.settings.ollama_num_ctx,
                },
                "keep_alive": "10m",
            },
            timeout=httpx.Timeout(
                connect=10.0,
                read=float(self.settings.ollama_timeout_seconds),
                write=10.0,
                pool=10.0,
            ),
        )

        response.raise_for_status()

        data = response.json()
        raw_content = data.get("response", "")

        parsed = extract_json_object(raw_content)

        return GeneratedTestCasesPayload.model_validate(parsed)
