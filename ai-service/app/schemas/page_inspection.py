from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class StrictBaseModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ElementSelectors(StrictBaseModel):
    role: Optional[str] = None
    label: Optional[str] = None
    placeholder: Optional[str] = None
    testId: Optional[str] = None
    css: Optional[str] = None


class InspectedInput(StrictBaseModel):
    label: Optional[str] = None
    type: Optional[str] = None
    name: Optional[str] = None
    placeholder: Optional[str] = None
    required: bool = False
    disabled: bool = False
    value: Optional[str] = None
    selectors: ElementSelectors = Field(default_factory=ElementSelectors)


class InspectedButton(StrictBaseModel):
    text: Optional[str] = None
    type: Optional[str] = None
    disabled: bool = False
    selectors: ElementSelectors = Field(default_factory=ElementSelectors)


class InspectedLink(StrictBaseModel):
    text: Optional[str] = None
    href: Optional[str] = None
    selectors: ElementSelectors = Field(default_factory=ElementSelectors)


class InspectedForm(StrictBaseModel):
    action: Optional[str] = None
    method: Optional[str] = None
    inputs: list[str] = Field(default_factory=list)
    buttons: list[str] = Field(default_factory=list)


class RecommendedSelector(StrictBaseModel):
    purpose: str
    selector: str
    strategy: str
    confidence: float = Field(ge=0, le=1)


class PageInspectionRequest(StrictBaseModel):
    url: str
    browser: Optional[str] = "CHROMIUM"
    waitUntil: Optional[str] = None
    includeScreenshot: bool = False


class PageInspectionResult(StrictBaseModel):
    url: str
    finalUrl: str
    title: Optional[str] = None

    visibleText: list[str] = Field(default_factory=list)
    inputs: list[InspectedInput] = Field(default_factory=list)
    buttons: list[InspectedButton] = Field(default_factory=list)
    links: list[InspectedLink] = Field(default_factory=list)
    forms: list[InspectedForm] = Field(default_factory=list)

    recommendedSelectors: list[RecommendedSelector] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)

    screenshotBase64: Optional[str] = None
