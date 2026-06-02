from fastapi import APIRouter, HTTPException

from app.schemas.page_inspection import PageInspectionRequest, PageInspectionResult
from app.services.page_inspector import PageInspector

router = APIRouter(prefix="/page-inspection", tags=["page-inspection"])


@router.post("/inspect", response_model=PageInspectionResult)
def inspect_page(payload: PageInspectionRequest) -> PageInspectionResult:
    try:
        inspector = PageInspector()
        return inspector.inspect(
            url=payload.url,
            browser=payload.browser,
            wait_until=payload.waitUntil,
            include_screenshot=payload.includeScreenshot,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"Page inspection failed: {str(error)}",
        )
