from celery.result import AsyncResult
from fastapi import APIRouter

from app.celery_app import celery_app
from app.schemas.script_generation import (
    AutomationScriptJobStatusResponse,
    CreateAutomationScriptJobResponse,
    GenerateAutomationScriptRequest,
    GenerateAutomationScriptResponse,
)
from app.tasks.automation_script_generation_tasks import (
    generate_automation_script_task,
)

router = APIRouter(
    prefix="/automation-script-generations",
    tags=["automation-script-generations"],
)


@router.post("/jobs", response_model=CreateAutomationScriptJobResponse)
def create_automation_script_generation_job(
    payload: GenerateAutomationScriptRequest,
) -> CreateAutomationScriptJobResponse:
    task = generate_automation_script_task.delay(payload.model_dump(mode="json"))

    return CreateAutomationScriptJobResponse(
        jobId=task.id,
        status="PENDING",
    )


@router.get("/jobs/{job_id}", response_model=AutomationScriptJobStatusResponse)
def get_automation_script_generation_job_status(
    job_id: str,
) -> AutomationScriptJobStatusResponse:
    result = AsyncResult(job_id, app=celery_app)

    status = result.status
    ready = result.ready()

    if not ready:
        return AutomationScriptJobStatusResponse(
            jobId=job_id,
            status=status,
            ready=False,
            successful=None,
            result=None,
            error=None,
        )

    if result.successful():
        payload = GenerateAutomationScriptResponse.model_validate(result.result)

        return AutomationScriptJobStatusResponse(
            jobId=job_id,
            status=status,
            ready=True,
            successful=True,
            result=payload,
            error=None,
        )

    return AutomationScriptJobStatusResponse(
        jobId=job_id,
        status=status,
        ready=True,
        successful=False,
        result=None,
        error=str(result.result),
    )
