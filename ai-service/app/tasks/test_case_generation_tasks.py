from celery.utils.log import get_task_logger

from app.celery_app import celery_app
from app.schemas.generation import (
    GenerateTestCasesRequest,
    GenerateTestCasesResponse,
)
from app.services.generation_pipeline import TestCaseGenerationPipeline

logger = get_task_logger(__name__)


@celery_app.task(name="generate_test_cases_task", bind=True)
def generate_test_cases_task(self, payload: dict):
    try:
        request = GenerateTestCasesRequest.model_validate(payload)

        pipeline = TestCaseGenerationPipeline()
        response: GenerateTestCasesResponse = pipeline.generate(request)

        return response.model_dump(mode="json")

    except Exception as error:
        logger.exception("Test case generation task failed")
        raise error