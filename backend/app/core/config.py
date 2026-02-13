from urllib.parse import quote_plus

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "EXIMUNI ERP System"
    DEBUG: bool = True

    # --- PostgreSQL (신규 ERP 테이블 — Docker 내부) ---
    DATABASE_URL: str = "postgresql+asyncpg://eximuni:eximuni_pass@db:5432/eximuni_db"
    DATABASE_URL_SYNC: str = "postgresql://eximuni:eximuni_pass@db:5432/eximuni_db"

    # --- MSSQL (기존 운영 데이터 — AWS 외부) ---
    MSSQL_SERVER: str = "54.180.220.143"
    MSSQL_DATABASE: str = "UNI_DebitNote"
    MSSQL_USER: str = ""
    MSSQL_PASSWORD: str = ""
    MSSQL_DRIVER: str = "ODBC Driver 18 for SQL Server"

    @property
    def MSSQL_URL(self) -> str:
        """pyodbc 연결 문자열 — 특수문자(@, ; 등) URL 인코딩 처리"""
        return (
            f"mssql+pyodbc://{quote_plus(self.MSSQL_USER)}:{quote_plus(self.MSSQL_PASSWORD)}"
            f"@{self.MSSQL_SERVER}/{self.MSSQL_DATABASE}"
            f"?driver={self.MSSQL_DRIVER}&TrustServerCertificate=yes&Encrypt=optional"
        )

    # --- Redis ---
    REDIS_URL: str = "redis://redis:6379/0"

    # --- Microsoft Azure AD (MSAL SSO) ---
    AZURE_CLIENT_ID: str = ""
    AZURE_TENANT_ID: str = ""
    AZURE_CLIENT_SECRET: str = ""

    @property
    def AZURE_AUTHORITY(self) -> str:
        return f"https://login.microsoftonline.com/{self.AZURE_TENANT_ID}"

    @property
    def AZURE_ISSUER(self) -> str:
        return f"https://sts.windows.net/{self.AZURE_TENANT_ID}/"

    # --- JWT (MSAL 토큰 검증용, 기존 호환) ---
    JWT_SECRET_KEY: str = "eximuni-debit-note-secret-key-change-in-production-2026"
    JWT_ALGORITHM: str = "HS256"

    class Config:
        env_file = ".env"


settings = Settings()
