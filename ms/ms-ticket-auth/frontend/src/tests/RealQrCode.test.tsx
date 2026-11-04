import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RealQrCode, generateQrSignature } from '../components/RealQrCode';

describe('RealQrCode - Generador de Código QR Criptográfico Real', () => {
  it('debe renderizar el contenedor del QR, el canvas HTML5 y la etiqueta HMAC VERIFIED', async () => {
    const mockPayload = {
      ticketId: 'tkt-test-12345',
      movieTitle: 'Interestelar (IMAX)',
      hallName: 'Sala IMAX 1',
      seats: 'C-8, C-9',
      amount: 90.0,
      showtimeId: 'showtime-test-01',
      seatId: 'seat-1,seat-2',
      issuedAt: '2026-11-04T00:00:00.000Z',
    };

    render(<RealQrCode payload={mockPayload} size={150} />);

    expect(screen.getByTestId('real-qr-container')).toBeInTheDocument();
    expect(screen.getByText('CINE BOLIVIA')).toBeInTheDocument();
    expect(screen.getByTestId('real-qr-canvas')).toBeInTheDocument();
    expect(screen.getByText(/HMAC VERIFIED/i)).toBeInTheDocument();

    // Comprobar que el canvas almacena el payload formateado con su firma HMAC
    await waitFor(() => {
      const canvas = screen.getByTestId('real-qr-canvas');
      const dataPayload = canvas.getAttribute('data-payload');
      expect(dataPayload).toBeTruthy();
      expect(dataPayload).toContain('tkt-test-12345');
      expect(dataPayload).toContain('Interestelar (IMAX)');
      expect(dataPayload).toContain('sig');
    });
  });

  it('debe admitir un string crudo como payload', async () => {
    const rawPayload = JSON.stringify({
      ticketId: 'tkt-string-raw',
      sig: 'abcdef1234567890',
    });

    render(<RealQrCode payload={rawPayload} headerText="TICKET VÁLIDO" />);

    expect(screen.getByText('TICKET VÁLIDO')).toBeInTheDocument();
    await waitFor(() => {
      const canvas = screen.getByTestId('real-qr-canvas');
      expect(canvas.getAttribute('data-payload')).toBe(rawPayload);
    });
  });

  it('genera una firma HMAC consistente y determinista', async () => {
    const canonical = 'tkt-abc:seat-1:show-1:2026-11-04';
    const sig1 = await generateQrSignature(canonical);
    const sig2 = await generateQrSignature(canonical);

    expect(sig1).toBeTruthy();
    expect(sig1).toBe(sig2);
    expect(typeof sig1).toBe('string');
  });
});
