import json

from app.schemas.page_inspection import PageInspectionResult
from app.schemas.script_generation import GenerateAutomationScriptRequest


class AutomationScriptPromptBuilder:
    def build_system_prompt(self) -> str:
        return """
You are a senior test automation engineer working inside a professional AI QA SaaS platform.

Your task is to generate a high-quality automation script from:
- one approved manual test case
- its related work item context
- real page inspection data extracted with Playwright
- the tester's script generation context

Hard rules:
- Generate only one complete automation script.
- Do not invent elements that are not present in the page inspection data unless the test case clearly requires them.
- Prefer stable selectors from pageInspection.recommendedSelectors.
- Prefer role, label, placeholder, and test id selectors before CSS.
- Do not hardcode real credentials, tokens, or secrets.
- If authentication is required, use environment variables and setup notes.
- The generated script must match the selected framework exactly.
- The script must be executable after reasonable project setup.
- Include imports.
- Include clear test name.
- Include assertions for the expected result.
- Include comments only when useful.
- Do not include markdown fences.
- Return only the structured JSON payload requested by the schema.

Framework-specific rules:
- PLAYWRIGHT_TS: use @playwright/test, test(), expect(), page.getByRole/getByLabel/getByPlaceholder/getByTestId when possible.
- PLAYWRIGHT_PYTHON: use playwright.sync_api Page and expect.
- CYPRESS_TS: use describe(), it(), cy.visit(), cy.contains(), cy.get(), and Cypress.env().
- SELENIUM_JAVA: use JUnit 5, Selenium WebDriver, WebDriverWait, ExpectedConditions, and avoid Thread.sleep.
""".strip()

    def build_user_prompt(
        self,
        request: GenerateAutomationScriptRequest,
        page_inspection: PageInspectionResult,
    ) -> str:
        payload = {
            "testCase": request.testCase,
            "workItem": request.workItem,
            "generationContext": request.generationContext.model_dump(mode="json"),
            "pageInspection": page_inspection.model_dump(mode="json"),
            "outputRequirements": {
                "mustReturn": {
                    "fileName": "framework-specific file name",
                    "language": "typescript | python | java",
                    "code": "complete automation script code only",
                    "explanation": "short explanation",
                    "dependencies": ["required packages"],
                    "setupNotes": ["how to run safely"],
                    "selectorsUsed": [
                        {
                            "purpose": "what the selector is used for",
                            "selector": "actual selector used in the script",
                            "source": "page_inspection | inferred_from_test_case",
                        }
                    ],
                    "warnings": ["generation warnings if any"],
                }
            },
        }

        return f"""
Generate an automation script for the approved test case using the selected framework.

Input:
{json.dumps(payload, ensure_ascii=False, indent=2)}
""".strip()
