import asyncio
import re
import uuid
from collections import deque
from datetime import datetime, timezone
from typing import Any, Dict, List, Set
from app.domain.models import SystemLogEvent, SystemLogIngestRequest


class LogBufferService:
    def __init__(self, max_capacity: int = 500):
        self._max_capacity = max_capacity
        self._buffer: deque[SystemLogEvent] = deque(maxlen=max_capacity)
        self._subscribers: Set[asyncio.Queue] = set()

    def _sanitize_metadata(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitiza campos sensibles como contraseñas, tokens o números completos de tarjeta (RB-03)."""
        if not metadata:
            return {}

        sanitized = dict(metadata)
        sensitive_keys = {"password", "token", "jwt", "authorization", "secret", "cvv", "pan"}

        for k in list(sanitized.keys()):
            k_lower = str(k).lower()
            if any(s in k_lower for s in sensitive_keys):
                sanitized[k] = "[REDACTED]"
            elif isinstance(sanitized[k], dict):
                sanitized[k] = self._sanitize_metadata(sanitized[k])
            elif isinstance(sanitized[k], str) and len(sanitized[k]) >= 16 and re.match(r"^\d{16}$", sanitized[k]):
                # Enmascarar posibles números de tarjeta de crédito (dejar últimos 4 dígitos)
                sanitized[k] = f"****-****-****-{sanitized[k][-4:]}"

        return sanitized

    def add_event_from_request(self, req: SystemLogIngestRequest) -> SystemLogEvent:
        event_id = req.id if req.id else f"log-{uuid.uuid4()}"
        timestamp = req.timestamp if req.timestamp else datetime.now(timezone.utc).isoformat()
        metadata = self._sanitize_metadata(req.metadata or {})

        event = SystemLogEvent(
            id=event_id,
            timestamp=timestamp,
            sourceService=req.sourceService,
            actorRole=req.actorRole,
            actionType=req.actionType,
            severity=req.severity,
            summary=req.summary,
            metadata=metadata,
        )
        return self.add_event(event)

    def add_event(self, event: SystemLogEvent) -> SystemLogEvent:
        """Añade un evento al buffer circular FIFO y lo despacha a los escuchas conectados."""
        self._buffer.append(event)

        # Despacho reactivo a los clientes conectados (SSE)
        dead_queues = []
        for queue in list(self._subscribers):
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                # Si el suscriptor tiene la cola llena, descartamos el más antiguo
                try:
                    queue.get_nowait()
                    queue.put_nowait(event)
                except Exception:
                    dead_queues.append(queue)
            except Exception:
                dead_queues.append(queue)

        for dead in dead_queues:
            self._subscribers.discard(dead)

        return event

    def get_history(self, limit: int = 100) -> List[SystemLogEvent]:
        """Retorna hasta `limit` eventos más recientes en orden cronológico."""
        events = list(self._buffer)
        if limit and limit > 0:
            events = events[-limit:]
        return events

    def subscribe(self) -> asyncio.Queue:
        """Registra un nuevo escucha SSE y retorna su cola asíncrona."""
        queue: asyncio.Queue = asyncio.Queue(maxsize=200)
        self._subscribers.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue) -> None:
        """Desregistra una cola cuando el cliente se desconecta."""
        self._subscribers.discard(queue)

    def clear(self) -> None:
        """Limpia el buffer y reinicia las colas (para tests)."""
        self._buffer.clear()
        self._subscribers.clear()

    @property
    def total_events(self) -> int:
        return len(self._buffer)


# Instancia singleton para toda la aplicación
log_buffer_service = LogBufferService(max_capacity=500)
