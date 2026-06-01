from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, Field


class StrictBaseModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class RagDocumentChunk(StrictBaseModel):
    id: str
    projectId: str
    sourceType: str
    sourceId: Optional[str] = None
    title: Optional[str] = None
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class RagSearchRequest(StrictBaseModel):
    projectId: str
    query: str
    topK: int = 5


class RagSearchResult(StrictBaseModel):
    id: str
    score: float
    sourceType: str
    sourceId: Optional[str] = None
    title: Optional[str] = None
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)