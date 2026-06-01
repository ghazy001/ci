from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class StrictBaseModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class WorkItemSource(str, Enum):
    MANUAL = "MANUAL"
    JIRA = "JIRA"
    SPEC_DOCUMENT = "SPEC_DOCUMENT"


class TestCaseType(str, Enum):
    FUNCTIONAL = "FUNCTIONAL"
    VALIDATION = "VALIDATION"
    NEGATIVE = "NEGATIVE"
    EDGE_CASE = "EDGE_CASE"
    SECURITY = "SECURITY"
    UI = "UI"
    INTEGRATION = "INTEGRATION"
    REGRESSION = "REGRESSION"


class TestCasePriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class GenerationOptions(StrictBaseModel):
    maxTestCases: int = Field(default=10, ge=1, le=30)
    includePositiveTests: bool = True
    includeNegativeTests: bool = True
    includeEdgeCases: bool = True
    includeSecurityTests: bool = False
    useRag: bool = False
    language: Optional[str] = None


class NormalizedWorkItem(StrictBaseModel):
    type: str
    title: str
    priority: Optional[str] = None
    description: Optional[str] = None
    businessRules: list[str] = Field(default_factory=list)
    acceptanceCriteria: list[str] = Field(default_factory=list)

    # Request-side metadata. This model is not used as the OpenAI response schema.
    extraSections: dict[str, Any] = Field(default_factory=dict)
    extractionMeta: Optional[dict[str, Any]] = None
    sourceDocument: Optional[dict[str, Any]] = None
    jira: Optional[dict[str, Any]] = None


class GenerateTestCasesRequest(StrictBaseModel):
    requestId: str
    tenantId: str
    userId: str
    workItemId: str
    source: WorkItemSource
    normalizedContent: NormalizedWorkItem
    generationOptions: GenerationOptions = Field(default_factory=GenerationOptions)


class TestStep(StrictBaseModel):
    order: int
    action: str
    expected: Optional[str] = None


class TestCaseCoverage(StrictBaseModel):
    acceptanceCriteria: list[str] = Field(default_factory=list)
    businessRules: list[str] = Field(default_factory=list)


class GeneratedTestCase(StrictBaseModel):
    clientGeneratedId: str
    title: str
    type: TestCaseType
    priority: TestCasePriority
    objective: Optional[str] = None
    preconditions: list[str] = Field(default_factory=list)
    steps: list[TestStep]
    expectedResult: str

    # Avoid dict[str, Any] in OpenAI strict response schemas.
    # Use string values to keep the generated schema strict and predictable.
    testData: dict[str, str] = Field(default_factory=dict)

    tags: list[str] = Field(default_factory=list)
    coverage: TestCaseCoverage = Field(default_factory=TestCaseCoverage)
    confidence: float = Field(default=0.85, ge=0, le=1)


class GenerateTestCasesResponse(StrictBaseModel):
    requestId: str
    workItemId: str
    provider: str
    model: str
    promptVersion: str
    generationMethod: str
    confidence: float = Field(ge=0, le=1)
    warnings: list[str] = Field(default_factory=list)
    testCases: list[GeneratedTestCase]


class GeneratedTestCasesPayload(StrictBaseModel):
    testCases: list[GeneratedTestCase]
    warnings: list[str] = Field(default_factory=list)

class CreateGenerationJobResponse(StrictBaseModel):
    jobId: str
    status: str


class GenerationJobStatusResponse(StrictBaseModel):
    jobId: str
    status: str
    ready: bool
    successful: bool | None = None
    result: GenerateTestCasesResponse | None = None
    error: str | None = None