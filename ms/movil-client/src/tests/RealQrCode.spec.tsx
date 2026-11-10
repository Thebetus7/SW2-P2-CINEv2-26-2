import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RealQrCode, generateQrSignature } from '../components/Tickets/RealQrCode';

describe('RealQrCode Component (Canal Móvil - Renderizado Real y Criptográfico)', () => {
  it('debe renderizar el contenedor del QR, el elemento QR dinámico y la etiqueta HMAC-SHA256 VERIFIED', async () => {
    const mockPayload = {
      ticketId: 'tkt-movil-real-999',
      movieTitle: 'Dune: Parte 2',
      salaNombre: 'Sala 2',
      seatCode: 'C-8',
      amount: 45.0,
      showtimeId: 'st-01',
      seatId: 'seat-C-8',
      issuedAt: '2026-11-10T14:00:00.000Z',
    };

    render(<RealQrCode payload={mockPayload} size={160} />);

    expect(screen.getByTestId('real-qr-container')).toBeInTheDocument();
    expect(screen.getByText('CINE BOLIVIA')).toBeInTheDocument();
    expect(screen.getByTestId('dynamic-qr-svg')).toBeInTheDocument();
    expect(screen.getByTestId('hmac-verified-label')).toHaveTextContent(/HMAC.*VERIFIED/i);

    // Comprobar que contiene la firma HMAC y datos estructurados
    await waitFor(() => {
      const canvas = screen.getByTestId('real-qr-canvas');
      const dataPayload = canvas.getAttribute('data-payload');
      expect(dataPayload).toBeTruthy();
      expect(dataPayload).toContain('tkt-movil-real-999');
      expect(dataPayload).toContain('Dune: Parte 2');
      expect(dataPayload).toContain('sig');
    });
  });

  it('debe admitir un string crudo como payload JSON firmado', async () => {
    const rawPayload = JSON.stringify({
      ticketId: 'tkt-raw-movil',
      sig: 'abcdef0123456789',
    });

    render(<RealQrCode payload={rawPayload} headerText="ENTRADA CONFIRMADA" />);

    expect(screen.getByText('ENTRADA CONFIRMADA')).toBeInTheDocument();
    await waitFor(() => {
      const canvas = screen.getByTestId('real-qr-canvas');
      expect(canvas.getAttribute('data-payload')).toBe(rawPayload);
    });
  });

  it('genera una firma HMAC consistente y determinista con la clave maestra universitaria', async () => {
    const canonical = 'tkt-movil-123:C-8:st-01:2026-11-10';
    const sig1 = await generateQrSignature(canonical);
    const sig2 = await generateQrSignature(canonical);

    expect(sig1).toBeTruthy();
    expect(sig1).toBe(sig2);
    expect(typeof sig1).toBe('string');
  });
});
