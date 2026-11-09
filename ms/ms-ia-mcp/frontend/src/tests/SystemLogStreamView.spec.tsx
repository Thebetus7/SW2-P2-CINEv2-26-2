import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SystemLogStreamView } from '../components/SystemLogStreamView'
import { AuditMonitorConsole } from '../components/AuditMonitorConsole'
import { SystemLogEvent } from '../types/system-logs.types'

const sampleEvents: SystemLogEvent[] = [
  {
    id: 'evt-101',
    timestamp: '2026-11-07T12:00:00Z',
    sourceService: 'ms-boleteo-validator',
    actorRole: 'BOLETERO',
    actionType: 'BOLETO_VALIDADO',
    severity: 'SUCCESS',
    summary: 'Boleto #101 validado correctamente en Sala 1',
    metadata: { ticketId: '101', room: 1 },
  },
  {
    id: 'evt-102',
    timestamp: '2026-11-07T12:05:00Z',
    sourceService: 'ms-boleteo-validator',
    actorRole: 'BOLETERO',
    actionType: 'BOLETO_RECHAZADO',
    severity: 'WARN',
    summary: 'Alerta: Boleto #102 duplicado',
    metadata: { ticketId: '102', reason: 'ALREADY_SCANNED' },
  },
  {
    id: 'evt-103',
    timestamp: '2026-11-07T12:10:00Z',
    sourceService: 'ms-cinema-core',
    actorRole: 'ADMIN',
    actionType: 'PELICULA_CREADA',
    severity: 'SUCCESS',
    summary: 'Película Interstellar añadida al catálogo',
    metadata: { title: 'Interstellar', duration: 169 },
  },
  {
    id: 'evt-104',
    timestamp: '2026-11-07T12:15:00Z',
    sourceService: 'ms-ticket-auth',
    actorRole: 'CLIENTE_WEB',
    actionType: 'COMPRA_FINALIZADA',
    severity: 'SUCCESS',
    summary: 'Compra de 3 boletos completada por cliente',
    metadata: { orderId: 'ORD-500', total: 150 },
  },
  {
    id: 'evt-105',
    timestamp: '2026-11-07T12:20:00Z',
    sourceService: 'ms-ia-mcp',
    actorRole: 'SISTEMA_IA',
    actionType: 'ANOMALIA_DETECTADA',
    severity: 'ERROR',
    summary: 'Fallo crítico de congestión en fila taquilla',
    metadata: { error: 'TIMEOUT_EXCEEDED' },
  },
]

