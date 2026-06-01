from fastapi import APIRouter
from app.schemas.generation import (
    GenerateTestCasesRequest,
    GenerateTestCasesResponse,
)
from app.services.generation_pipeline import TestCaseGenerationPipeline

router = APIRouter(prefix="/test-cases", tags=["test-cases"])


@router.post("/generate", response_model=GenerateTestCasesResponse)
def generate_test_cases(
    payload: GenerateTestCasesRequest,
) -> GenerateTestCasesResponse:
    pipeline = TestCaseGenerationPipeline()
    return pipeline.generate(payload)