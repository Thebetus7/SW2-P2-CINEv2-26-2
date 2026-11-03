import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AuditMonitorConsole } from './AuditMonitorConsole'

describe('AuditMonitorConsole', () => {
  it('renderiza el título y el botón de ejecutar auditoría MCP', () => {
    render(<AuditMonitorConsole />)

    expect(screen.getByText(/CineV2/i)).toBeInTheDocument()
    const mcpTags = screen.getAllByText(/MCP JSON-RPC/i)
    expect(mcpTags.length).toBeGreaterThan(0)
    expect(screen.getByText(/\[Ejecutar Auditoría MCP Ahora\]/i)).toBeInTheDocument()
  })

  it('permite alternar a la pestaña de Chatbot Asistente', () => {
    render(<AuditMonitorConsole />)

    const chatbotTab = screen.getByText('Chatbot Asistente')
    fireEvent.click(chatbotTab)

    expect(screen.getByText(/Simulador de Chatbot de Compra/i)).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText(/Escribe 'Recomiéndame una película para esta tarde'.../i)
    ).toBeInTheDocument()
  })

  it('dispara la auditoría al hacer clic en el botón de auditoría', async () => {
    render(<AuditMonitorConsole />)

    const auditBtn = screen.getByText(/\[Ejecutar Auditoría MCP Ahora\]/i)
    fireEvent.click(auditBtn)

    // Verifica que tras hacer clic se procese y visualice el veredicto del agente GrokCloud
    const verdictTitle = await screen.findByText(/Veredicto del Agente GrokCloud/i)
    expect(verdictTitle).toBeInTheDocument()
  })
})
