from app.core.config import get_settings
from app.providers.fake_provider import FakeTestCaseProvider
from app.providers.openai_provider import OpenAITestCaseProvider
from app.providers.ollama_provider import OllamaTestCaseProvider
from app.schemas.generation import (
    GenerateTestCasesRequest,
    GenerateTestCasesResponse,
    GeneratedTestCasesPayload,
)
from app.schemas.rag import RagSearchResult
from app.services.quality_checker import TestCaseQualityChecker
from app.services.rag_service import RagService


class CaseGenerationPipeline:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.provider = self._build_provider(self.settings.llm_provider)
        self.fallback_provider = self._build_fallback_provider(
            self.settings.llm_fallback_provider
        )
        self.quality_checker = TestCaseQualityChecker()

    def _build_provider(self, provider_name: str | None):
        provider = (provider_name or "fake").lower()

        if provider == "openai":
            return OpenAITestCaseProvider()

        if provider in {"ollama", "qwen", "local"}:
            return OllamaTestCaseProvider()

        return FakeTestCaseProvider()

    def _build_fallback_provider(self, provider_name: str | None):
        if not provider_name:
            return None

        primary_name = self.settings.llm_provider.lower()
        fallback_name = provider_name.lower()

        if fallback_name == primary_name:
            return None

        return self._build_provider(fallback_name)

    def _generate_with_fallback(
        self,
        request: GenerateTestCasesRequest,
        retrieved_context: list[RagSearchResult],
    ):
        try:
            result = self.provider.generate(
                request,
                retrieved_context=retrieved_context,
            )

            return result, self.provider, []

        except Exception as primary_error:
            if not self.fallback_provider:
                raise

            fallback_warnings = [
                f"Primary LLM provider '{self.provider.provider_name}' failed. "
                f"Trying fallback provider '{self.fallback_provider.provider_name}'. "
                f"Reason: {str(primary_error)}"
            ]

            try:
                # Important:
                # Pass empty retrieved_context to local fallback.
                # This prevents very large prompts and speeds up Ollama.
                fallback_result = self.fallback_provider.generate(
                    request,
                    retrieved_context=[],
                )

                fallback_warnings.append(
                    f"Fallback provider '{self.fallback_provider.provider_name}' was used successfully."
                )

                return fallback_result, self.fallback_provider, fallback_warnings

            except Exception as fallback_error:
                # Final safe fallback:
                # The job should not crash if both OpenAI and Ollama fail.
                safe_provider = FakeTestCaseProvider()

                fallback_warnings.append(
                    f"Fallback provider '{self.fallback_provider.provider_name}' also failed. "
                    f"Used safe template provider instead. "
                    f"Reason: {str(fallback_error)}"
                )

                safe_result = safe_provider.generate(
                    request,
                    retrieved_context=[],
                )

                return safe_result, safe_provider, fallback_warnings

    def generate(self, request: GenerateTestCasesRequest) -> GenerateTestCasesResponse:
        retrieved_context: list[RagSearchResult] = []
        rag_warnings: list[str] = []

        if request.generationOptions.useRag:
            try:
                rag_service = RagService()
                retrieved_context = rag_service.retrieve_for_generation(request)

                if not retrieved_context:
                    rag_warnings.append(
                        "RAG was enabled, but no relevant project context was found."
                    )

            except Exception as error:
                rag_warnings.append(
                    f"RAG retrieval failed. Generation continued without retrieved context. Reason: {str(error)}"
                )
                retrieved_context = []

        provider_result, used_provider, fallback_warnings = (
            self._generate_with_fallback(
                request=request,
                retrieved_context=retrieved_context,
            )
        )

        if isinstance(provider_result, list):
            raw_payload = GeneratedTestCasesPayload(
                testCases=provider_result,
                warnings=[],
            )
        else:
            raw_payload = provider_result

        checked_payload = self.quality_checker.check(request, raw_payload)

        warnings = list(checked_payload.warnings)
        warnings.extend(rag_warnings)
        warnings.extend(fallback_warnings)

        if not checked_payload.testCases:
            warnings.append("No valid test cases were generated after quality checks.")

        confidence = (
            round(
                sum(tc.confidence for tc in checked_payload.testCases)
                / len(checked_payload.testCases),
                2,
            )
            if checked_payload.testCases
            else 0
        )

        generation_method = (
            "rag_structured_llm_generation_v1"
            if request.generationOptions.useRag
            else "structured_llm_generation_v1"
        )

        if used_provider.provider_name == "fake":
            generation_method = "safe_template_generation_v1"

        if used_provider.provider_name == "ollama":
            generation_method = "local_ollama_qwen_generation_v1"

        return GenerateTestCasesResponse(
            requestId=request.requestId,
            workItemId=request.workItemId,
            provider=used_provider.provider_name,
            model=used_provider.model_name,
            promptVersion=self.settings.prompt_version,
            generationMethod=generation_method,
            confidence=confidence,
            warnings=self._unique(warnings),
            testCases=checked_payload.testCases,
        )

    def _unique(self, values: list[str]) -> list[str]:
        seen: set[str] = set()
        result: list[str] = []

        for value in values:
            clean = value.strip()

            if not clean:
                continue

            key = clean.lower()

            if key in seen:
                continue

            seen.add(key)
            result.append(clean)

        return result
