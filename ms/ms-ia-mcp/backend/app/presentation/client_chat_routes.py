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


import re
import difflib

# Palabras genéricas o stopwords que NUNCA deben usarse para identificar una película
STOPWORDS_TITLES = {
    "de", "del", "la", "las", "el", "los", "en", "un", "una", "unos", "unas", "por", "para", "con", "y", "o", "a",
    "dos", "parte", "sentido", "agua", "man", "verso", "hoy", "tarde", "noche", "pelicula", "peliculas"
}


def _match_movie_semantically(text: str, all_cards: List[ShowtimeCard]) -> Dict[str, Any]:
    """
    Evalúa la película consultada por el usuario comparando el título COMPLETO o tokens
    significativos usando límites de palabra exactos (\b...\b) o similitud difusa (fuzzy ratio).
    
    Retorna un diccionario:
    - 'match': 'EXACT' | 'FUZZY' | 'NONE'
    - 'cards': List[ShowtimeCard]
    - 'suggestedTitle': str (si fue aproximado / fuzzy)
    """
    clean_text = text.lower().strip()
    words_in_text = set(re.findall(r"\b[a-záéíóúñ0-9]{3,}\b", clean_text))

    # 1. Búsqueda por coincidencia de frase completa o título principal
    for card in all_cards:
        title_lower = card.movieTitle.lower()
        # Normalizar título quitando subtítulos tras ':'
        main_title = title_lower.split(":")[0].strip()
        
        # Coincidencia directa del título o título principal
        if title_lower in clean_text or main_title in clean_text:
            return {
                "match": "EXACT",
                "cards": [c for c in all_cards if c.movieTitle.strip().lower() == card.movieTitle.strip().lower()],
                "suggestedTitle": card.movieTitle
            }

    # 2. Búsqueda por palabras clave distintivas exclusivas del título (ej: 'avatar', 'gladiador', 'oppenheimer', 'interstellar')
    distinctive_keywords = {
        "avatar": "Avatar 2: El Sentido del Agua",
        "pandora": "Avatar 2: El Sentido del Agua",
        "dune": "Dune: Parte Dos",
        "arrakis": "Dune: Parte Dos",
        "gladiador": "Gladiador II",
        "gladiator": "Gladiador II",
        "spiderman": "Spider-Man: A Través del Spider-Verso",
        "spider-man": "Spider-Man: A Través del Spider-Verso",
        "oppenheimer": "Oppenheimer",
        "interstellar": "Interestelar",
        "interestelar": "Interestelar",
        "intensamente": "Intensamente 2",
        "insideout": "Intensamente 2",
        "deadpool": "Deadpool & Wolverine",
        "wolverine": "Deadpool & Wolverine",
    }

    # Evaluar palabras aisladas completas (\b)
    for kw, target_title in distinctive_keywords.items():
        pattern = rf"\b{re.escape(kw)}\b"
        if re.search(pattern, clean_text):
            matched = [c for c in all_cards if target_title.lower() in c.movieTitle.lower()]
            if matched:
                return {
                    "match": "EXACT",
                    "cards": matched,
                    "suggestedTitle": matched[0].movieTitle
                }

    # 3. Similitud difusa (Fuzzy Matching) para errores tipográficos o nombres aproximados
    # Ej: "la de dunas" -> "Dune", "espiderman" -> "Spider-Man", "openjaimer" -> "Oppenheimer"
    unique_titles = list({c.movieTitle for c in all_cards})
    for title in unique_titles:
        title_clean = title.lower()
        # Comparar con palabras o n-gramas del texto
        ratio = difflib.SequenceMatcher(None, clean_text, title_clean).ratio()
        if ratio >= 0.65:
            matched = [c for c in all_cards if c.movieTitle == title]
            return {
                "match": "FUZZY",
                "cards": matched,
                "suggestedTitle": title
            }
        
        # Comparar también contra cada palabra del usuario
        for word in words_in_text:
            if word in STOPWORDS_TITLES:
                continue
            word_ratio = difflib.SequenceMatcher(None, word, title_clean.split(":")[0].strip()).ratio()
            if word_ratio >= 0.75 and len(word) >= 5:
                matched = [c for c in all_cards if c.movieTitle == title]
                return {
                    "match": "FUZZY",
                    "cards": matched,
                    "suggestedTitle": title
                }

    return {"match": "NONE", "cards": [], "suggestedTitle": None}


def _match_movie_in_text(text: str, all_cards: List[ShowtimeCard]) -> List[ShowtimeCard]:
    """Helper de compatibilidad que retorna la lista de funciones de la película identificada."""
    res = _match_movie_semantically(text, all_cards)
    return res.get("cards", [])


