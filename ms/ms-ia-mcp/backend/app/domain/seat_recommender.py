"""Motor de recomendación de butacas centrales con visibilidad óptima.

Calcula el centro geométrico de la matriz de la sala y asigna puntuaciones
de distancia Manhattan ponderada para priorizar asientos con mejor punto focal.
"""

from typing import List, Dict, Any, Optional
from app.domain.models import RecommendedSeat


def recommend_best_seats(
    seats: List[Dict[str, Any]],
    limit: int = 3
) -> List[RecommendedSeat]:
    """Filtra asientos disponibles y selecciona los más cercanos al centro visual de la pantalla.
    
    Cada elemento en `seats` debe poseer 'row' (ej: 'C') o 'seatCode' (ej: 'C-8') y 'status' ('AVAILABLE' o 'FREE').
    """
    if not seats:
        # Asientos predeterminados de contingencia si no se dispone de matriz
        return [
            RecommendedSeat(seatCode="C-7", row="C", number=7, isOptimal=True, badge="Mejor Visibilidad"),
            RecommendedSeat(seatCode="C-8", row="C", number=8, isOptimal=True, badge="Punto Focal Audio"),
            RecommendedSeat(seatCode="D-7", row="D", number=7, isOptimal=True, badge="Fila Central"),
        ]

    # 1. Filtrar solo asientos libres
    available = []
    for s in seats:
        status = str(s.get("status", "AVAILABLE")).upper()
        if status in ("AVAILABLE", "FREE", "LIBRE", "DISPONIBLE"):
            available.append(s)

    if not available:
        return []

    # 2. Extraer filas y columnas
    rows_set = sorted(list({s.get("row") or (s.get("seatCode", "A-1").split("-")[0]) for s in seats}))
    cols_set = sorted(list({
        int(s.get("number") or (s.get("seatCode", "A-1").split("-")[1]))
        for s in seats if "-" in str(s.get("seatCode", "")) or s.get("number") is not None
    } or [1]))

    mid_row_idx = len(rows_set) // 2
    mid_col = (cols_set[0] + cols_set[-1]) / 2.0 if cols_set else 5.0

    scored = []
    for s in available:
        row_str = s.get("row") or s.get("seatCode", "C-1").split("-")[0]
        try:
            num = int(s.get("number") or s.get("seatCode", "C-1").split("-")[1])
        except (ValueError, IndexError):
            num = 5

        row_idx = rows_set.index(row_str) if row_str in rows_set else mid_row_idx
        # Distancia al centro (filas penalizadas levemente para centrar vertical y horizontal)
        distance = abs(row_idx - mid_row_idx) * 1.5 + abs(num - mid_col)
        seat_code = s.get("seatCode") or f"{row_str}-{num}"
        scored.append((distance, seat_code, row_str, num))

    # Ordenar por menor distancia
    scored.sort(key=lambda x: x[0])

    badges = ["Mejor Visibilidad", "Punto Focal Audio", "Fila Central"]
    results: List[RecommendedSeat] = []
    for idx, (_, code, r_str, n_num) in enumerate(scored[:limit]):
        badge = badges[idx] if idx < len(badges) else "Recomendada"
        results.append(
            RecommendedSeat(
                seatCode=code,
                row=r_str,
                number=n_num,
                isOptimal=True,
                badge=badge
            )
        )

    return results

