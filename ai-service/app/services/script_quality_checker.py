from app.schemas.script_generation import (
    AutomationFramework,
    GenerateAutomationScriptRequest,
    GeneratedAutomationScript,
)


class AutomationScriptQualityChecker:
    def check(
        self,
        request: GenerateAutomationScriptRequest,
        script: GeneratedAutomationScript,
    ) -> GeneratedAutomationScript:
        warnings = list(script.warnings)

        code = script.code.strip()
        file_name = script.fileName.strip()

        if not code:
            raise ValueError("Generated script code is empty")

        if not file_name:
            raise ValueError("Generated script fileName is empty")

        framework = request.generationContext.framework

        expected_extension = self._expected_extension(framework)

        if not file_name.endswith(expected_extension):
            warnings.append(
                f"File name extension was adjusted to match {framework}: {expected_extension}"
            )
            file_name = self._replace_extension(file_name, expected_extension)

        language = self._expected_language(framework)

        if script.language.lower() != language:
            warnings.append(
                f"Language was normalized from '{script.language}' to '{language}'."
            )

        framework_warning = self._framework_code_warning(framework, code)

        if framework_warning:
            warnings.append(framework_warning)

        security_warnings = self._security_warnings(code)
        warnings.extend(security_warnings)

        return script.model_copy(
            update={
                "fileName": file_name,
                "language": language,
                "code": code,
                "warnings": self._unique(warnings),
            }
        )

    def _expected_extension(self, framework: AutomationFramework) -> str:
        if framework == AutomationFramework.PLAYWRIGHT_TS:
            return ".spec.ts"

        if framework == AutomationFramework.PLAYWRIGHT_PYTHON:
            return ".py"

        if framework == AutomationFramework.CYPRESS_TS:
            return ".cy.ts"

        return ".java"

    def _expected_language(self, framework: AutomationFramework) -> str:
        if framework == AutomationFramework.PLAYWRIGHT_TS:
            return "typescript"

        if framework == AutomationFramework.PLAYWRIGHT_PYTHON:
            return "python"

        if framework == AutomationFramework.CYPRESS_TS:
            return "typescript"

        return "java"

    def _replace_extension(self, file_name: str, extension: str) -> str:
        for old_ext in [".spec.ts", ".cy.ts", ".ts", ".py", ".java"]:
            if file_name.endswith(old_ext):
                return file_name[: -len(old_ext)] + extension

        return file_name + extension

    def _framework_code_warning(
        self,
        framework: AutomationFramework,
        code: str,
    ) -> str | None:
        if framework == AutomationFramework.PLAYWRIGHT_TS:
            if "@playwright/test" not in code:
                return "Playwright TypeScript script does not import @playwright/test."

        if framework == AutomationFramework.PLAYWRIGHT_PYTHON:
            if "playwright.sync_api" not in code:
                return "Playwright Python script does not import playwright.sync_api."

        if framework == AutomationFramework.CYPRESS_TS:
            if "cy." not in code:
                return "Cypress script does not appear to use Cypress commands."

        if framework == AutomationFramework.SELENIUM_JAVA:
            if "WebDriver" not in code:
                return "Selenium Java script does not appear to use WebDriver."

        return None

    def _security_warnings(self, code: str) -> list[str]:
        warnings: list[str] = []

        suspicious_literals = [
            "password123",
            "admin123",
            "secret",
            "token=",
            "api_key",
            "apikey",
        ]

        lowered = code.lower()

        for item in suspicious_literals:
            if item in lowered:
                warnings.append(
                    "Generated script may contain hardcoded sensitive-looking values. Review before approval."
                )
                break

        return warnings

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