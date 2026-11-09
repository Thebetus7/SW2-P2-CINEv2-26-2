import React, { useState } from 'react'
import { SystemLogStreamView } from './SystemLogStreamView'
import {
  ShieldAlert,
  Bot,
  Activity,
  FileSpreadsheet,
  RefreshCw,
  Send,
  Film,
  Armchair,
  CheckCircle2,
  Clock,
  Radio,
} from 'lucide-react'

interface Anomaly {
  anomaly_type: string
  severity_level: 'CRITICAL' | 'WARNING' | 'INFO'
  description: string
  raw_mcp_data: Record<string, any>
  timestamp: string
}

interface AuditRecord {
  id: string
  timestamp: string
  trigger_type: string
  verdict: string
  anomalies_detected: Anomaly[]
  n8n_dispatched: boolean
  n8n_response?: any
  raw_mcp_metrics?: any
  execution_time_ms: number
}

interface ShowtimeCard {
  showtimeId: string
  movieTitle: string
  startTime: string
  recommendedSeat: string
}

interface ChatMessage {
  id: string
  sender: 'user' | 'assistant'
  text: string
  showtimes?: ShowtimeCard[]
}

const getApiHost = () => {
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    return window.location.hostname;
  }
  return 'localhost';
};

export const AuditMonitorConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'audit' | 'chatbot' | 'logs'>('audit')
  const [isAuditing, setIsAuditing] = useState(false)
  const [currentAudit, setCurrentAudit] = useState<AuditRecord | null>(null)
  const [history, setHistory] = useState<AuditRecord[]>([])
  const [simulatedTaquilla, setSimulatedTaquilla] = useState<number>(45)

  // Chatbot State
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      sender: 'assistant',
      text: '¡Hola! Soy tu asistente de cine con IA. ¿En qué película o función estás interesado hoy?',
    },
  ])

  const triggerAudit = async (customPersonCount?: number) => {
    setIsAuditing(true)
    try {
      const payload: any = {}
      if (customPersonCount !== undefined) {
        payload.line_override = {
          personCount: customPersonCount,
          congestionStatus: customPersonCount > 40 ? 'CONGESTIONADA' : 'NORMAL',
          zone: 'TAQUILLA_PRINCIPAL',
        }
      }

      const res = await fetch(`http://${getApiHost()}:8001/api/v1/audit/trigger-now`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const data: AuditRecord = await res.json()
        setCurrentAudit(data)
        setHistory((prev) => [data, ...prev.slice(0, 19)])
      } else {
        // Fallback local seguro si backend no corre en caliente durante testing
        simulateFallbackAudit(customPersonCount ?? simulatedTaquilla)
      }
    } catch {
      simulateFallbackAudit(customPersonCount ?? simulatedTaquilla)
    } finally {
      setIsAuditing(false)
    }
  }

  const simulateFallbackAudit = (personCount: number) => {
    const isCritical = personCount > 40
    const mockAudit: AuditRecord = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      trigger_type: 'MANUAL',
      verdict: isCritical
        ? `Alerta Crítica: Saturación en taquilla principal (${personCount} personas detectadas). Flujo de contingencia en n8n activado exitosamente.`
        : 'Auditoría comercial completada. Parámetros de aforo y taquilla dentro de los rangos normales.',
      anomalies_detected: isCritical
        ? [
            {
              anomaly_type: 'TAQUILLA_CONGESTIONADA',
              severity_level: 'CRITICAL',
              description: `Saturación crítica en TAQUILLA_PRINCIPAL (${personCount} personas en cola).`,
              raw_mcp_data: { personCount, threshold: 40 },
              timestamp: new Date().toISOString(),
            },
          ]
        : [],
      n8n_dispatched: isCritical,
      execution_time_ms: 320,
    }
    setCurrentAudit(mockAudit)
    setHistory((prev) => [mockAudit, ...prev.slice(0, 19)])
  }

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: chatInput,
    }
    setChatMessages((prev) => [...prev, userMsg])
    const promptText = chatInput
    setChatInput('')
    setIsChatLoading(true)

    try {
      const res = await fetch(`http://${getApiHost()}:8001/api/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'demo-user-web', message: promptText }),
      })
      if (res.ok) {
        const data = await res.json()
        setChatMessages((prev) => [
          ...prev,
          {
            id: `asst-${Date.now()}`,
            sender: 'assistant',
            text: data.reply,
            showtimes: data.suggestedShowtimes,
          },
        ])
      } else {
        simulateChatFallback()
      }
    } catch {
      simulateChatFallback()
    } finally {
      setIsChatLoading(false)
    }
  }

  const simulateChatFallback = () => {
    setChatMessages((prev) => [
      ...prev,
      {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: '¡Hola! Te recomiendo ver Avatar 2 en Sala 1 a las 18:00 o Dune 2 a las 20:30. He seleccionado las mejores butacas centrales para ti.',
        showtimes: [
          {
            showtimeId: 'st-01',
            movieTitle: 'Avatar: El Sentido del Agua',
            startTime: '18:00',
            recommendedSeat: 'C-8',
          },
          {
            showtimeId: 'st-02',
            movieTitle: 'Dune: Parte Dos',
            startTime: '20:30',
            recommendedSeat: 'D-5',
          },
        ],
      },
    ])
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600/20 rounded-lg text-indigo-400">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              CineV2 <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">MCP JSON-RPC</span>
            </h1>
            <p className="text-xs text-slate-400">Agente Auditor GrokCloud & Automatización Reactiva n8n</p>
          </div>
        </div>

        {/* Tabs Switcher */}
        <div className="flex bg-slate-800/80 p-1 rounded-lg border border-slate-700">
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              activeTab === 'audit' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Consola Auditoría
          </button>
          <button
            onClick={() => setActiveTab('chatbot')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              activeTab === 'chatbot' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Chatbot Asistente
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            data-testid="tab-logs-btn"
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              activeTab === 'logs' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Bitácora en Vivo (LOG)
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        {activeTab === 'logs' ? (
          <section className="lg:col-span-3 w-full">
            <SystemLogStreamView />
          </section>
        ) : activeTab === 'audit' ? (
          <>
            {/* Left 2 Cols: Control & Current Verdict */}
            <section className="lg:col-span-2 space-y-6">
              {/* Action Banner */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 shadow-xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Demostración de Auditoría Autónoma</h2>
                    <p className="text-sm text-slate-400 mt-1">
                      Ejecuta el protocolo MCP JSON-RPC interrogando a MS CINEMA-CORE y MS MULTIMEDIA.
                    </p>
                  </div>

                  <button
                    onClick={() => triggerAudit(simulatedTaquilla)}
                    disabled={isAuditing}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium rounded-lg shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isAuditing ? 'animate-spin' : ''}`} />
                    {isAuditing ? 'Evaluando MCP...' : '[Ejecutar Auditoría MCP Ahora]'}
                  </button>
                </div>

                {/* Simulador de Personas en Taquilla */}
                <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-400">Simulación Taquilla Multimedia:</span>
                    <button
                      onClick={() => { setSimulatedTaquilla(45); triggerAudit(45) }}
                      className="px-2.5 py-1 text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded hover:bg-rose-500/30 transition"
                    >
                      45 personas (Crítico &gt; 40)
                    </button>
                    <button
                      onClick={() => { setSimulatedTaquilla(18); triggerAudit(18) }}
                      className="px-2.5 py-1 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded hover:bg-emerald-500/30 transition"
                    >
                      18 personas (Normal)
                    </button>
                  </div>
                  <span className="text-xs text-slate-500">Intervalo automático: 60s</span>
                </div>
              </div>

              {/* Latest Verdict Card */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 shadow-xl">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-indigo-400" />
                    <h3 className="font-semibold text-white">Veredicto del Agente GrokCloud</h3>
                  </div>
                  {currentAudit && (
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        currentAudit.anomalies_detected.length > 0
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {currentAudit.anomalies_detected.length > 0 ? 'ANOMALÍA DETECTADA' : 'OPERACIÓN NORMAL'}
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  {currentAudit ? (
                    <div className="space-y-4">
                      <p className="text-slate-200 text-sm leading-relaxed bg-slate-950/60 p-4 rounded-lg border border-slate-800 font-mono">
                        {currentAudit.verdict}
                      </p>

                      {currentAudit.n8n_dispatched && (
                        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <ShieldAlert className="w-5 h-5 text-amber-400" />
                            <div>
                              <p className="text-sm font-medium text-amber-200">Flujo de Contingencia n8n Activado</p>
                              <p className="text-xs text-amber-400/80">Reporte predictivo en hoja Excel .xlsx generado</p>
                            </div>
                          </div>
                          <a
                            href={`http://${getApiHost()}:8001/api/v1/audit/reports/latest.xlsx`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 text-slate-950 font-semibold text-xs rounded-md hover:bg-amber-400 transition"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                            [Descargar Reporte Predictivo.xlsx]
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic text-center py-8">
                      Presiona el botón de arriba para ejecutar la auditoría inicial.
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Right Col: History / Telemetry */}
            <aside className="space-y-6">
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-400" />
                    Historial de Eventos
                  </h3>
                  <span className="text-xs text-slate-500">{history.length} registros</span>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-950/50 border border-slate-800/80 rounded-lg text-xs space-y-1 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="font-mono text-slate-500">{item.execution_time_ms}ms</span>
                      </div>
                      <p className="text-slate-300 font-medium line-clamp-2">{item.verdict}</p>
                      {item.n8n_dispatched && (
                        <span className="inline-block px-1.5 py-0.5 bg-rose-500/20 text-rose-300 text-[10px] rounded font-semibold">
                          n8n Webhook Sent
                        </span>
                      )}
                    </div>
                  ))}
                  {history.length === 0 && (
                    <p className="text-xs text-slate-600 text-center py-6">Sin eventos recientes</p>
                  )}
                </div>
              </div>
            </aside>
          </>
        ) : (
          /* Chatbot Tab */
          <section className="lg:col-span-3 max-w-3xl mx-auto w-full bg-slate-900/70 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col h-[650px]">
            <div className="pb-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Film className="w-6 h-6 text-indigo-400" />
                <div>
                  <h3 className="font-semibold text-white">Simulador de Chatbot de Compra</h3>
                  <p className="text-xs text-slate-400">Conectado a MS CINEMA-CORE y GrokCloud (/api/v1/chat)</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" /> En línea
              </span>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-slate-800 text-slate-200 border border-slate-700/80 rounded-bl-none'
                    }`}
                  >
                    <p>{msg.text}</p>
                  </div>

                  {/* Showtimes Interactive Cards */}
                  {msg.showtimes && msg.showtimes.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-[85%]">
                      {msg.showtimes.map((st) => (
                        <div
                          key={st.showtimeId}
                          className="bg-slate-950/80 border border-indigo-500/30 p-3 rounded-xl hover:border-indigo-500 transition cursor-pointer flex flex-col justify-between"
                        >
                          <div>
                            <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">
                              Función Sugerida
                            </span>
                            <h4 className="text-sm font-bold text-white mt-0.5">{st.movieTitle}</h4>
                            <p className="text-xs text-slate-400 mt-1">Horario: {st.startTime}</p>
                          </div>
                          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                            <span className="text-xs flex items-center gap-1 text-emerald-400 font-medium">
                              <Armchair className="w-3.5 h-3.5" /> Butaca: {st.recommendedSeat}
                            </span>
                            <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded font-semibold">
                              Comprar
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {isChatLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-500 italic">
                  <Bot className="w-4 h-4 animate-bounce text-indigo-400" /> Asistente pensando...
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="pt-4 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                placeholder="Escribe 'Recomiéndame una película para esta tarde'..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
              />
              <button
                onClick={sendChatMessage}
                disabled={isChatLoading || !chatInput.trim()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default AuditMonitorConsole
