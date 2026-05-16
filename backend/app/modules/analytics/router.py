from fastapi import APIRouter, Depends

from app.common.decorators import require_admin
from app.common.dependencies import DbSession
from app.modules.analytics.schemas import AnalyticsOverview
from app.modules.analytics.service import AnalyticsService

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
    dependencies=[Depends(require_admin)],
)


@router.get(
    "/overview",
    response_model=AnalyticsOverview,
    summary="Skills-intelligence dashboard data (HR only)",
    description=(
        "Aggregate counts across approved profiles: top skills, scarce skills, "
        "allocation breakdown, location distribution, inferred-skill ratio, "
        "and deterministic hiring recommendations derived from the gaps."
    ),
)
async def overview(db: DbSession) -> AnalyticsOverview:
    return await AnalyticsService(db).overview()
