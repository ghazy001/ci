import json
from openai import OpenAI

from app.core.config import get_settings
from app.schemas.page_inspection import PageInspectionResult
from app.schemas.script_generation import (
    GenerateAutomationScriptRequest,
    GeneratedAutomationScript,
)
from app.services.script_prompt_builder import AutomationScriptPromptBuilder


SCRIPT_RESPONSE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "fileName": {"type": "string"},
        "language": {"type": "string"},
        "code": {"type": "string"},
        "explanation": {"type": ["string", "null"]},
        "dependencies": {
            "type": "array",
            "items": {"type": "string"},
        },
        "setupNotes": {
            "type": "array",
            "items": {"type": "string"},
        },
        "selectorsUsed": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "purpose": {"type": "string"},
                    "selector": {"type": "string"},
                    "source": {"type": "string"},
                },
                "required": ["purpose", "selector", "source"],
            },
        },
        "warnings": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
    "required": [
        "fileName",
        "language",
        "code",
        "explanation",
        "dependencies",
        "setupNotes",
        "selectorsUsed",
        "warnings",
    ],
}


class OpenAIAutomationScriptProvider:
    provider_name = "openai"

    def __init__(self) -> None:
        self.settings = get_settings()

        if not self.settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is missing")

        self.client = OpenAI(api_key=self.settings.openai_api_key)
        self.model_name = self.settings.script_openai_model
        self.prompt_builder = AutomationScriptPromptBuilder()

    def generate(
        self,
        request: GenerateAutomationScriptRequest,
        page_inspection: PageInspectionResult,
    ) -> GeneratedAutomationScript:
        system_prompt = self.prompt_builder.build_system_prompt()
        user_prompt = self.prompt_builder.build_user_prompt(
            request=request,
            page_inspection=page_inspection,
        )

        completion = self.client.chat.completions.create(
            model=self.model_name,
            temperature=self.settings.script_openai_temperature,
            max_tokens=self.settings.script_openai_max_output_tokens,
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
                    "name": "generated_automation_script",
                    "schema": SCRIPT_RESPONSE_SCHEMA,
                    "strict": True,
                },
            },
        )

        raw_content = completion.choices[0].message.content

        if not raw_content:
            raise RuntimeError("OpenAI returned an empty script response")

        parsed = json.loads(raw_content)

        return GeneratedAutomationScript.model_validate(parsed)
