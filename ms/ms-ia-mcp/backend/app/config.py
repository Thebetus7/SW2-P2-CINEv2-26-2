import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    """Configuración del microservicio MS IA-MCP basada en variables de entorno."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Identificación y servidor
    SERVICE_NAME: str = "ms-ia-mcp"
    VERSION: str = "1.3.0"
    HOST: str = "0.0.0.0"
    PORT: int = 8001

    # Credenciales de IA GrokCloud / Groq
    GROQ_API_KEY: str = Field(
        default_factory=lambda: os.getenv("GROQ_API_KEY", "mock_groq_api_key_cinev2")
    )
    GROK_MODEL: str = "grok-beta"
    GROK_BASE_URL: str = "https://api.groq.com/openai/v1"

    # Microservicios Integrados
    CINEMA_CORE_URL: str = Field(
        default_factory=lambda: os.getenv("CINEMA_CORE_URL", "http://localhost:3000")
    )
    MULTIMEDIA_URL: str = Field(
        default_factory=lambda: os.getenv("MULTIMEDIA_URL", "http://localhost:3001")
    )

    # Automatización de Contingencias n8n
    N8N_WEBHOOK_URL: str = Field(
        default_factory=lambda: os.getenv(
            "N8N_WEBHOOK_URL", "http://localhost:5678/webhook/contingency"
        )
    )

    # Parámetros Operativos
    AUDIT_INTERVAL_SECONDS: int = 60
    HTTP_TIMEOUT_SECONDS: float = 5.0
    CIRCUIT_BREAKER_FAIL_THRESHOLD: int = 3
    CIRCUIT_BREAKER_RESET_TIMEOUT_SECONDS: float = 30.0


settings = Settings()
