import logging
from typing import List
from fastapi import APIRouter, status
from app.domain.models import ChatRequest, ChatResponse, ShowtimeRecommendation
from app.infrastructure.service_clients import cinema_core_client
from app.agent.grok_client import grok_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Chatbot"])


@router.post("/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def process_chat_message(request: ChatRequest) -> ChatResponse:
    """Endpoint conversacional consumido por el Chatbot deslizable de la App Cliente (IC-04.4, HU-11).

    Interpreta consultas sobre películas y horarios, consulta las funciones en MS CINEMA-CORE
    y devuelve recomendaciones con tarjetas interactivas de butacas.
    """
    logger.info(f"Mensaje de usuario {request.userId}: {request.message}")

    # Paso 1: Consultar cartelera y funciones vigentes en MS CINEMA-CORE
    showtimes = await cinema_core_client.get_active_showtimes()

    # Paso 2: Filtrar y seleccionar las mejores recomendaciones
    user_msg_lower = request.message.lower()
    recommendations: List[ShowtimeRecommendation] = []

    for st in showtimes[:2]:
        recommendations.append(
            ShowtimeRecommendation(
                showtimeId=st.get("showtimeId", "st-default-01"),
                movieTitle=st.get("movieTitle", "Película Recomendada"),
                startTime=st.get("startTime", "18:00"),
                recommendedSeat=st.get("recommendedSeat", "C-8"),
            )
        )

    # Paso 3: Generación de respuesta conversacional cordial
    if any(k in user_msg_lower for k in ["recomi", "película", "pelicula", "función", "funcion", "tarde", "ver"]):
        movie_names = " y ".join([f"'{r.movieTitle}' a las {r.startTime}" for r in recommendations])
        reply = (
            f"¡Hola! Para hoy te recomiendo especialmente {movie_names}. "
            f"He seleccionado las mejores butacas centrales para ti. Puedes presionar las tarjetas "
            f"de abajo para agregarlas directamente a tu compra."
        )
    else:
        reply = (
            "¡Hola! Soy tu asistente cinéfilo de CineV2. ¿Te gustaría conocer la cartelera de hoy "
            "o que te sugiera las mejores butacas para ver un estreno?"
        )

    return ChatResponse(
        reply=reply,
        suggestedShowtimes=recommendations,
    )
