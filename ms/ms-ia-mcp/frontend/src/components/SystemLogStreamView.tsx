import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Activity,
  Play,
  Pause,
  Search,
  Copy,
  Check,
  Download,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  ChevronDown,
  ChevronRight,
  Layers,
  ArrowDownCircle,
  Radio,
} from 'lucide-react'
import {
  SystemLogEvent,
  LogSeverity,
  ActorRole,
  SystemLogKPIs,
} from '../types/system-logs.types'

interface SystemLogStreamViewProps {
  streamUrl?: string
  initialEvents?: SystemLogEvent[]
}

const AVAILABLE_ACTORS: { id: ActorRole; label: string }[] = [
  { id: 'BOLETERO', label: 'Boletero' },
  { id: 'CLIENTE_WEB', label: 'Cliente Web' },
  { id: 'CLIENTE_MOVIL', label: 'Cliente Móvil' },
  { id: 'ADMIN', label: 'Administrador' },
  { id: 'SISTEMA_IA', label: 'Sistema IA' },
]

const AVAILABLE_SEVERITIES: { id: LogSeverity; label: string; color: string }[] = [
  { id: 'SUCCESS', label: 'Success', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' },
  { id: 'INFO', label: 'Info', color: 'text-sky-400 border-sky-500/40 bg-sky-500/10' },
  { id: 'WARN', label: 'Warn', color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
  { id: 'ERROR', label: 'Error', color: 'text-rose-400 border-rose-500/40 bg-rose-500/10' },
]

const getApiHost = () => {
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    return window.location.hostname;
  }
  return 'localhost';
};

export const SystemLogStreamView: React.FC<SystemLogStreamViewProps> = ({
  streamUrl,
  initialEvents = [],
}) => {
  const effectiveStreamUrl = streamUrl || `http://${getApiHost()}:8001/api/v1/logs/stream`
  const [events, setEvents] = useState<SystemLogEvent[]>(initialEvents)
  const [pendingQueue, setPendingQueue] = useState<SystemLogEvent[]>([])
  const [isFrozen, setIsFrozen] = useState<boolean>(false)
  const isFrozenRef = useRef<boolean>(false)
  isFrozenRef.current = isFrozen
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [autoScroll, setAutoScroll] = useState<boolean>(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Filtros
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedActors, setSelectedActors] = useState<string[]>([])
  const [selectedSeverities, setSelectedSeverities] = useState<LogSeverity[]>([])

  const feedContainerRef = useRef<HTMLDivElement>(null)

  // Conexión EventSource (SSE)
  useEffect(() => {
    let eventSource: EventSource | null = null

    try {
      if (typeof EventSource !== 'undefined') {
        eventSource = new EventSource(effectiveStreamUrl)

        eventSource.onopen = () => {
          setIsConnected(true)
        }

        eventSource.addEventListener('log_event', (e: MessageEvent) => {
          try {
            const parsed: SystemLogEvent = JSON.parse(e.data)
            handleIncomingEvent(parsed)
          } catch (err) {
            console.error('Error parseando evento SSE:', err)
          }
        })

        eventSource.onerror = () => {
          setIsConnected(false)
        }
      }
    } catch {
      setIsConnected(false)
    }

    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [effectiveStreamUrl])

  const handleIncomingEvent = (newEvent: SystemLogEvent) => {
    if (isFrozenRef.current) {
      setPendingQueue((prev) => [...prev, newEvent])
    } else {
      setEvents((prev) => {
        // Evitar duplicados por id
        if (prev.some((e) => e.id === newEvent.id)) return prev
        return [newEvent, ...prev].slice(0, 500)
      })
    }
  }

  // Descongelar y vaciar cola
  const toggleFreeze = () => {
    if (isFrozen) {
      if (pendingQueue.length > 0) {
        setEvents((prev) => {
          const combined = [...pendingQueue.reverse(), ...prev]
          const unique = Array.from(new Map(combined.map((item) => [item.id, item])).values())
          return unique.slice(0, 500)
        })
        setPendingQueue([])
      }
      setIsFrozen(false)
    } else {
      setIsFrozen(true)
    }
  }

  // Manejo de Auto-scroll
  useEffect(() => {
    if (autoScroll && feedContainerRef.current && !isFrozen) {
      feedContainerRef.current.scrollTop = 0
    }
  }, [events, autoScroll, isFrozen])

  // Toggle de selección en filtros
  const toggleActorFilter = (actor: string) => {
    setSelectedActors((prev) =>
      prev.includes(actor) ? prev.filter((a) => a !== actor) : [...prev, actor]
    )
  }

  const toggleSeverityFilter = (sev: LogSeverity) => {
    setSelectedSeverities((prev) =>
      prev.includes(sev) ? prev.filter((s) => s !== sev) : [...prev, sev]
    )
  }

  // Filtrado de eventos
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      // Filtro actor
      if (selectedActors.length > 0 && !selectedActors.includes(evt.actorRole)) {
        return false
      }
      // Filtro severidad
      if (selectedSeverities.length > 0 && !selectedSeverities.includes(evt.severity)) {
        return false
      }
      // Buscador texto libre
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchSummary = evt.summary.toLowerCase().includes(query)
        const matchAction = evt.actionType.toLowerCase().includes(query)
        const matchService = evt.sourceService.toLowerCase().includes(query)
        const matchId = evt.id.toLowerCase().includes(query)
        if (!matchSummary && !matchAction && !matchService && !matchId) {
          return false
        }
      }
      return true
    })
  }, [events, selectedActors, selectedSeverities, searchQuery])

  // KPIs
  const kpis: SystemLogKPIs = useMemo(() => {
    let alerts = 0
    let tickets = 0
    let purchases = 0

    events.forEach((e) => {
      if (e.severity === 'WARN' || e.severity === 'ERROR') alerts++
      if (
        e.actionType.toLowerCase().includes('boleto') ||
        e.actionType.toLowerCase().includes('ticket') ||
        e.sourceService === 'ms-boleteo-validator'
      ) {
        tickets++
      }
      if (
        e.actionType.toLowerCase().includes('compra') ||
        e.actionType.toLowerCase().includes('order') ||
        e.actionType.toLowerCase().includes('pago') ||
        e.actionType.toLowerCase().includes('reserva') ||
        e.actionType.toLowerCase().includes('checkout')
      ) {
        purchases++
      }
    })

    return {
      total: events.length,
      alerts,
      tickets,
      purchases,
    }
  }, [events])

  // Copiado JSON al portapapeles
  const copyEventPayload = (event: SystemLogEvent) => {
    const jsonStr = JSON.stringify(event, null, 2)
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(jsonStr)
    }
    setCopiedId(event.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Exportar a JSON
  const exportToJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredEvents, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', `system-logs-${new Date().toISOString().slice(0, 10)}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  // Exportar a CSV
  const exportToCSV = () => {
    const headers = ['id', 'timestamp', 'sourceService', 'actorRole', 'actionType', 'severity', 'summary']
    const rows = filteredEvents.map((e) => [
      e.id,
      e.timestamp,
      e.sourceService,
      e.actorRole,
      e.actionType,
      e.severity,
      `"${e.summary.replace(/"/g, '""')}"`,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')

    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', encodeURI(csvContent))
    downloadAnchor.setAttribute('download', `system-logs-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  const getSeverityBadge = (sev: LogSeverity) => {
    switch (sev) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> SUCCESS
          </span>
        )
      case 'INFO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">
            <Info className="w-3 h-3" /> INFO
          </span>
        )
      case 'WARN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3" /> WARN
          </span>
        )
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3" /> ERROR
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* 1. KPIs Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Eventos</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1" data-testid="kpi-total">
            {kpis.total}
          </p>
          <span className="text-[11px] text-slate-500">Buffer FIFO en RAM</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Alertas / Errores</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-1" data-testid="kpi-alerts">
            {kpis.alerts}
          </p>
          <span className="text-[11px] text-slate-500">WARN & ERROR</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Boletos Canjeados</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-1" data-testid="kpi-tickets">
            {kpis.tickets}
          </p>
          <span className="text-[11px] text-slate-500">Boleteo Validator</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Compras Confirmadas</span>
            <Activity className="w-4 h-4 text-violet-400" />
          </div>
          <p className="text-2xl font-bold text-violet-400 mt-1" data-testid="kpi-purchases">
            {kpis.purchases}
          </p>
          <span className="text-[11px] text-slate-500">Web & Móvil</span>
        </div>
      </div>

      {/* 2. Control Toolbar: Búsqueda, Filtros y Freeze */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg space-y-4">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por resumen, tipo de acción, microservicio o ID..."
              aria-label="Buscar por resumen o acción"
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Action Buttons: Freeze, AutoScroll, Export */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={toggleFreeze}
              data-testid="freeze-btn"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition border ${
                isFrozen
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {isFrozen ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Reanudar</span>
                  {pendingQueue.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-slate-950 rounded-full text-[10px] font-bold">
                      +{pendingQueue.length} en espera
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Freeze</span>
                </>
              )}
            </button>

            <button
              onClick={() => setAutoScroll((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition ${
                autoScroll
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <ArrowDownCircle className="w-3.5 h-3.5" />
              <span>Auto-scroll</span>
            </button>

            {/* Export buttons */}
            <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
              <button
                onClick={exportToJSON}
                data-testid="export-json-btn"
                className="flex items-center gap-1 px-2.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 font-medium transition"
                title="Exportar registros filtrados a JSON"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>JSON</span>
              </button>
              <button
                onClick={exportToCSV}
                data-testid="export-csv-btn"
                className="flex items-center gap-1 px-2.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 font-medium transition"
                title="Exportar registros filtrados a CSV"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Chips: Actors & Severities */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-4 text-xs">
          {/* Actores */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-500" /> Actor:
            </span>
            {AVAILABLE_ACTORS.map((act) => {
              const active = selectedActors.includes(act.id)
              return (
                <button
                  key={act.id}
                  onClick={() => toggleActorFilter(act.id)}
                  data-testid={`filter-actor-${act.id}`}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition border ${
                    active
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  {act.label}
                </button>
              )
            })}
          </div>

          {/* Severidades */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-medium">Severidad:</span>
            {AVAILABLE_SEVERITIES.map((sev) => {
              const active = selectedSeverities.includes(sev.id)
              return (
                <button
                  key={sev.id}
                  onClick={() => toggleSeverityFilter(sev.id)}
                  data-testid={`filter-sev-${sev.id}`}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition border ${
                    active
                      ? `${sev.color} ring-1 ring-white/20`
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  {sev.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 3. Feed Header & Connection Status */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">Transmisión en Vivo</span>
          <span className="text-slate-500">
            ({filteredEvents.length} de {events.length} mostrados)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
              isConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
              }`}
            />
            {isConnected ? 'En Vivo (SSE)' : 'Desconectado'}
          </span>
        </div>
      </div>

      {/* 4. Stream Feed List */}
      <div
        ref={feedContainerRef}
        data-testid="log-feed-container"
        className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-y-auto max-h-[600px] divide-y divide-slate-800/80 shadow-inner"
      >
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            <Radio className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
            No hay eventos registrados que coincidan con los filtros actuales.
          </div>
        ) : (
          filteredEvents.map((event) => {
            const isExpanded = expandedId === event.id
            const isCopied = copiedId === event.id

            return (
              <div
                key={event.id}
                data-testid={`log-row-${event.id}`}
                className="p-3.5 hover:bg-slate-800/40 transition flex flex-col gap-2"
              >
                {/* Event Summary Row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : event.id)}
                  className="flex items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      aria-label="Expandir evento"
                      className="text-slate-500 hover:text-slate-300"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    {getSeverityBadge(event.severity)}
                    <span className="text-xs font-mono text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-700">
                      {event.actorRole}
                    </span>
                    <span className="text-xs font-medium text-slate-200 truncate">
                      {event.summary}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-right">
                    <span className="text-[11px] font-mono text-slate-500">
                      {event.sourceService}
                    </span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      {event.timestamp.slice(11, 19)}
                    </span>
                  </div>
                </div>

                {/* Expanded Accordion: Metadata JSON Viewer */}
                {isExpanded && (
                  <div
                    data-testid={`accordion-${event.id}`}
                    className="mt-2 p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono space-y-2 animate-fadeIn"
                  >
                    <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                      <span className="text-[11px] text-indigo-300 font-semibold flex items-center gap-1">
                        Payload Completo ({event.id})
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          copyEventPayload(event)
                        }}
                        data-testid={`copy-btn-${event.id}`}
                        className="flex items-center gap-1 text-[11px] px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition border border-slate-700"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">¡Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-indigo-400" />
                            <span>Copiar JSON</span>
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="text-emerald-400/90 overflow-x-auto text-[11px] max-h-56 leading-relaxed">
                      {JSON.stringify(event, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default SystemLogStreamView
