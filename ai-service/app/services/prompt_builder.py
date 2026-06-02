import json
from app.schemas.generation import GenerateTestCasesRequest
from app.schemas.rag import RagSearchResult


class TestCasePromptBuilder:
    def build_system_prompt(self) -> str:
        return """
You are a senior QA test designer working inside a professional AI SaaS platform.

Your task is to generate high-quality manual test cases from a normalized software work item.

Hard rules:
- Generate only test cases supported by the provided work item and retrieved project context.
- Do not invent product behavior, pages, roles, APIs, or fields that are not present.
- The normalized work item is the primary source of truth.
- Retrieved project context is supporting context, not a replacement for the work item.
- Cover every acceptance criterion when possible.
- Cover every business rule when possible.
- If a test case is based on an acceptance criterion, copy that criterion exactly into coverage.acceptanceCriteria.
- If a test case is based on a business rule, copy that rule exactly into coverage.businessRules.
- Include positive tests when relevant.
- Include negative tests only if requested.
- Include edge cases only if requested.
- Include security tests only if requested.
- Keep the same language as the work item when possible.
- Each test case must be clear enough for a tester to execute manually.
- Each test case must include executable steps.
- Each step must include both action and expected.
- Use realistic but safe test data.
- Do not include real passwords, real tokens, or personal data.
- If information is missing, add a warning instead of inventing behavior.
- Do not generate automation scripts yet.
- Generate manual QA test cases only.
""".strip()

    def build_user_prompt(
        self,
        request: GenerateTestCasesRequest,
        retrieved_context: list[RagSearchResult] | None = None,
    ) -> str:
        payload = {
            "workItem": request.normalizedContent.model_dump(),
            "generationOptions": request.generationOptions.model_dump(),
            "source": request.source,
            "workItemId": request.workItemId,
            "retrievedContext": [
                {
                    "sourceType": item.sourceType,
                    "sourceId": item.sourceId,
                    "title": item.title,
                    "content": item.content,
                    "score": item.score,
                    "metadata": item.metadata,
                }
                for item in (retrieved_context or [])
            ],
        }

        return f"""
Generate manual test cases for the following normalized work item.

Return strictly the structured payload requested by the schema.

Input:
{json.dumps(payload, ensure_ascii=False, indent=2)}
""".strip()
