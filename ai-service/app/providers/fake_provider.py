from app.schemas.generation import (
    GenerateTestCasesRequest,
    GeneratedTestCase,
    TestCaseCoverage,
    TestCasePriority,
    TestCaseType,
    TestStep,
)


class FakeTestCaseProvider:
    provider_name = "fake"
    model_name = "fake-test-case-model"

    def generate(
        self,
        request: GenerateTestCasesRequest,
        retrieved_context=None,
    ) -> list[GeneratedTestCase]:
        item = request.normalizedContent
        options = request.generationOptions

        test_cases: list[GeneratedTestCase] = []

        test_cases.append(
            GeneratedTestCase(
                clientGeneratedId="TC-001",
                title=f"Verify main behavior: {item.title}",
                type=TestCaseType.FUNCTIONAL,
                priority=TestCasePriority.HIGH,
                objective=f"Validate that the work item '{item.title}' works according to its description.",
                preconditions=[
                    "The application is accessible",
                    "The user has the required permissions",
                ],
                steps=[
                    TestStep(
                        order=1,
                        action="Open the related feature or page",
                        expected="The feature or page is displayed successfully",
                    ),
                    TestStep(
                        order=2,
                        action="Perform the main action described in the work item",
                        expected="The system processes the action successfully",
                    ),
                    TestStep(
                        order=3,
                        action="Verify the final result",
                        expected="The result matches the acceptance criteria",
                    ),
                ],
                expectedResult="The feature behaves according to the work item description and acceptance criteria.",
                testData={},
                tags=["generated", "functional"],
                coverage=TestCaseCoverage(
                    acceptanceCriteria=item.acceptanceCriteria[:2],
                    businessRules=item.businessRules[:2],
                ),
                confidence=0.75,
            )
        )

        if options.includeNegativeTests:
            test_cases.append(
                GeneratedTestCase(
                    clientGeneratedId="TC-002",
                    title=f"Validate error handling: {item.title}",
                    type=TestCaseType.NEGATIVE,
                    priority=TestCasePriority.MEDIUM,
                    objective="Verify that the system handles invalid or missing input correctly.",
                    preconditions=[
                        "The application is accessible",
                    ],
                    steps=[
                        TestStep(
                            order=1,
                            action="Open the related feature or page",
                            expected="The feature or page is displayed successfully",
                        ),
                        TestStep(
                            order=2,
                            action="Submit invalid or incomplete information",
                            expected="The system prevents the action and displays a clear error message",
                        ),
                    ],
                    expectedResult="The system does not accept invalid input and displays a clear validation message.",
                    testData={},
                    tags=["generated", "negative"],
                    coverage=TestCaseCoverage(
                        acceptanceCriteria=item.acceptanceCriteria,
                        businessRules=item.businessRules,
                    ),
                    confidence=0.7,
                )
            )

        return test_cases[: options.maxTestCases]
