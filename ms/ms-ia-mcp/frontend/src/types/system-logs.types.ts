export type ActorRole =
  | 'BOLETERO'
  | 'CLIENTE_WEB'
  | 'CLIENTE_MOVIL'
  | 'ADMIN'
  | 'SISTEMA_IA'
  | string

export type LogSeverity = 'SUCCESS' | 'INFO' | 'WARN' | 'ERROR'

export interface SystemLogEvent {
  id: string
  timestamp: string
  sourceService: string
  actorRole: ActorRole
  actionType: string
  severity: LogSeverity
  summary: string
  metadata?: Record<string, any>
}

export interface SystemLogFilterState {
  searchQuery: string
  selectedActors: string[]
  selectedSeverities: LogSeverity[]
}

export interface SystemLogKPIs {
  total: number
  alerts: number
  tickets: number
  purchases: number
}
