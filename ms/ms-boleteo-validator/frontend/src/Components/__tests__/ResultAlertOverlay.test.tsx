import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ResultAlertOverlay, ValidatedTicketInfo } from '../ResultAlertOverlay';

describe('ResultAlertOverlay', () => {
  const sampleTicket: ValidatedTicketInfo = {
    ticketId: 'TCK-2026-8831',
    movieTitle: 'Oppenheimer',
    hallName: 'Sala IMAX 01',
    seatCode: 'D-08',
  };

  describe('GreenOverlay (T3.4 - Acceso Autorizado)', () => {
    it('renderiza la pantalla gigante verde y el titulo ACCESO PERMITIDO', () => {
      render(
        <ResultAlertOverlay
          status="AUTHORIZED"
          ticketInfo={sampleTicket}
          enableAudio={false}
        />
      );

      const overlay = screen.getByTestId('overlay-authorized-green');
      expect(overlay).toBeTruthy();
      expect(screen.getByText('ACCESO PERMITIDO')).toBeTruthy();
      expect(screen.getByTestId('icon-authorized')).toBeTruthy();
    });

    it('muestra claramente la pelicula, sala y butaca legibles a distancia', () => {
      render(
        <ResultAlertOverlay
          status="AUTHORIZED"
          ticketInfo={sampleTicket}
          enableAudio={false}
        />
      );

      expect(screen.getByText('Oppenheimer')).toBeTruthy();
      expect(screen.getByText(/Sala: Sala IMAX 01/)).toBeTruthy();
      expect(screen.getByText(/Butaca: D-08/)).toBeTruthy();
      expect(screen.getByText(/TCK-2026-8831/)).toBeTruthy();
    });

    it('permite cerrar el overlay al hacer click si onDismiss está presente', () => {
      const onDismiss = vi.fn();
      render(
        <ResultAlertOverlay
          status="AUTHORIZED"
          ticketInfo={sampleTicket}
          onDismiss={onDismiss}
          enableAudio={false}
        />
      );

      const overlay = screen.getByTestId('overlay-authorized-green');
      fireEvent.click(overlay);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('RedOverlay (T3.5 - Acceso Denegado)', () => {
    it('renderiza la pantalla gigante roja y el titulo ACCESO DENEGADO', () => {
      render(
        <ResultAlertOverlay
          status="REJECTED"
          rejectionReason="Boleto ya utilizado anteriormente (SC-05.1.2)"
          enableAudio={false}
        />
      );

      const overlay = screen.getByTestId('overlay-rejected-red');
      expect(overlay).toBeTruthy();
      expect(screen.getByText('ACCESO DENEGADO')).toBeTruthy();
      expect(screen.getByTestId('icon-rejected')).toBeTruthy();
    });

    it('muestra el motivo explícito de rechazo por boleto ya usado', () => {
      const reason = 'Boleto ya utilizado anteriormente. Entrada registrada a las 19:42.';
      render(
        <ResultAlertOverlay
          status="REJECTED"
          rejectionReason={reason}
          enableAudio={false}
        />
      );

      const reasonElem = screen.getByTestId('rejection-reason-text');
      expect(reasonElem.textContent).toContain(reason);
    });

    it('muestra el motivo explícito de rechazo por firma criptográfica inválida', () => {
      const reason = 'Firma criptográfica HMAC-SHA256 inválida o código adulterado (RB-BOL-01).';
      render(
        <ResultAlertOverlay
          status="REJECTED"
          rejectionReason={reason}
          enableAudio={false}
        />
      );

      expect(screen.getByText(reason)).toBeTruthy();
    });

    it('despliega la cuenta regresiva de reactivación si countdownSeconds está definido', () => {
      render(
        <ResultAlertOverlay
          status="REJECTED"
          rejectionReason="Boleto caducado"
          countdownSeconds={1.8}
          enableAudio={false}
        />
      );

      expect(screen.getByText(/Reanudando escáner en 1.8s/)).toBeTruthy();
    });
  });
});
