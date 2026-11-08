import asyncio
import json
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from app.domain.models import (
    SystemLogEvent,
    SystemLogIngestRequest,
    SystemLogIngestResponse,
)
from app.infrastructure.log_buffer_service import log_buffer_service

router = APIRouter(prefix="/api/v1/logs", tags=["System Audit Logs"])


@router.post(
    "/ingest",
    response_model=SystemLogIngestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingesta unificada de telemetría de microservicios",
)
async def ingest_log_event(payload: SystemLogIngestRequest) -> SystemLogIngestResponse:
    try:
        saved_event = log_buffer_service.add_event_from_request(payload)
        return SystemLogIngestResponse(
            status="INGESTED",
            eventId=saved_event.id,
            timestamp=saved_event.timestamp,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al procesar el evento de telemetría: {str(e)}",
        )


@router.get(
    "/history",
    response_model=List[SystemLogEvent],
    summary="Consulta de eventos históricos retenidos en memoria",
)
async def get_log_history(
    limit: Optional[int] = Query(default=100, ge=1, le=500, description="Máximo de eventos a retornar")
) -> List[SystemLogEvent]:
    return log_buffer_service.get_history(limit=limit or 100)


@router.get(
    "/stream",
    summary="Transmisión Server-Sent Events (SSE) de eventos en tiempo real",
)
async def stream_logs(request: Request):
    """Transmite eventos en vivo vía SSE a los clientes conectados."""
    queue = log_buffer_service.subscribe()

    async def event_generator():
        try:
            # 1. Enviar volcado inicial de eventos existentes en buffer
            initial_history = log_buffer_service.get_history(limit=100)
            for event in initial_history:
                payload = event.model_dump_json()
                yield f"event: log_event\ndata: {payload}\n\n"

            # Flush preventivo para clientes ASGI y HTTP
            await asyncio.sleep(0.01)

            # 2. Escucha reactiva continua
            while True:
                if await request.is_disconnected():
                    break
                try:
                    # Timeout para emitir heartbeat de keepalive cada 15 segundos
                    event = await asyncio.wait_for(queue.get(), timeout=15.0)
                    payload = event.model_dump_json()
                    yield f"event: log_event\ndata: {payload}\n\n"
                except asyncio.TimeoutError:
                    # Heartbeat SSE para mantener viva la conexión
                    yield ": ping\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            log_buffer_service.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
