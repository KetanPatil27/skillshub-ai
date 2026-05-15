import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from app.common.filters import register_exception_handlers
from app.common.middleware import RequestIdMiddleware
from app.core.config import settings
from app.modules.auth.router import router as auth_router
from app.modules.employees.router import router as employees_router
from app.modules.resumes.router import router as resumes_router
from app.modules.review.router import router as review_router
from app.modules.search.router import router as search_router
from app.modules.users.router import router as users_router

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.getLogger("skillshub").info(
        "Starting %s (env=%s)", settings.APP_NAME, settings.APP_ENV
    )
    yield


app = FastAPI(
    title=f"{settings.APP_NAME} API",
    description=(
        "Skills intelligence platform for software companies. AI-powered resume "
        "extraction and natural-language search."
    ),
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["x-request-id"],
)
app.add_middleware(RequestIdMiddleware)

register_exception_handlers(app)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(employees_router)
app.include_router(resumes_router)
app.include_router(review_router)
app.include_router(search_router)


@app.get("/", tags=["Meta"], summary="Health check")
async def health() -> dict:
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.APP_ENV}


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    schema.setdefault("components", {}).setdefault("securitySchemes", {})["BearerAuth"] = {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
    }
    for path in schema.get("paths", {}).values():
        for op in path.values():
            if isinstance(op, dict) and op.get("tags") and op["tags"][0] != "Auth" and op["tags"][0] != "Meta":
                op.setdefault("security", [{"BearerAuth": []}])
    app.openapi_schema = schema
    return schema


app.openapi = custom_openapi
