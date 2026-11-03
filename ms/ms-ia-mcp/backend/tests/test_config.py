import os
from app.config import Settings


def test_config_default_values():
    """Valida los valores por defecto del archivo de configuración."""
    config = Settings()
    assert config.SERVICE_NAME == "ms-ia-mcp"
    assert config.PORT == 8001
    assert "http://localhost:3000" in config.CINEMA_CORE_URL
    assert "http://localhost:3001" in config.MULTIMEDIA_URL
    assert "5678" in config.N8N_WEBHOOK_URL
    assert config.HTTP_TIMEOUT_SECONDS == 5.0
    assert config.AUDIT_INTERVAL_SECONDS == 60


def test_config_env_override(monkeypatch):
    """Valida que las variables de entorno sobrescriban los defaults correctamente."""
    monkeypatch.setenv("GROQ_API_KEY", "custom_test_key_123")
    monkeypatch.setenv("CINEMA_CORE_URL", "http://core-service:3000")
    monkeypatch.setenv("N8N_WEBHOOK_URL", "http://n8n-service:5678/webhook/test")

    custom_config = Settings()
    assert custom_config.GROQ_API_KEY == "custom_test_key_123"
    assert custom_config.CINEMA_CORE_URL == "http://core-service:3000"
    assert custom_config.N8N_WEBHOOK_URL == "http://n8n-service:5678/webhook/test"
