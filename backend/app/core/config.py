from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    APP_PORT: int = 8000
    APP_ENV: str = "development"
    APP_NAME: str = "SkillsHub"
    LOG_LEVEL: str = "INFO"

    DATABASE_URL: str
    DATABASE_URL_SYNC: str | None = None

    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 1440

    SUPABASE_URL: str | None = None
    SUPABASE_ANON_KEY: str | None = None
    SUPABASE_SERVICE_ROLE_KEY: str | None = None
    SUPABASE_STORAGE_BUCKET: str = "resumes"

    GOOGLE_API_KEY: str
    GEMINI_MODEL_SHOWCASE: str = "gemini-2.5-pro"
    GEMINI_MODEL_LIGHT: str = "gemini-2.5-flash"

    # Hugging Face — primary AI provider
    HUGGINGFACEHUB_API_TOKEN: str | None = None
    HF_MODEL_ID: str = "meta-llama/Llama-3.1-8B-Instruct"  # default chat/search

    # Dedicated models for structured JSON resume extraction (higher quality)
    HF_RESUME_MODEL: str = "meta-llama/Llama-3.1-8B-Instruct"
    HF_RESUME_FALLBACK_MODEL: str = "meta-llama/Llama-3.1-8B-Instruct"

    CORS_ORIGINS: str = "http://localhost:3000"

    SEED_HR_EMAIL: str = "hr@skillshub.demo"
    SEED_HR_PASSWORD: str = "demo123"
    SEED_EMP_EMAIL: str = "ravi@skillshub.demo"
    SEED_EMP_PASSWORD: str = "demo123"

    # Account creation
    HR_INVITE_CODE: str = "SKILLSHUB-HR-2026"
    ALLOW_EMPLOYEE_SIGNUP: bool = True
    ALLOW_HR_SIGNUP: bool = True
    PASSWORD_MIN_LENGTH: int = 8

    # Auth rate limiting (per IP, sliding minute window)
    AUTH_RATE_LIMIT_PER_MINUTE: int = 10

    @field_validator("CORS_ORIGINS")
    @classmethod
    def _strip_origins(cls, v: str) -> str:
        return v.strip()

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
