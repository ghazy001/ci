from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.page_inspection import PageInspectionResult


class StrictBaseModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AutomationFramework(str, Enum):
    PLAYWRIGHT_TS = "PLAYWRIGHT_TS"
    PLAYWRIGHT_PYTHON = "PLAYWRIGHT_PYTHON"
    CYPRESS_TS = "CYPRESS_TS"
    SELENIUM_JAVA = "SELENIUM_JAVA"


class BrowserTarget(str, Enum):
    CHROMIUM = "CHROMIUM"
    FIREFOX = "FIREFOX"
    WEBKIT = "WEBKIT"
    CHROME = "CHROME"
    EDGE = "EDGE"


class ScriptAuthContext(StrictBaseModel):
    required: bool = False
    role: Optional[str] = None
    instructions: Optional[str] = None


class ScriptGenerationContext(StrictBaseModel):
    framework: AutomationFramework
    targetUrl: str
    browser: Optional[BrowserTarget] = BrowserTarget.CHROMIUM
    environment: Optional[str] = None
    selectorsStrategy: Optional[str] = "AUTO"
    auth: ScriptAuthContext = Field(default_factory=ScriptAuthContext)
    extraInstructions: Optional[str] = None
    variables: dict[str, str] = Field(default_factory=dict)


class GenerateAutomationScriptRequest(StrictBaseModel):
    requestId: str
    tenantId: str
    userId: str

    testCaseId: str
    workItemId: str

    testCase: dict[str, Any]
    workItem: dict[str, Any]

    generationContext: ScriptGenerationContext


class SelectorUsed(StrictBaseModel):
    purpose: str
    selector: str
    source: str


class GeneratedAutomationScript(StrictBaseModel):
    fileName: str
    language: str
    code: str
    explanation: Optional[str] = None
    dependencies: list[str] = Field(default_factory=list)
    setupNotes: list[str] = Field(default_factory=list)
    selectorsUsed: list[SelectorUsed] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class GenerateAutomationScriptResponse(StrictBaseModel):
    requestId: str
    testCaseId: str
    workItemId: str

    provider: str
    model: str
    promptVersion: str
    generationMethod: str
    confidence: float = Field(ge=0, le=1)

    warnings: list[str] = Field(default_factory=list)
    pageInspection: Optional[PageInspectionResult] = None

    script: GeneratedAutomationScript

    
class CreateAutomationScriptJobResponse(StrictBaseModel):
    jobId: str
    status: str


class AutomationScriptJobStatusResponse(StrictBaseModel):
    jobId: str
    status: str
    ready: bool
    successful: bool | None = None
    result: GenerateAutomationScriptResponse | None = None
    error: str | None = None