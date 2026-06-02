import json
from openai import OpenAI

from app.core.config import get_settings
from app.schemas.generation import (
    GenerateTestCasesRequest,
    GeneratedTestCasesPayload,
)
from app.services.prompt_builder import TestCasePromptBuilder
from app.schemas.rag import RagSearchResult


TEST_CASES_RESPONSE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "testCases": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
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
                            "additionalProperties": False,
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
                        "properties": {},
                    },
                    "tags": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "coverage": {
                        "type": "object",
                        "additionalProperties": False,
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
                        "required": [
                            "acceptanceCriteria",
                            "businessRules",
                        ],
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


class OpenAITestCaseProvider:
    provider_name = "openai"

    def __init__(self) -> None:
        self.settings = get_settings()

        if not self.settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is missing")

        self.client = OpenAI(api_key=self.settings.openai_api_key)
        self.model_name = self.settings.openai_model
        self.prompt_builder = TestCasePromptBuilder()

    def generate(
        self,
        request: GenerateTestCasesRequest,
        retrieved_context: list[RagSearchResult] | None = None,
    ) -> GeneratedTestCasesPayload:
        system_prompt = self.prompt_builder.build_system_prompt()
        user_prompt = self.prompt_builder.build_user_prompt(
            request,
            retrieved_context=retrieved_context,
        )

        completion = self.client.chat.completions.create(
            model=self.model_name,
            temperature=self.settings.openai_temperature,
            max_tokens=self.settings.openai_max_output_tokens,
            messages=[
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": user_prompt,
                },
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "generated_test_cases_payload",
                    "schema": TEST_CASES_RESPONSE_SCHEMA,
                    "strict": True,
                },
            },
        )

        raw_content = completion.choices[0].message.content

        if not raw_content:
            raise RuntimeError("OpenAI returned an empty response")

        parsed = json.loads(raw_content)

        return GeneratedTestCasesPayload.model_validate(parsed)