def _find_recent_movie_in_history(history: Any, all_cards: List[ShowtimeCard]) -> List[ShowtimeCard]:
    """Busca en los últimos turnos del historial si se habló de alguna película específica."""
    if not history:
        return []
    reversed_hist = list(reversed(history[-6:]))
    for item in reversed_hist:
        content = item.get("content", "") if isinstance(item, dict) else getattr(item, "content", "")
        res = _match_movie_semantically(str(content), all_cards)
        if res["cards"]:
            return res["cards"]
    return []


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
        hall_type = "IMAX" if "imax" in hall_name.lower() else ("VIP" if "vip" in hall_name.lower() else ("3D" if "3d" in hall_name.lower() else "2D"))
        price = 45.0 if hall_type == "IMAX" else (65.0 if hall_type == "VIP" else (40.0 if hall_type == "3D" else 35.0))

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

    # 2. Manejo de Retroceso explícito ("Cambiar butaca" o "Volver a elegir butaca")
    is_cambiar_butaca = any(k in msg_lower for k in [
        "cambiar butaca", "cambiar asiento", "elegir otra butaca", "otra butaca", "cambiar de butaca", "volver a butacas"
    ])
    if is_cambiar_butaca:
        target_card = next((c for c in all_cards if c.showtimeId == request.selectedShowtimeId), all_cards[0] if all_cards else None)
        recom_seats = recommend_best_seats([], limit=3)
        return ClientChatResponse(
            reply=f"¡Entendido! Puedes elegir otra de las mejores butacas disponibles para '{target_card.movieTitle if target_card else 'tu función'}':",
            nextState="SHOWTIME_SELECTED",
            suggestedChips=["Elegir C-8", "Elegir C-7", "Ver otra película"],
            showtimeCards=[target_card] if target_card else [],
            recommendedSeats=recom_seats,
            summary=None,
        )

    # 3. Manejo de Retroceso explícito ("Cambiar función" o "Ver otra película")
    is_cambiar_funcion = any(k in msg_lower for k in [
        "cambiar funcion", "cambiar función", "otra pelicula", "otra película", "ver otra película", "ver otra pelicula", "volver a cartelera"
    ])
    if is_cambiar_funcion:
        return ClientChatResponse(
            reply="Claro, aquí tienes la cartelera para elegir otra función:",
            nextState="EXPLORING",
            suggestedChips=["Funciones económicas", "Salas IMAX", "Películas de la noche"],
            showtimeCards=all_cards[:3],
            recommendedSeats=[],
            summary=None,
        )

    # 4. Manejo de Selección de Butaca y Resumen Pre-Pago (Soporte Multi-Butaca)
    seat_explicit = request.selectedSeatCode or any(s in msg_lower for s in ["c-8", "c-7", "d-7", "c-5", "c-6", "c-4", "a-3", "d-5", "d-6"])
    seat_word_select = ("butaca" in msg_lower or "asiento" in msg_lower) and any(w in msg_lower for w in ["elijo", "quiero", "prefiero", "asigna", "selecciona", "dame", "esta"])

    if (seat_explicit or seat_word_select) and not is_cambiar_butaca:
        chosen_seats: List[str] = []
        if request.selectedSeatCode:
            chosen_seats = [s.strip().upper() for s in request.selectedSeatCode.replace(" y ", ",").split(",") if s.strip()]

        if not chosen_seats:
            import re
            found = re.findall(r"\b([A-Fa-f]-[0-9]{1,2})\b", msg_lower)
            if found:
                chosen_seats = [f.upper() for f in found]
            else:
                for s in ["c-8", "c-7", "d-7", "c-5", "c-6", "c-4", "a-3", "d-5", "d-6"]:
                    if s in msg_lower and s.upper() not in chosen_seats:
                        chosen_seats.append(s.upper())

        if not chosen_seats:
            chosen_seats = ["C-8"]

        chosen_seat_str = ", ".join(chosen_seats)
        ticket_count = len(chosen_seats)
        selected_card = next((c for c in all_cards if c.showtimeId == request.selectedShowtimeId), all_cards[0] if all_cards else None)

        if selected_card:
            total_calc = selected_card.price * ticket_count
            summary_data = {
                "showtimeId": selected_card.showtimeId,
                "movieTitle": selected_card.movieTitle,
                "hallName": selected_card.hallName,
                "hallType": selected_card.hallType,
                "seatCode": chosen_seat_str,
                "startTime": selected_card.startTime,
                "unitPrice": selected_card.price,
                "totalPrice": total_calc,
                "ticketCount": ticket_count,
            }
            plural = "las butacas" if ticket_count > 1 else "la butaca"
            reply = (
                f"¡Perfecto! Tienes reservada temporalmente {plural} '{chosen_seat_str}' ({ticket_count} {('entradas' if ticket_count > 1 else 'entrada')}) para '{selected_card.movieTitle}'.\n\n"
                f"Revisa el resumen financiero a continuación y presiona 'Proceder al Pago' para confirmar tu entrada "
                f"con pasarela Stripe segura y emitir tu código QR dinámico."
            )
            return ClientChatResponse(
                reply=reply,
                nextState="SEAT_ASSIGNED",
                suggestedChips=["Cambiar butaca", "Ver otra película"],
                showtimeCards=[],
                recommendedSeats=[],
                summary=summary_data,
                emptyState=None,
            )

    # 5. Detección Inteligente de Película Consultada en el Mensaje o Historial
    matched_movie_cards = _match_movie_in_text(user_msg, all_cards)
    
    # Intención conversacional de compra (ej. "quiero comprar entradas entonces", "comprar entradas")
    is_buying_intent = any(k in msg_lower for k in [
        "quiero comprar", "comprar entradas", "comprar boletos", "comprar tickets", "comprar entonces", "quiero entradas", "comprar la de"
    ])

    if is_buying_intent and not matched_movie_cards:
        # Recuperar película del contexto reciente si no vino nombrada en este turno
        matched_movie_cards = _find_recent_movie_in_history(request.history, all_cards)

    # Si encontramos funciones de la película mencionada o contextual
    if matched_movie_cards:
        # Verificar si además se especificó hora o sala concreta (ej: "19:00", "14:30", "sala 4", "imax")
        target_card = None
        for c in matched_movie_cards:
            if c.startTime in msg_lower or c.hallName.lower() in msg_lower or (c.hallType and c.hallType.lower() in msg_lower):
                target_card = c
                break

        # Si especificó hora o si solo hay 1 función y está en modo compra
        if target_card or (len(matched_movie_cards) == 1 and is_buying_intent):
            chosen_card = target_card or matched_movie_cards[0]
            recom_seats = recommend_best_seats([], limit=3)
            reply = (
                f"Excelente elección: has seleccionado '{chosen_card.movieTitle}' ({chosen_card.hallType}) "
                f"en {chosen_card.hallName} a las {chosen_card.startTime}.\n\n"
                f"He analizado el mapa de la sala y estas son las 3 butacas centrales con mejor visibilidad y sonido. "
                f"¿Cuál prefieres?"
            )
            return ClientChatResponse(
                reply=reply,
                nextState="SHOWTIME_SELECTED",
                suggestedChips=["Elegir C-8", "Ver otra película"],
                showtimeCards=[chosen_card],
                recommendedSeats=recom_seats,
                summary=None,
            )

        # Si no especificó hora o está preguntando por disponibilidad de esa película:
        # Devolver ÚNICAMENTE las funciones de esa película
        reply_title = matched_movie_cards[0].movieTitle
        reply_text = (
            f"¡Sí! Tenemos '{reply_title}' disponible en cartelera hoy. "
            f"Elige a continuación la sala y horario que prefieras para reservar tu butaca:"
        )
        return ClientChatResponse(
            reply=reply_text,
            nextState="EXPLORING",
            suggestedChips=[f"Función {c.startTime}" for c in matched_movie_cards[:3]] + ["Ver cartelera completa"],
            showtimeCards=matched_movie_cards,
            recommendedSeats=[],
            summary=None,
        )

    # 6. Manejo de Selección Explícita de Función (por id o nombre directo)
    if request.selectedShowtimeId or "seleccionar-funcion" in msg_lower or "quiero la función" in msg_lower or "quiero la funcion" in msg_lower:
        target_id = request.selectedShowtimeId
        selected_card = next((c for c in all_cards if c.showtimeId == target_id), None)
        if not selected_card:
            for c in all_cards:
                if c.movieTitle.lower() in msg_lower or c.hallName.lower() in msg_lower or c.showtimeId.lower() in msg_lower:
                    selected_card = c
                    break

        if selected_card:
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
    ]

    # Incorporar historial multi-turno previo si fue enviado por el cliente (máximo 6 turnos)
    if request.history:
        for item in request.history[-6:]:
            role = item.get("role", "user") if isinstance(item, dict) else getattr(item, "role", "user")
            content = item.get("content", "") if isinstance(item, dict) else getattr(item, "content", "")
            if role in ["user", "assistant"] and content:
                messages.append({"role": role, "content": str(content)})

    messages.append({"role": "user", "content": user_msg})

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

    # Detección contextual de géneros específicos en la consulta
    is_terror = any(g in msg_lower for g in ["terror", "miedo", "horror", "suspenso"])
    is_romance = any(g in msg_lower for g in ["romance", "romantica", "comedia romantica"])
    is_genero_especifico = is_terror or is_romance or any(g in msg_lower for g in ["comedia", "animada", "infantil", "documental"])

    # Fallback conversacional si la API se encuentra saturada (429) o en contingencia
    if not llm_reply:
        if is_terror:
            llm_reply = (
                "Lamentablemente hoy no contamos con películas de terror en cartelera. "
                "Nuestras funciones de hoy están enfocadas en ciencia ficción, acción y animación."
            )
        elif is_romance:
            llm_reply = (
                "Por el momento no tenemos funciones de romance en la programación de hoy. "
                "Te invito a explorar nuestras opciones de acción y ciencia ficción disponibles."
            )
        elif "mañana" in msg_lower:
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

    # Detección de intenciones y saludos
    is_saludo_puro = any(s in msg_lower for s in ["hola", "buenas", "buenos dias", "buenos días", "buenas tardes", "buenas noches"]) and not any(
        w in msg_lower for w in ["pelicula", "película", "funcion", "función", "cartelera", "ver", "comprar", "horario"]
    )
    is_tarde_horario = ("en la tarde" in msg_lower or "por la tarde" in msg_lower or "vespertin" in msg_lower or ("tarde" in msg_lower and "buenas tardes" not in msg_lower)) and not is_saludo_puro
    is_noche_horario = ("en la noche" in msg_lower or "por la noche" in msg_lower or "nocturn" in msg_lower or ("noche" in msg_lower and "buenas noches" not in msg_lower)) and not is_saludo_puro

    empty_state_payload = None

    if is_economico:
        # Ordenar por precio ascendente y filtrar solo las más económicas
        relevant_cards.sort(key=lambda c: c.price)
        min_price = relevant_cards[0].price if relevant_cards else 35.0
        relevant_cards = [c for c in relevant_cards if c.price == min_price]
    elif is_premium:
        # Ordenar por precio descendente (IMAX y salas premium)
        relevant_cards.sort(key=lambda c: c.price, reverse=True)
        relevant_cards = [c for c in relevant_cards if c.hallType in ("IMAX", "VIP") or c.price >= 40.0] or relevant_cards
    elif is_tarde_horario:
        def _get_hour(c):
            part = c.startTime.split(":")[0] if ":" in c.startTime else ""
            return int(part) if part.isdigit() else 14
        relevant_cards = [c for c in all_cards if _get_hour(c) < 20] or all_cards
    elif is_noche_horario:
        def _get_hour_noche(c):
            part = c.startTime.split(":")[0] if ":" in c.startTime else ""
            return int(part) if part.isdigit() else 21
        relevant_cards = [c for c in all_cards if _get_hour_noche(c) >= 20] or all_cards
    else:
        movie_matches = _match_movie_in_text(user_msg, all_cards)
        if movie_matches:
            relevant_cards = movie_matches
        elif is_genero_especifico:
            # Si el usuario preguntó por un género que no tiene coincidencias en cartelera, no forzar tarjetas irrelevantes
            relevant_cards = []
            searched_name = "terror" if is_terror else ("romance" if is_romance else "este género")
            empty_state_payload = {
                "icon": "frown",
                "title": f"Sin películas de {searched_name} para hoy",
                "message": "Actualmente nuestra programación cuenta con funciones destacadas de Acción, Ciencia Ficción y Animación.",
                "searchedTerm": searched_name,
                "availableGenres": ["Acción", "Ciencia Ficción", "Animación"],
            }

    # Solo adjuntar tarjetas interactivas de cartelera si el usuario solicita cartelera, funciones, horarios o si filtró por atributos
    pide_cartelera = (
        not is_saludo_puro
        and len(relevant_cards) > 0
        and (
            is_economico
            or is_premium
            or is_tarde_horario
            or is_noche_horario
            or any(k in msg_lower for k in [
                "cartelera", "funcion", "función", "funciones", "horario", "horarios",
                "que hay", "qué hay", "recomiend", "pelicula", "película", "estreno", "ver", "salas", "opciones"
            ])
        )
    )

    cards_to_return = relevant_cards[:3] if pide_cartelera else []

    chips = ["Funciones económicas", "Salas IMAX", "Películas de la noche"]
    if is_economico:
        chips = ["Ver en Sala 2", "Ver en Sala 3", "Ver salas IMAX"]
    elif empty_state_payload:
        chips = ["Ver películas de Acción", "Ver Ciencia Ficción", "Ver Cartelera Completa"]

    return ClientChatResponse(
        reply=llm_reply,
        nextState="EXPLORING",
        suggestedChips=chips,
        showtimeCards=cards_to_return,
        recommendedSeats=[],
        summary=None,
        emptyState=empty_state_payload,
    )
