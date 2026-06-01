from app.core.config import get_settings
from app.providers.fake_script_provider import FakeAutomationScriptProvider
from app.providers.openai_script_provider import OpenAIAutomationScriptProvider
from app.providers.ollama_script_provider import OllamaAutomationScriptProvider
from app.schemas.script_generation import (
    GenerateAutomationScriptRequest,
    GenerateAutomationScriptResponse,
)
from app.services.page_inspector import PageInspector
from app.services.script_quality_checker import AutomationScriptQualityChecker


class AutomationScriptGenerationPipeline:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.provider = self._build_provider(self.settings.script_llm_provider)
        self.fallback_provider = self._build_fallback_provider(
            self.settings.script_llm_fallback_provider
        )
        self.page_inspector = PageInspector()
        self.quality_checker = AutomationScriptQualityChecker()

    def _build_provider(self, provider_name: str | None):
        provider = (provider_name or "fake").lower()

        if provider == "openai":
            return OpenAIAutomationScriptProvider()

        if provider in {"ollama", "qwen", "local"}:
            return OllamaAutomationScriptProvider()

        return FakeAutomationScriptProvider()

    def _build_fallback_provider(self, provider_name: str | None):
        if not provider_name:
            return None

        primary_name = self.settings.script_llm_provider.lower()
        fallback_name = provider_name.lower()

        if fallback_name == primary_name:
            return None

        return self._build_provider(fallback_name)

    def _generate_with_fallback(self, request, page_inspection):
        try:
            result = self.provider.generate(
                request=request,
                page_inspection=page_inspection,
            )

            return result, self.provider, []

        except Exception as primary_error:
            if not self.fallback_provider:
                raise

            fallback_warnings = [
                f"Primary script provider '{self.provider.provider_name}' failed. "
                f"Trying fallback provider '{self.fallback_provider.provider_name}'. "
                f"Reason: {str(primary_error)}"
            ]

            try:
                fallback_result = self.fallback_provider.generate(
                    request=request,
                    page_inspection=page_inspection,
                )

                fallback_warnings.append(
                    f"Fallback script provider '{self.fallback_provider.provider_name}' was used successfully."
                )

                return fallback_result, self.fallback_provider, fallback_warnings

            except Exception as fallback_error:
                safe_provider = FakeAutomationScriptProvider()

                fallback_warnings.append(
                    f"Fallback script provider '{self.fallback_provider.provider_name}' also failed. "
                    f"Used safe script template provider instead. "
                    f"Reason: {str(fallback_error)}"
                )

                safe_result = safe_provider.generate(
                    request=request,
                    page_inspection=page_inspection,
                )

                return safe_result, safe_provider, fallback_warnings

    def generate(
        self,
        request: GenerateAutomationScriptRequest,
    ) -> GenerateAutomationScriptResponse:
        warnings: list[str] = []

        page_inspection = self.page_inspector.inspect(
            url=request.generationContext.targetUrl,
            browser=request.generationContext.browser,
            include_screenshot=False,
        )

        warnings.extend(page_inspection.warnings)

        raw_script, used_provider, fallback_warnings = self._generate_with_fallback(
            request=request,
            page_inspection=page_inspection,
        )

        checked_script = self.quality_checker.check(
            request=request,
            script=raw_script,
        )

        warnings.extend(checked_script.warnings)
        warnings.extend(fallback_warnings)

        if used_provider.provider_name == "fake":
            generation_method = "playwright_inspection_safe_template_script_generation_v1"
            confidence = 0.35
        elif used_provider.provider_name == "ollama":
            generation_method = "playwright_inspection_local_ollama_qwen_script_generation_v1"
            confidence = 0.6
        else:
            generation_method = "playwright_inspection_structured_script_generation_v1"
            confidence = 0.85

        return GenerateAutomationScriptResponse(
            requestId=request.requestId,
            testCaseId=request.testCaseId,
            workItemId=request.workItemId,
            provider=used_provider.provider_name,
            model=used_provider.model_name,
            promptVersion=self.settings.script_prompt_version,
            generationMethod=generation_method,
            confidence=confidence,
            warnings=self._unique(warnings),
            pageInspection=page_inspection,
            script=checked_script,
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