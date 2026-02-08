from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "EXIMUNI Debit Note System"
    DEBUG: bool = True

    DATABASE_URL: str = "postgresql+asyncpg://eximuni:eximuni_pass@db:5432/eximuni_db"
    DATABASE_URL_SYNC: str = "postgresql://eximuni:eximuni_pass@db:5432/eximuni_db"

    REDIS_URL: str = "redis://redis:6379/0"

    class Config:
        env_file = ".env"


settings = Settings()
