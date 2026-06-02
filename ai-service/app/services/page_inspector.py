import base64
import re
from urllib.parse import urljoin

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright

from app.core.config import get_settings
from app.schemas.page_inspection import (
    ElementSelectors,
    InspectedButton,
    InspectedForm,
    InspectedInput,
    InspectedLink,
    PageInspectionResult,
    RecommendedSelector,
)
from app.services.url_safety import validate_inspection_url


class PageInspector:
    def __init__(self) -> None:
        self.settings = get_settings()

    def inspect(
        self,
        url: str,
        browser: str | None = "CHROMIUM",
        wait_until: str | None = None,
        include_screenshot: bool = False,
    ) -> PageInspectionResult:
        validate_inspection_url(
            url,
            allow_private=self.settings.page_inspection_allow_private_urls,
        )

        warnings: list[str] = []
        wait_until_value = wait_until or self.settings.page_inspection_wait_until

        with sync_playwright() as p:
            browser_instance = p.chromium.launch(headless=True)

            context = browser_instance.new_context(
                viewport={"width": 1440, "height": 1000},
                ignore_https_errors=True,
            )

            page = context.new_page()

            try:
                page.goto(
                    url,
                    wait_until=wait_until_value,
                    timeout=self.settings.page_inspection_timeout_ms,
                )
            except PlaywrightTimeoutError:
                warnings.append(
                    f"Page load timed out using waitUntil='{wait_until_value}'. Retrying with domcontentloaded."
                )
                page.goto(
                    url,
                    wait_until="domcontentloaded",
                    timeout=self.settings.page_inspection_timeout_ms,
                )

            try:
                page.wait_for_timeout(1000)
            except Exception:
                pass

            final_url = page.url
            title = page.title()

            visible_text = self._extract_visible_text(page)
            inputs = self._extract_inputs(page)
            buttons = self._extract_buttons(page)
            links = self._extract_links(page, final_url)
            forms = self._extract_forms(page)
            recommended = self._build_recommended_selectors(inputs, buttons, links)

            screenshot_base64 = None

            if include_screenshot:
                try:
                    screenshot_bytes = page.screenshot(full_page=True)
                    screenshot_base64 = base64.b64encode(screenshot_bytes).decode(
                        "utf-8"
                    )
                except Exception as error:
                    warnings.append(f"Screenshot capture failed: {str(error)}")

            context.close()
            browser_instance.close()

        return PageInspectionResult(
            url=url,
            finalUrl=final_url,
            title=title,
            visibleText=visible_text,
            inputs=inputs,
            buttons=buttons,
            links=links,
            forms=forms,
            recommendedSelectors=recommended,
            warnings=warnings,
            screenshotBase64=screenshot_base64,
        )

    def _extract_visible_text(self, page) -> list[str]:
        max_items = self.settings.page_inspection_max_text_items

        texts = page.locator("body *:visible").evaluate_all(
            """
            elements => elements
              .map(el => (el.innerText || el.textContent || '').trim())
              .filter(Boolean)
              .flatMap(text => text.split('\\n'))
              .map(text => text.trim())
              .filter(text => text.length > 1 && text.length < 300)
            """
        )

        return self._unique(texts)[:max_items]

    def _extract_inputs(self, page) -> list[InspectedInput]:
        max_elements = self.settings.page_inspection_max_elements

        raw_inputs = page.locator(
            "input:visible, textarea:visible, select:visible"
        ).evaluate_all(
            """
            elements => elements.map((el, index) => {
              const id = el.getAttribute('id');
              const name = el.getAttribute('name');
              const type = el.getAttribute('type') || el.tagName.toLowerCase();
              const placeholder = el.getAttribute('placeholder');
              const ariaLabel = el.getAttribute('aria-label');
              const dataTestId = el.getAttribute('data-testid') || el.getAttribute('data-test-id');
              const required = el.required || el.getAttribute('aria-required') === 'true';
              const disabled = el.disabled || el.getAttribute('aria-disabled') === 'true';
              const value = el.value || null;

              let label = ariaLabel;

              if (!label && id) {
                const labelEl = document.querySelector(`label[for="${CSS.escape(id)}"]`);
                if (labelEl) label = labelEl.innerText.trim();
              }

              if (!label) {
                const parentLabel = el.closest('label');
                if (parentLabel) label = parentLabel.innerText.trim();
              }

              return {
                index,
                tagName: el.tagName.toLowerCase(),
                id,
                name,
                type,
                placeholder,
                label,
                dataTestId,
                required,
                disabled,
                value
              };
            })
            """
        )

        result: list[InspectedInput] = []

        for item in raw_inputs[:max_elements]:
            selectors = self._selectors_for_input(item)

            result.append(
                InspectedInput(
                    label=self._clean_text(item.get("label")),
                    type=item.get("type"),
                    name=item.get("name"),
                    placeholder=self._clean_text(item.get("placeholder")),
                    required=bool(item.get("required")),
                    disabled=bool(item.get("disabled")),
                    value=item.get("value"),
                    selectors=selectors,
                )
            )

        return result

    def _extract_buttons(self, page) -> list[InspectedButton]:
        max_elements = self.settings.page_inspection_max_elements

        raw_buttons = page.locator(
            "button:visible, input[type='button']:visible, input[type='submit']:visible, [role='button']:visible"
        ).evaluate_all(
            """
            elements => elements.map((el, index) => {
              const text = (el.innerText || el.value || el.getAttribute('aria-label') || '').trim();
              const type = el.getAttribute('type');
              const id = el.getAttribute('id');
              const name = el.getAttribute('name');
              const dataTestId = el.getAttribute('data-testid') || el.getAttribute('data-test-id');
              const disabled = el.disabled || el.getAttribute('aria-disabled') === 'true';

              return { index, text, type, id, name, dataTestId, disabled };
            })
            """
        )

        result: list[InspectedButton] = []

        for item in raw_buttons[:max_elements]:
            selectors = self._selectors_for_action_element(
                item,
                role="button",
                text=item.get("text"),
            )

            result.append(
                InspectedButton(
                    text=self._clean_text(item.get("text")),
                    type=item.get("type"),
                    disabled=bool(item.get("disabled")),
                    selectors=selectors,
                )
            )

        return result

    def _extract_links(self, page, base_url: str) -> list[InspectedLink]:
        max_elements = self.settings.page_inspection_max_elements

        raw_links = page.locator("a:visible").evaluate_all(
            """
            elements => elements.map((el, index) => {
              const text = (el.innerText || el.getAttribute('aria-label') || '').trim();
              const href = el.getAttribute('href');
              const id = el.getAttribute('id');
              const dataTestId = el.getAttribute('data-testid') || el.getAttribute('data-test-id');

              return { index, text, href, id, dataTestId };
            })
            """
        )

        result: list[InspectedLink] = []

        for item in raw_links[:max_elements]:
            href = item.get("href")
            absolute_href = urljoin(base_url, href) if href else None

            selectors = self._selectors_for_action_element(
                item,
                role="link",
                text=item.get("text"),
            )

            result.append(
                InspectedLink(
                    text=self._clean_text(item.get("text")),
                    href=absolute_href,
                    selectors=selectors,
                )
            )

        return result

    def _extract_forms(self, page) -> list[InspectedForm]:
        raw_forms = page.locator("form").evaluate_all(
            """
            forms => forms.map(form => {
              const action = form.getAttribute('action');
              const method = form.getAttribute('method') || 'get';

              const inputs = Array.from(form.querySelectorAll('input, textarea, select'))
                .map(el => {
                  const id = el.getAttribute('id');
                  const name = el.getAttribute('name');
                  const placeholder = el.getAttribute('placeholder');
                  const ariaLabel = el.getAttribute('aria-label');

                  let label = ariaLabel;

                  if (!label && id) {
                    const labelEl = document.querySelector(`label[for="${CSS.escape(id)}"]`);
                    if (labelEl) label = labelEl.innerText.trim();
                  }

                  return label || placeholder || name || id || el.tagName.toLowerCase();
                })
                .filter(Boolean);

              const buttons = Array.from(form.querySelectorAll('button, input[type="submit"], input[type="button"]'))
                .map(el => (el.innerText || el.value || el.getAttribute('aria-label') || '').trim())
                .filter(Boolean);

              return { action, method, inputs, buttons };
            })
            """
        )

        return [
            InspectedForm(
                action=item.get("action"),
                method=item.get("method"),
                inputs=self._unique(item.get("inputs") or []),
                buttons=self._unique(item.get("buttons") or []),
            )
            for item in raw_forms
        ]

    def _selectors_for_input(self, item: dict) -> ElementSelectors:
        label = self._clean_text(item.get("label"))
        placeholder = self._clean_text(item.get("placeholder"))
        data_test_id = item.get("dataTestId")
        name = item.get("name")
        element_id = item.get("id")
        input_type = item.get("type")

        role_selector = None

        if label:
            role_selector = f"page.getByLabel('{self._escape_selector_text(label)}')"

        css_selector = None

        if data_test_id:
            css_selector = f"[data-testid='{self._escape_css_value(data_test_id)}']"
        elif name:
            css_selector = (
                f"{item.get('tagName', 'input')}[name='{self._escape_css_value(name)}']"
            )
        elif element_id:
            css_selector = f"#{self._escape_css_value(element_id)}"
        elif input_type:
            css_selector = f"input[type='{self._escape_css_value(input_type)}']"

        return ElementSelectors(
            role=role_selector,
            label=role_selector,
            placeholder=(
                f"page.getByPlaceholder('{self._escape_selector_text(placeholder)}')"
                if placeholder
                else None
            ),
            testId=(
                f"page.getByTestId('{self._escape_selector_text(data_test_id)}')"
                if data_test_id
                else None
            ),
            css=css_selector,
        )

    def _selectors_for_action_element(
        self,
        item: dict,
        role: str,
        text: str | None,
    ) -> ElementSelectors:
        clean_text = self._clean_text(text)
        data_test_id = item.get("dataTestId")
        element_id = item.get("id")
        name = item.get("name")

        role_selector = (
            f"page.getByRole('{role}', {{ name: '{self._escape_selector_text(clean_text)}' }})"
            if clean_text
            else None
        )

        css_selector = None

        if data_test_id:
            css_selector = f"[data-testid='{self._escape_css_value(data_test_id)}']"
        elif element_id:
            css_selector = f"#{self._escape_css_value(element_id)}"
        elif name:
            css_selector = f"[name='{self._escape_css_value(name)}']"

        return ElementSelectors(
            role=role_selector,
            testId=(
                f"page.getByTestId('{self._escape_selector_text(data_test_id)}')"
                if data_test_id
                else None
            ),
            css=css_selector,
        )

    def _build_recommended_selectors(
        self,
        inputs: list[InspectedInput],
        buttons: list[InspectedButton],
        links: list[InspectedLink],
    ) -> list[RecommendedSelector]:
        recommended: list[RecommendedSelector] = []

        for input_item in inputs:
            purpose = (
                input_item.label or input_item.placeholder or input_item.name or "Input"
            )

            if input_item.selectors.label:
                recommended.append(
                    RecommendedSelector(
                        purpose=purpose,
                        selector=input_item.selectors.label,
                        strategy="label",
                        confidence=0.95,
                    )
                )
            elif input_item.selectors.placeholder:
                recommended.append(
                    RecommendedSelector(
                        purpose=purpose,
                        selector=input_item.selectors.placeholder,
                        strategy="placeholder",
                        confidence=0.85,
                    )
                )
            elif input_item.selectors.testId:
                recommended.append(
                    RecommendedSelector(
                        purpose=purpose,
                        selector=input_item.selectors.testId,
                        strategy="testId",
                        confidence=0.9,
                    )
                )
            elif input_item.selectors.css:
                recommended.append(
                    RecommendedSelector(
                        purpose=purpose,
                        selector=input_item.selectors.css,
                        strategy="css",
                        confidence=0.65,
                    )
                )

        for button in buttons:
            purpose = button.text or "Button"

            if button.selectors.role:
                recommended.append(
                    RecommendedSelector(
                        purpose=purpose,
                        selector=button.selectors.role,
                        strategy="role",
                        confidence=0.95,
                    )
                )
            elif button.selectors.testId:
                recommended.append(
                    RecommendedSelector(
                        purpose=purpose,
                        selector=button.selectors.testId,
                        strategy="testId",
                        confidence=0.9,
                    )
                )
            elif button.selectors.css:
                recommended.append(
                    RecommendedSelector(
                        purpose=purpose,
                        selector=button.selectors.css,
                        strategy="css",
                        confidence=0.65,
                    )
                )

        for link in links:
            purpose = link.text or "Link"

            if link.selectors.role:
                recommended.append(
                    RecommendedSelector(
                        purpose=purpose,
                        selector=link.selectors.role,
                        strategy="role",
                        confidence=0.95,
                    )
                )
            elif link.selectors.testId:
                recommended.append(
                    RecommendedSelector(
                        purpose=purpose,
                        selector=link.selectors.testId,
                        strategy="testId",
                        confidence=0.9,
                    )
                )
            elif link.selectors.css:
                recommended.append(
                    RecommendedSelector(
                        purpose=purpose,
                        selector=link.selectors.css,
                        strategy="css",
                        confidence=0.65,
                    )
                )

        return recommended[: self.settings.page_inspection_max_elements]

    def _clean_text(self, value: str | None) -> str | None:
        if not value:
            return None

        cleaned = re.sub(r"\s+", " ", value).strip()

        return cleaned or None

    def _unique(self, values: list[str]) -> list[str]:
        seen: set[str] = set()
        result: list[str] = []

        for value in values:
            cleaned = self._clean_text(value)

            if not cleaned:
                continue

            key = cleaned.lower()

            if key in seen:
                continue

            seen.add(key)
            result.append(cleaned)

        return result

    def _escape_selector_text(self, value: str | None) -> str:
        if not value:
            return ""

        return value.replace("\\", "\\\\").replace("'", "\\'")

    def _escape_css_value(self, value: str | None) -> str:
        if not value:
            return ""

        return value.replace("\\", "\\\\").replace("'", "\\'")
