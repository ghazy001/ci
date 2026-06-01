from app.schemas.generation import (
    GenerateTestCasesRequest,
    GeneratedTestCase,
    GeneratedTestCasesPayload,
)


class TestCaseQualityChecker:
    def check(
        self,
        request: GenerateTestCasesRequest,
        payload: GeneratedTestCasesPayload,
    ) -> GeneratedTestCasesPayload:
        warnings: list[str] = list(payload.warnings)
        normalized_cases: list[GeneratedTestCase] = []

        seen_titles: set[str] = set()

        for index, test_case in enumerate(payload.testCases, start=1):
            title_key = test_case.title.strip().lower()

            if not title_key:
                warnings.append(f"Test case #{index} has an empty title and was removed.")
                continue

            if title_key in seen_titles:
                warnings.append(
                    f"Duplicate test case removed: {test_case.title}"
                )
                continue

            seen_titles.add(title_key)

            if not test_case.steps:
                warnings.append(
                    f"Test case '{test_case.title}' has no steps and was removed."
                )
                continue

            cleaned_steps = []

            for step in test_case.steps:
                action = step.action.strip()
                expected = step.expected.strip() if step.expected else None

                if not action:
                    warnings.append(
                        f"An empty action step was removed from test case '{test_case.title}'."
                    )
                    continue

                if not expected:
                    expected = "The system should display the expected behavior according to the work item."

                cleaned_steps.append(
                    step.model_copy(
                        update={
                            "order": len(cleaned_steps) + 1,
                            "action": action,
                            "expected": expected,
                        }
                    )
                )

            if not cleaned_steps:
                warnings.append(
                    f"Test case '{test_case.title}' has no valid steps and was removed."
                )
                continue

            confidence = max(0.0, min(1.0, test_case.confidence))

            normalized_cases.append(
                test_case.model_copy(
                    update={
                        "clientGeneratedId": test_case.clientGeneratedId
                        or f"TC-{index:03d}",
                        "title": test_case.title.strip(),
                        "steps": cleaned_steps,
                        "expectedResult": test_case.expectedResult.strip(),
                        "confidence": confidence,
                    }
                )
            )

        max_cases = request.generationOptions.maxTestCases

        if len(normalized_cases) > max_cases:
            normalized_cases = normalized_cases[:max_cases]
            warnings.append(
                f"Generated test cases were limited to maxTestCases={max_cases}."
            )

        work_item = request.normalizedContent

        if work_item.acceptanceCriteria:
            covered_acceptance = set()

            for test_case in normalized_cases:
                for item in test_case.coverage.acceptanceCriteria:
                    covered_acceptance.add(item.strip().lower())

            if not covered_acceptance:
                warnings.append(
                    "The work item has acceptance criteria, but generated test cases do not explicitly cover them."
                )

        if work_item.businessRules:
            covered_rules = set()

            for test_case in normalized_cases:
                for item in test_case.coverage.businessRules:
                    covered_rules.add(item.strip().lower())

            if not covered_rules:
                warnings.append(
                    "The work item has business rules, but generated test cases do not explicitly cover them."
                )

        return GeneratedTestCasesPayload(
            testCases=normalized_cases,
            warnings=self._unique_warnings(warnings),
        )

    def _unique_warnings(self, warnings: list[str]) -> list[str]:
        seen: set[str] = set()
        result: list[str] = []

        for warning in warnings:
            clean = warning.strip()

            if not clean:
                continue

            key = clean.lower()

            if key in seen:
                continue

            seen.add(key)
            result.append(clean)

        return result