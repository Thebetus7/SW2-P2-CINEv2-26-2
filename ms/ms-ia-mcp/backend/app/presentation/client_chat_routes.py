import logging
from typing import List, Dict, Any
from fastapi import APIRouter, status
from app.domain.models import (
    ClientChatRequest,
    ClientChatResponse,
    ShowtimeCard,
    RecommendedSeat,
)
from app.domain.seat_recommender import recommend_best_seats
from app.infrastructure.service_clients import cinema_core_client
from app.agent.grok_client import grok_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["ClientChat"])


@router.post("/client-chat", response_model=ClientChatResponse, status_code=status.HTTP_200_OK)
async def process_client_chat(request: ClientChatRequest) -> ClientChatResponse:
    """Orquestador conversacional interactivo para compra asistida de boletos (Módulo 07)."""
    user_msg = request.message.strip()
    msg_lower = user_msg.lower()
    current_state = request.currentState

    # 1. Obtener funciones activas desde Cinema-Core (o fallback integrado)
    showtimes_raw = await cinema_core_client.get_active_showtimes()

    # Normalizar tarjetas de cartelera
    all_cards: List[ShowtimeCard] = []
    for st in showtimes_raw:
        st_id = str(st.get("showtimeId") or st.get("id") or "st-01")
        title = st.get("movieTitle") or st.get("movie", {}).get("title") or "Película de Estreno"
        hall_name = st.get("roomName") or st.get("hall", {}).get("name") or "Sala 1 (Principal)"
        start_time = st.get("startTime") or "18:00"
        poster = st.get("posterUrl") or st.get("movie", {}).get("posterUrl")

        # Asignar tipo y precio estimado
        hall_type = "IMAX" if "imax" in hall_name.lower() else ("3D" if "3d" in hall_name.lower() else "2D")
        price = 45.0 if hall_type == "IMAX" else (40.0 if hall_type == "3D" else 35.0)

        all_cards.append(
            ShowtimeCard(
                showtimeId=st_id,
                movieTitle=title,
                posterUrl=poster,
                hallName=hall_name,
                hallType=hall_type,
                startTime=start_time,
                price=price,
            )
        )

    # 2. Manejo de Selección de Butaca y Resumen Pre-Pago (Evaluado primero si ya hay asiento elegido)
    if request.selectedSeatCode or any(s in msg_lower for s in ["c-8", "c-7", "d-7", "butaca", "asiento"]):
        chosen_seat = request.selectedSeatCode or ("C-8" if "c-8" in msg_lower else ("C-7" if "c-7" in msg_lower else "D-7"))
        selected_card = next((c for c in all_cards if c.showtimeId == request.selectedShowtimeId), all_cards[0] if all_cards else None)

        if selected_card:
            summary_data = {
                "showtimeId": selected_card.showtimeId,
                "movieTitle": selected_card.movieTitle,
                "hallName": selected_card.hallName,
                "hallType": selected_card.hallType,
                "seatCode": chosen_seat,
                "startTime": selected_card.startTime,
                "unitPrice": selected_card.price,
                "totalPrice": selected_card.price,
            }
            reply = (
                f"¡Perfecto! Tienes reservada temporalmente la butaca '{chosen_seat}' para '{selected_card.movieTitle}'.\n\n"
                f"Revisa el resumen financiero a continuación y presiona 'Proceder al Pago' para confirmar tu entrada "
                f"con pasarela Stripe segura y emitir tu código QR dinámico."
            )
            return ClientChatResponse(
                reply=reply,
                nextState="SEAT_ASSIGNED",
                suggestedChips=["Cambiar butaca", "Proceder al Pago"],
                showtimeCards=[],
                recommendedSeats=[],
                summary=summary_data,
            )

    # 3. Manejo de Selección de Función
    if request.selectedShowtimeId or "seleccionar-funcion" in msg_lower or any(p in msg_lower for p in ["quiero la función", "quiero la funcion", "avatar", "dune", "oppenheimer", "intensamente"]):
        target_id = request.selectedShowtimeId
        if not target_id:
            # Buscar función cuyo título o sala coincida con el mensaje
            for c in all_cards:
                if c.movieTitle.lower() in msg_lower or c.hallName.lower() in msg_lower or c.showtimeId.lower() in msg_lower:
                    target_id = c.showtimeId
                    break

        selected_card = next((c for c in all_cards if c.showtimeId == target_id), None)
        if not selected_card and request.selectedShowtimeId:
            selected_card = next((c for c in all_cards if c.showtimeId == request.selectedShowtimeId), None)
        if not selected_card and any(p in msg_lower for p in ["avatar", "dune", "oppenheimer", "intensamente"]):
            for c in all_cards:
                if any(p in c.movieTitle.lower() for p in ["avatar", "dune", "oppenheimer", "intensamente"] if p in msg_lower):
                    selected_card = c
                    break

        if selected_card:
            # Recomendar butacas óptimas (filas C/D)
            recom_seats = recommend_best_seats([], limit=3)
            reply = (
                f"Excelente elección: has seleccionado '{selected_card.movieTitle}' ({selected_card.hallType}) "
                f"en {selected_card.hallName} a las {selected_card.startTime}.\n\n"
                f"He analizado el mapa de la sala y estas son las 3 butacas centrales con mejor visibilidad y sonido. "
                f"¿Cuál prefieres?"
            )
            return ClientChatResponse(
                reply=reply,
                nextState="SHOWTIME_SELECTED",
                suggestedChips=["Elegir C-8", "Ver otra película"],
                showtimeCards=[selected_card],
                recommendedSeats=recom_seats,
                summary=None,
            )

    # 4. Inferencia Dinámica con LLM (Groq Cloud Qwen 3.8 27B)
    cartelera_context = "\n".join(
        [f"- '{c.movieTitle}' ({c.hallType}) en {c.hallName} a las {c.startTime} (Precio: Bs. {c.price})" for c in all_cards]
    )

    system_prompt = (
        "Eres el Asistente Virtual Cinéfilo de Cine Bolivia. Ayudas a clientes a elegir funciones, salas y horarios. "
        "INSTRUCCIÓN DE FORMATO CRÍTICA:\n"
        "- Redacta en 1 o 2 párrafos breves, fluidos y cordiales (máximo 4 líneas).\n"
        "- Responde directamente a la intención (económica, horario, género, sala).\n"
        "- ESTÁ ESTRICTAMENTE PROHIBIDO usar listas con viñetas o asteriscos (*, -, **), ya que la interfaz web "
        "renderiza automáticamente tarjetas gráficas interactivas debajo de tu texto.\n"
        "- Nombra las películas y salas de manera natural dentro de la oración.\n\n"
        f"Cartelera oficial disponible:\n{cartelera_context}"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_msg},
    ]

    llm_reply = None
    try:
        grok_res = await grok_client.chat_completion(messages=messages, temperature=0.3)
        if grok_res and grok_res.get("content"):
            content = grok_res.get("content").strip()
            # Si el contenido no es el mensaje genérico del fallback de auditoría
            if "Auditoría comercial" not in content and "Alerta Crítica" not in content:
                llm_reply = content
    except Exception as ex:
        logger.warning(f"Excepción en GroqCloud: {ex}")

    # Fallback conversacional si la API se encuentra saturada (429) o en contingencia
    if not llm_reply:
        if "mañana" in msg_lower:
            llm_reply = (
                "Para mañana la programación oficial se habilitará en las próximas horas, pero te muestro las funciones destacadas "
                "que continúan en cartelera para que puedas reservar con anticipación."
            )
        elif any(k in msg_lower for k in ["accion", "ficcion", "ciencia"]):
            llm_reply = "¡Excelente gusto! Para acción y ciencia ficción te recomiendo imperdiblemente 'Dune: Parte Dos' y 'Avatar: El Sentido del Agua' en IMAX Laser."
        elif any(k in msg_lower for k in ["tarde", "vespertin"]):
            llm_reply = "Para la tarde tenemos estas excelentes funciones disponibles en cartelera:"
        elif any(k in msg_lower for k in ["noche", "nocturn"]):
            llm_reply = "Para la noche contamos con las siguientes funciones estelares:"
        else:
            llm_reply = "¡Hola! Con gusto te ayudo a elegir la mejor función. Aquí tienes las opciones disponibles en cartelera activa:"

    # Filtrar y ordenar tarjetas cuantitativamente según la intención del usuario
    relevant_cards = list(all_cards)

    # Detección de intención económica / menor precio
    is_economico = any(k in msg_lower for k in ["ecom", "econ", "barat", "menor precio", "precio bajo", "mas accesible", "costo bajo"])
    is_premium = any(k in msg_lower for k in ["caro", "premium", "vip", "imax", "mejor sala", "pantalla grande"])

    if is_economico:
        # Ordenar por precio ascendente y filtrar solo las más económicas
        relevant_cards.sort(key=lambda c: c.price)
        min_price = relevant_cards[0].price if relevant_cards else 35.0
        relevant_cards = [c for c in relevant_cards if c.price == min_price]
    elif is_premium:
        # Ordenar por precio descendente (IMAX y salas premium)
        relevant_cards.sort(key=lambda c: c.price, reverse=True)
        relevant_cards = [c for c in relevant_cards if c.hallType == "IMAX" or c.price >= 40.0] or relevant_cards
    elif "tarde" in msg_lower:
        def _get_hour(c):
            part = c.startTime.split(":")[0] if ":" in c.startTime else ""
            return int(part) if part.isdigit() else 14
        relevant_cards = [c for c in all_cards if _get_hour(c) < 20] or all_cards
    elif "noche" in msg_lower:
        def _get_hour_noche(c):
            part = c.startTime.split(":")[0] if ":" in c.startTime else ""
            return int(part) if part.isdigit() else 21
        relevant_cards = [c for c in all_cards if _get_hour_noche(c) >= 20] or all_cards
    elif any(k in msg_lower for k in ["dune", "avatar", "oppenheimer", "intensamente"]):
        # Filtrar por título si se nombra una película
        relevant_cards = [c for c in all_cards if any(p in c.movieTitle.lower() for p in ["dune", "avatar", "oppenheimer", "intensamente"] if p in msg_lower)] or all_cards

    chips = ["Funciones económicas", "Salas IMAX", "Películas de la noche"]
    if is_economico:
        chips = ["Ver en Sala 2", "Ver en Sala 3", "Ver salas IMAX"]

    return ClientChatResponse(
        reply=llm_reply,
        nextState="EXPLORING",
        suggestedChips=chips,
        showtimeCards=relevant_cards[:3],
        recommendedSeats=[],
        summary=None,
    )
