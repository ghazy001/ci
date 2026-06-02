from celery.result import AsyncResult
from fastapi import APIRouter

from app.celery_app import celery_app
from app.schemas.generation import (
    CreateGenerationJobResponse,
    GenerateTestCasesRequest,
    GenerateTestCasesResponse,
    GenerationJobStatusResponse,
)
from app.tasks.test_case_generation_tasks import generate_test_cases_task

router = APIRouter(prefix="/test-case-generations", tags=["test-case-generations"])


@router.post("/jobs", response_model=CreateGenerationJobResponse)
def create_generation_job(
    payload: GenerateTestCasesRequest,
) -> CreateGenerationJobResponse:
    task = generate_test_cases_task.delay(payload.model_dump(mode="json"))

    return CreateGenerationJobResponse(
        jobId=task.id,
        status="PENDING",
    )


@router.get("/jobs/{job_id}", response_model=GenerationJobStatusResponse)
def get_generation_job_status(job_id: str) -> GenerationJobStatusResponse:
    result = AsyncResult(job_id, app=celery_app)

    status = result.status
    ready = result.ready()

    if not ready:
        return GenerationJobStatusResponse(
            jobId=job_id,
            status=status,
            ready=False,
            successful=None,
            result=None,
            error=None,
        )

    if result.successful():
        payload = GenerateTestCasesResponse.model_validate(result.result)

        return GenerationJobStatusResponse(
            jobId=job_id,
            status=status,
            ready=True,
            successful=True,
            result=payload,
            error=None,
        )

    return GenerationJobStatusResponse(
        jobId=job_id,
        status=status,
        ready=True,
        successful=False,
        result=None,
        error=str(result.result),
    )
