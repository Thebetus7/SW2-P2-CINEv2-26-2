from app.agent.system_prompt import AUDITOR_SYSTEM_PROMPT, build_audit_prompt


def test_system_prompt():
    """Valida que el system prompt contenga las reglas de negocio e invariantes esenciales."""
    assert "Agente Auditor Comercial" in AUDITOR_SYSTEM_PROMPT
    assert "get_occupancy_metrics" in AUDITOR_SYSTEM_PROMPT
    assert "get_line_analytics" in AUDITOR_SYSTEM_PROMPT
    assert "trigger_n8n_contingency" in AUDITOR_SYSTEM_PROMPT
    assert "TAQUILLA_CONGESTIONADA" in AUDITOR_SYSTEM_PROMPT
    assert "CRITICAL" in AUDITOR_SYSTEM_PROMPT
    assert "SALA_SUBOCUPADA" in AUDITOR_SYSTEM_PROMPT
    assert "WARNING" in AUDITOR_SYSTEM_PROMPT
    assert "confitería" in AUDITOR_SYSTEM_PROMPT  # Prohibición explícita


def test_build_audit_prompt():
    metrics = {
        "line_analytics": {"personCount": 45, "congestionStatus": "CONGESTIONADA"},
        "occupancy_metrics": {"averageOccupancy": 30.0},
    }
    user_prompt = build_audit_prompt(metrics)
    assert "45" in user_prompt
    assert "CONGESTIONADA" in user_prompt
    assert "30.0" in user_prompt
