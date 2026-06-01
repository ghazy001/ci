import re

from app.schemas.page_inspection import PageInspectionResult
from app.schemas.script_generation import (
    AutomationFramework,
    GenerateAutomationScriptRequest,
    GeneratedAutomationScript,
    SelectorUsed,
)


class FakeAutomationScriptProvider:
    provider_name = "fake"
    model_name = "fake-script-generation-model"

    def generate(
        self,
        request: GenerateAutomationScriptRequest,
        page_inspection: PageInspectionResult,
    ) -> GeneratedAutomationScript:
        framework = request.generationContext.framework

        if framework == AutomationFramework.PLAYWRIGHT_TS:
            return self._generate_playwright_ts(request, page_inspection)

        if framework == AutomationFramework.PLAYWRIGHT_PYTHON:
            return self._generate_playwright_python(request, page_inspection)

        if framework == AutomationFramework.CYPRESS_TS:
            return self._generate_cypress_ts(request, page_inspection)

        return self._generate_selenium_java(request, page_inspection)

    def _generate_playwright_ts(
        self,
        request: GenerateAutomationScriptRequest,
        page: PageInspectionResult,
    ) -> GeneratedAutomationScript:
        test_title = request.testCase.get("title", "generated test")
        file_name = self._file_name(test_title, ".spec.ts")
        selectors = self._select_top_selectors(page)

        first_selector = selectors[0].selector if selectors else "page.locator('body')"

        code = f"""import {{ test, expect }} from '@playwright/test';

test('{self._escape_ts_string(test_title)}', async ({{ page }}) => {{
  await page.goto(process.env.BASE_URL ?? '{self._escape_ts_string(request.generationContext.targetUrl)}');

  // TODO: Review generated steps and adapt test data if needed.
  await expect(page).toHaveTitle(/.*/);

  // Example selector discovered during page inspection:
  await expect({first_selector}).toBeVisible();

  // Test case expected result:
  // {self._comment(request.testCase.get("expectedResult", ""))}
}});
"""

        return GeneratedAutomationScript(
            fileName=file_name,
            language="typescript",
            code=code,
            explanation="Fake provider generated a Playwright TypeScript skeleton using inspected page selectors.",
            dependencies=["@playwright/test"],
            setupNotes=[
                "Set BASE_URL to the target environment URL.",
                "Review selectors and replace placeholder assertions with complete test steps.",
                "Do not hardcode credentials. Use environment variables.",
            ],
            selectorsUsed=selectors,
            warnings=[
                "This is a fake provider skeleton. OpenAI script generation will be added in the next step."
            ],
        )

    def _generate_playwright_python(
        self,
        request: GenerateAutomationScriptRequest,
        page: PageInspectionResult,
    ) -> GeneratedAutomationScript:
        test_title = request.testCase.get("title", "generated test")
        file_name = self._file_name(test_title, ".py")
        selectors = self._select_top_selectors(page)

        code = f"""import os
from playwright.sync_api import Page, expect


def test_{self._python_function_name(test_title)}(page: Page):
    page.goto(os.getenv("BASE_URL", "{request.generationContext.targetUrl}"))

    # TODO: Review generated steps and adapt test data if needed.
    expect(page).to_have_title(__import__("re").compile(".*"))

    # Test case expected result:
    # {self._comment(request.testCase.get("expectedResult", ""))}
"""

        return GeneratedAutomationScript(
            fileName=file_name,
            language="python",
            code=code,
            explanation="Fake provider generated a Playwright Python skeleton.",
            dependencies=["playwright", "pytest"],
            setupNotes=[
                "Set BASE_URL to the target environment URL.",
                "Run with pytest after installing Playwright browsers.",
            ],
            selectorsUsed=selectors,
            warnings=[
                "This is a fake provider skeleton. OpenAI script generation will be added in the next step."
            ],
        )

    def _generate_cypress_ts(
        self,
        request: GenerateAutomationScriptRequest,
        page: PageInspectionResult,
    ) -> GeneratedAutomationScript:
        test_title = request.testCase.get("title", "generated test")
        file_name = self._file_name(test_title, ".cy.ts")
        selectors = self._select_top_selectors(page)

        code = f"""describe('{self._escape_ts_string(test_title)}', () => {{
  it('runs the approved test case', () => {{
    cy.visit(Cypress.env('BASE_URL') || '{self._escape_ts_string(request.generationContext.targetUrl)}');

    // TODO: Review generated steps and adapt test data if needed.
    cy.document().its('title').should('exist');

    // Test case expected result:
    // {self._comment(request.testCase.get("expectedResult", ""))}
  }});
}});
"""

        return GeneratedAutomationScript(
            fileName=file_name,
            language="typescript",
            code=code,
            explanation="Fake provider generated a Cypress TypeScript skeleton.",
            dependencies=["cypress"],
            setupNotes=[
                "Set Cypress env BASE_URL.",
                "Review selectors and assertions before approval.",
            ],
            selectorsUsed=selectors,
            warnings=[
                "This is a fake provider skeleton. OpenAI script generation will be added in the next step."
            ],
        )

    def _generate_selenium_java(
        self,
        request: GenerateAutomationScriptRequest,
        page: PageInspectionResult,
    ) -> GeneratedAutomationScript:
        test_title = request.testCase.get("title", "GeneratedTest")
        class_name = self._java_class_name(test_title)
        file_name = f"{class_name}.java"
        selectors = self._select_top_selectors(page)

        code = f"""import org.junit.jupiter.api.Test;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;

public class {class_name} {{

    @Test
    public void generatedTest() {{
        WebDriver driver = new ChromeDriver();

        try {{
            String baseUrl = System.getenv().getOrDefault("BASE_URL", "{request.generationContext.targetUrl}");
            driver.get(baseUrl);

            // TODO: Review generated steps and add explicit waits/selectors.
            // Test case expected result:
            // {self._comment(request.testCase.get("expectedResult", ""))}
        }} finally {{
            driver.quit();
        }}
    }}
}}
"""

        return GeneratedAutomationScript(
            fileName=file_name,
            language="java",
            code=code,
            explanation="Fake provider generated a Selenium Java skeleton.",
            dependencies=["selenium-java", "junit-jupiter"],
            setupNotes=[
                "Configure Selenium WebDriver.",
                "Use explicit waits before interacting with elements.",
            ],
            selectorsUsed=selectors,
            warnings=[
                "This is a fake provider skeleton. OpenAI script generation will be added in the next step."
            ],
        )

    def _select_top_selectors(self, page: PageInspectionResult) -> list[SelectorUsed]:
        selectors: list[SelectorUsed] = []

        for item in page.recommendedSelectors[:8]:
            selectors.append(
                SelectorUsed(
                    purpose=item.purpose,
                    selector=item.selector,
                    source=f"page_inspection:{item.strategy}",
                )
            )

        return selectors

    def _file_name(self, title: str, extension: str) -> str:
        base = re.sub(r"[^a-zA-Z0-9]+", "-", title.lower()).strip("-")
        return f"{base or 'generated-test'}{extension}"

    def _python_function_name(self, title: str) -> str:
        base = re.sub(r"[^a-zA-Z0-9]+", "_", title.lower()).strip("_")
        return base or "generated_test"

    def _java_class_name(self, title: str) -> str:
        parts = re.sub(r"[^a-zA-Z0-9]+", " ", title).title().split()
        return "".join(parts) or "GeneratedTest"

    def _escape_ts_string(self, value: str) -> str:
        return str(value).replace("\\", "\\\\").replace("'", "\\'")

    def _comment(self, value: str) -> str:
        return str(value).replace("\n", "\n  // ")