describe('SystemLogStreamView & Bitácora Tab', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // Vertical Slice 2: Renderizado Inicial y Tab LOG
  it('renderiza la pestaña LOG en AuditMonitorConsole y muestra SystemLogStreamView al hacer clic', () => {
    render(<AuditMonitorConsole />)

    const logTab = screen.getByTestId('tab-logs-btn')
    expect(logTab).toBeInTheDocument()

    fireEvent.click(logTab)
    expect(screen.getByText(/Transmisión en Vivo/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Buscar por resumen, tipo de acción, microservicio o ID.../i)).toBeInTheDocument()
  })

  it('monta eventos iniciales y calcula tarjetas KPIs correctamente (Slice 2 & 3)', () => {
    render(<SystemLogStreamView initialEvents={sampleEvents} />)

    // Tarjetas KPIs
    expect(screen.getByTestId('kpi-total')).toHaveTextContent('5')
    // Alertas (WARN + ERROR): evt-102 (WARN), evt-105 (ERROR) => 2
    expect(screen.getByTestId('kpi-alerts')).toHaveTextContent('2')
    // Boletos: evt-101, evt-102 => 2
    expect(screen.getByTestId('kpi-tickets')).toHaveTextContent('2')
    // Compras: evt-104 => 1
    expect(screen.getByTestId('kpi-purchases')).toHaveTextContent('1')

    // Filas renderizadas
    expect(screen.getByText(/Boleto #101 validado correctamente en Sala 1/i)).toBeInTheDocument()
    expect(screen.getByText(/Película Interstellar añadida al catálogo/i)).toBeInTheDocument()
  })

  // Vertical Slice 3: Filtros Multidimensionales y Freeze Mode
  it('filtra correctamente por texto libre', () => {
    render(<SystemLogStreamView initialEvents={sampleEvents} />)

    const searchInput = screen.getByPlaceholderText(/Buscar por resumen, tipo de acción, microservicio o ID.../i)
    fireEvent.change(searchInput, { target: { value: 'Interstellar' } })

    expect(screen.getByText(/Película Interstellar añadida al catálogo/i)).toBeInTheDocument()
    expect(screen.queryByText(/Boleto #101 validado/i)).not.toBeInTheDocument()
  })

  it('filtra por Actor y por Severidad', () => {
    render(<SystemLogStreamView initialEvents={sampleEvents} />)

    // Filtrar por Actor: BOLETERO
    const actorBtn = screen.getByTestId('filter-actor-BOLETERO')
    fireEvent.click(actorBtn)

    expect(screen.getByText(/Boleto #101 validado/i)).toBeInTheDocument()
    expect(screen.getByText(/Boleto #102 duplicado/i)).toBeInTheDocument()
    expect(screen.queryByText(/Interstellar/i)).not.toBeInTheDocument()

    // Filtrar adicionalmente por Severidad: WARN
    const sevWarnBtn = screen.getByTestId('filter-sev-WARN')
    fireEvent.click(sevWarnBtn)

    expect(screen.queryByText(/Boleto #101 validado/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Boleto #102 duplicado/i)).toBeInTheDocument()
  })

  it('activa Freeze Mode y retiene nuevos eventos en cola hasta reanudar', () => {
    let messageListener: ((e: MessageEvent) => void) | null = null

    // Mock global EventSource
    class MockEventSource {
      onopen: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor() {
        setTimeout(() => this.onopen && this.onopen(), 0)
      }
      addEventListener(type: string, listener: any) {
        if (type === 'log_event') {
          messageListener = listener
        }
      }
      close() {}
    }
    vi.stubGlobal('EventSource', MockEventSource)

    render(<SystemLogStreamView initialEvents={[sampleEvents[0]]} />)

    const freezeBtn = screen.getByTestId('freeze-btn')
    expect(freezeBtn).toHaveTextContent(/Freeze/i)

    // Activar Freeze
    fireEvent.click(freezeBtn)
    expect(freezeBtn).toHaveTextContent(/Reanudar/i)

    // Llega un nuevo evento por SSE mientras está congelado
    const incoming: SystemLogEvent = {
      id: 'evt-freeze-99',
      timestamp: '2026-11-07T12:30:00Z',
      sourceService: 'ms-ticket-auth',
      actorRole: 'CLIENTE_WEB',
      actionType: 'LOGIN',
      severity: 'INFO',
      summary: 'Inicio de sesión de usuario bajo freeze',
      metadata: {},
    }

    act(() => {
      if (messageListener) {
        ;(messageListener as any)({ data: JSON.stringify(incoming) })
      }
    })

    // El nuevo evento no debe estar en la lista visible aún
    expect(screen.queryByText(/Inicio de sesión de usuario bajo freeze/i)).not.toBeInTheDocument()
    expect(screen.getByText(/\+1 en espera/i)).toBeInTheDocument()

    // Reanudar flujo
    act(() => {
      fireEvent.click(freezeBtn)
    })
    expect(screen.getByText(/Inicio de sesión de usuario bajo freeze/i)).toBeInTheDocument()
  })

  // Vertical Slice 4: Visor Acordeón JSON y Exportadores CSV/JSON
  it('despliega acordeón JSON con payload y permite copiar', async () => {
    // Mock navigator.clipboard
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    })

    render(<SystemLogStreamView initialEvents={[sampleEvents[0]]} />)

    // Fila clicable
    const row = screen.getByText(/Boleto #101 validado correctamente en Sala 1/i)
    fireEvent.click(row)

    // Acordeón visible con JSON formateado
    const accordion = screen.getByTestId('accordion-evt-101')
    expect(accordion).toBeInTheDocument()
    expect(screen.getByText(/"ticketId": "101"/i)).toBeInTheDocument()

    // Botón Copiar JSON
    const copyBtn = screen.getByTestId('copy-btn-evt-101')
    fireEvent.click(copyBtn)

    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('"ticketId": "101"'))
    expect(screen.getByText(/¡Copiado!/i)).toBeInTheDocument()
  })

  it('permite exportar la bitácora a archivos JSON y CSV', () => {
    const createElementSpy = vi.spyOn(document, 'createElement')
    const clickMock = vi.fn()
    window.HTMLAnchorElement.prototype.click = clickMock

    render(<SystemLogStreamView initialEvents={sampleEvents} />)

    const exportJsonBtn = screen.getByTestId('export-json-btn')
    const exportCsvBtn = screen.getByTestId('export-csv-btn')

    // Exportar JSON
    fireEvent.click(exportJsonBtn)
    expect(createElementSpy).toHaveBeenCalledWith('a')
    expect(clickMock).toHaveBeenCalled()

    // Exportar CSV
    fireEvent.click(exportCsvBtn)
    expect(createElementSpy).toHaveBeenCalledWith('a')
  })
})
