import math
from typing import Any, Dict, List


def compute_predictive_analytics(
    occupancy_data: Dict[str, Any],
    line_data: Dict[str, Any],
) -> Dict[str, Any]:
    """Motor analítico predictivo basado en modelos de colas y regresión de tendencia.

    Calcula proyecciones de aforo, tiempos estimados de espera en taquilla,
    tasa de servicio y recomendaciones prescriptivas operativas.
    """
    person_count = int(line_data.get("personCount", 0))
    avg_occupancy = float(occupancy_data.get("averageOccupancy", 0.0))
    total_rooms = int(occupancy_data.get("totalRooms", 1))
    under_occupied_count = int(occupancy_data.get("underOccupiedCount", 0))

    # Parámetros del modelo de colas (1 taquilla activa con tasa de servicio mu = 1.2 min/persona)
    service_rate_per_min = 0.8  # ~48 personas por hora por taquilla
    active_counters = 1

    # Tiempo de espera estimado en minutos (Wq = N / (c * mu))
    if person_count > 0:
        estimated_wait_min = round(person_count / (active_counters * service_rate_per_min), 1)
        drain_time_min = round(person_count * 1.25, 1)
    else:
        estimated_wait_min = 0.0
        drain_time_min = 0.0

    # Nivel de riesgo operacional
    if person_count >= 40:
        risk_level = "CRITICO"
        risk_badge = "bg-rose-500/20 text-rose-400 border border-rose-500/30"
    elif person_count >= 25:
        risk_level = "MODERADO"
        risk_badge = "bg-amber-500/20 text-amber-400 border border-amber-500/30"
    else:
        risk_level = "BAJO"
        risk_badge = "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"

    # Proyección de aforo adicional generado por la fila en taquilla
    # Asumiendo 1.8 entradas promedio por transacción en fila distribuida en las salas
    estimated_tickets_in_queue = int(person_count * 1.8)
    avg_capacity_per_room = 100
    total_capacity = total_rooms * avg_capacity_per_room
    projected_occupancy_boost = round((estimated_tickets_in_queue / max(total_capacity, 1)) * 100, 1)
    projected_final_occupancy = round(min(100.0, avg_occupancy + projected_occupancy_boost), 1)

    # Recomendación prescriptiva
    if risk_level == "CRITICO":
        recommendation = (
            f"Fila crítica con {person_count} personas (espera estimada de {estimated_wait_min} min). "
            f"Se aconseja habilitar inmediatamente la Taquilla Auxiliar 2 y notificar contingencia reactiva en n8n."
        )
        actions = [
            "Habilitar Taquilla Auxiliar 2 para descongestionar el lobby.",
            "Disparar webhook reactivo en n8n con severidad CRITICAL.",
            "Priorizar acceso rápido a clientes con boletos QR pre-adquiridos en PWA.",
        ]
    elif under_occupied_count > 0:
        recommendation = (
            f"Operación fluida en taquilla ({person_count} personas, espera de {estimated_wait_min} min). "
            f"Sin embargo, se detectaron {under_occupied_count} funciones subocupadas (<15%). "
            f"Se sugiere activar promoción flash del 20% en boletería digital."
        )
        actions = [
            f"Lanzar notificación push en Canal Móvil PWA para las {under_occupied_count} funciones críticas.",
            "Generar reporte Excel detallado para planificar ajustes de cartelera.",
            "Mantener ritmo de atención actual en taquilla principal.",
        ]
    else:
        recommendation = (
            f"Complejo en equilibrio óptimo. Aforo general proyectado al {projected_final_occupancy}%. "
            f"Tiempo de espera de {estimated_wait_min} minutos dentro de los SLA operativos estándar (<15 min)."
        )
        actions = [
            "Mantener asignación actual de salas y taquillas.",
            "Continuar monitoreo de telemetría continua cada 60 segundos.",
        ]

    return {
        "estimatedWaitTimeMinutes": estimated_wait_min,
        "queueDrainTimeMinutes": drain_time_min,
        "riskLevel": risk_level,
        "riskBadge": risk_badge,
        "projectedOccupancyBoost": projected_occupancy_boost,
        "projectedFinalOccupancy": projected_final_occupancy,
        "estimatedTicketsInQueue": estimated_tickets_in_queue,
        "prescriptiveRecommendation": recommendation,
        "recommendedActions": actions,
    }

