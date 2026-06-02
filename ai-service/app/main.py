from fastapi import FastAPI
from app.core.config import get_settings
from app.api.v1.routes.test_case_generation import router as test_case_generation_router
from app.api.v1.routes.test_case_generation_jobs import (
    router as test_case_generation_jobs_router,
)
from app.api.v1.routes.rag import router as rag_router
from app.api.v1.routes.page_inspection import router as page_inspection_router
from app.api.v1.routes.automation_script_generation import (
    router as automation_script_generation_router,
)
from app.api.v1.routes.automation_script_generation_jobs import (
    router as automation_script_generation_jobs_router,
)

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
)

app.include_router(test_case_generation_router, prefix=settings.api_prefix)
app.include_router(test_case_generation_jobs_router, prefix=settings.api_prefix)
app.include_router(rag_router, prefix=settings.api_prefix)
app.include_router(page_inspection_router, prefix=settings.api_prefix)
app.include_router(automation_script_generation_router, prefix=settings.api_prefix)
app.include_router(automation_script_generation_jobs_router, prefix=settings.api_prefix)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": settings.app_name,
        "env": settings.app_env,
    }
