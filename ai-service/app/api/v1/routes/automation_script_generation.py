from fastapi import APIRouter, HTTPException

from app.schemas.script_generation import (
    GenerateAutomationScriptRequest,
    GenerateAutomationScriptResponse,
)
from app.services.script_generation_pipeline import AutomationScriptGenerationPipeline

router = APIRouter(prefix="/automation-scripts", tags=["automation-scripts"])


@router.post("/generate", response_model=GenerateAutomationScriptResponse)
def generate_automation_script(
    payload: GenerateAutomationScriptRequest,
) -> GenerateAutomationScriptResponse:
    try:
        pipeline = AutomationScriptGenerationPipeline()
        return pipeline.generate(payload)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"Automation script generation failed: {str(error)}",
        )