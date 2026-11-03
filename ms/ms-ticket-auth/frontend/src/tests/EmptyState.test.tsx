import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MyTicketsEmptyView } from '../components/MyTicketsEmptyView';

describe('MyTicketsEmptyView - Estado Vacío y Asistencia Conversacional (HU-03)', () => {
  it('debe renderizar el mensaje de estado vacío y los botones de acción', () => {
    render(<MyTicketsEmptyView />);

    expect(screen.getByText('No tienes boletos confirmados')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Explorar Cartelera/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Consultar Asistente IA/i })).toBeInTheDocument();
  });

  it('al pulsar "Explorar Cartelera" debe invocar la función callback', () => {
    const handleExplore = vi.fn();
    render(<MyTicketsEmptyView onExploreMovies={handleExplore} />);

    const exploreBtn = screen.getByRole('button', { name: /Explorar Cartelera/i });
    fireEvent.click(exploreBtn);

    expect(handleExplore).toHaveBeenCalledTimes(1);
  });

  it('al pulsar "Consultar Asistente IA" debe abrir el panel conversacional conectado a MS IA-MCP', () => {
    render(<MyTicketsEmptyView />);

    const chatBtn = screen.getByRole('button', { name: /Consultar Asistente IA/i });
    fireEvent.click(chatBtn);

    expect(screen.getByText(/Asistente Conversacional \(MS IA-MCP\)/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/¿Qué películas están disponibles hoy\?.../i)).toBeInTheDocument();

    // Enviar una pregunta
    const input = screen.getByPlaceholderText(/¿Qué películas están disponibles hoy\?.../i);
    fireEvent.change(input, { target: { value: '¿Qué funciones hay?' } });

    const submitBtn = screen.getByRole('button', { name: /Enviar/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/Asistente CineV2/i)).toBeInTheDocument();
  });
});
