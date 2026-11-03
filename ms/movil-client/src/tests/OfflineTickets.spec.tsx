import React, { useState } from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { db, offlineStorageService, OfflineTicketRecord } from '../services/offline-storage.service';
import { gpsGuidanceService, GpsGuidanceService, CINEMA_COORDINATES } from '../services/gps-guidance.service';
import { MyTicketsList } from '../components/Tickets/MyTicketsList';
import { QrCodeViewer } from '../components/Tickets/QrCodeViewer';
import { GpsGuidanceCard } from '../components/Navigation/GpsGuidanceCard';

describe('GpsGuidanceService', () => {
  it('debe calcular la distancia Haversine correctamente entre dos puntos', () => {
    const service = new GpsGuidanceService();
    const d0 = service.calculateHaversineDistance(
      CINEMA_COORDINATES.latitude,
      CINEMA_COORDINATES.longitude,
      CINEMA_COORDINATES.latitude,
      CINEMA_COORDINATES.longitude
    );
    expect(d0).toBe(0);

    const d1 = service.calculateHaversineDistance(
      CINEMA_COORDINATES.latitude,
      CINEMA_COORDINATES.longitude,
      CINEMA_COORDINATES.latitude + 0.001,
      CINEMA_COORDINATES.longitude
    );
    expect(d1).toBeGreaterThan(100);
    expect(d1).toBeLessThan(120);
  });

  it('debe proveer el texto de guía exacto para la Sala 2 (SC-07.2.1)', () => {
    const text = gpsGuidanceService.getGuidanceTextForRoom('Sala 2');
    expect(text).toContain('Sube por las escaleras eléctricas al 2do piso y gira a la izquierda para ingresar a la Sala 2.');
  });

  it('debe retornar proximidad y tiempo estimado de taquilla sin bloquear ante denegación (RB-MOB-04)', async () => {
    const guidance = await gpsGuidanceService.checkProximityAndGuidance('Sala 2');

    expect(guidance).toBeDefined();
    expect(guidance.isNearCinema).toBe(true);
    expect(guidance.guidanceText).toContain('Sala 2');
    expect(guidance.estimatedWaitMinutes).toBeLessThan(10);
  });
});

// Componente Integrador para simulación de Escenario 1 (Modo Avión y Visor QR)
const OfflineTicketPresentationApp: React.FC = () => {
  const [selectedTicket, setSelectedTicket] = useState<OfflineTicketRecord | null>(null);

  return (
    <div>
      <MyTicketsList onViewQr={(tck) => setSelectedTicket(tck)} />
      {selectedTicket && (
        <QrCodeViewer ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}
    </div>
  );
};

describe('Escenario 1: Presentación de Boleto en Modo Avión / Offline (SC-07.1.1)', () => {
  beforeEach(async () => {
    await db.offlineTickets.clear();
  });

  it('debe cargar la interfaz sin errores, recuperar el boleto de IndexedDB y mostrar el QR con firma HMAC en Modo Avión', async () => {
    // GIVEN que el cliente compró un boleto y lo tiene guardado en IndexedDB
    const confirmedTicket: Omit<OfflineTicketRecord, 'id'> = {
      ticketId: 'tck-airplane-007',
      peliculaTitulo: 'Dune: Parte 2',
      salaNombre: 'Sala 2',
      butacaCodigo: 'C-8',
      fechaHoraFuncion: '2026-11-03T18:30:00Z',
      qrJsonPayload: JSON.stringify({
        ticketId: 'tck-airplane-007',
        seatCode: 'C-8',
        hashSignature: 'HMAC-SHA256-SIGNATURE-OK',
      }),
      descargadoEn: new Date().toISOString(),
    };
    await offlineStorageService.saveTicket(confirmedTicket);

    // Y activa el "Modo Avión" simulando desconexión
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });

    // WHEN abre la aplicación y consulta "Mis Boletos"
    render(<OfflineTicketPresentationApp />);

    // THEN la interfaz se carga sin errores y el badge de modo avión aparece
    await waitFor(() => {
      expect(screen.getByTestId('offline-mode-badge')).toBeInTheDocument();
      expect(screen.getByText(/Modo Avión Activado/)).toBeInTheDocument();
      expect(screen.getByText('Dune: Parte 2')).toBeInTheDocument();
      expect(screen.getByText('C-8')).toBeInTheDocument();
    });

    // AND pulsa en Ver Código QR
    const viewQrBtn = screen.getByTestId('view-qr-btn-tck-airplane-007');
    fireEvent.click(viewQrBtn);

    // AND despliega el código QR dinámico con la firma HMAC-SHA256
    await waitFor(() => {
      expect(screen.getByTestId('qr-code-viewer')).toBeInTheDocument();
      expect(screen.getByTestId('dynamic-qr-svg')).toBeInTheDocument();
      expect(screen.getByText(/HMAC-SHA256-SIGNATURE-OK/)).toBeInTheDocument();
    });
  });
});

describe('Escenario 2: Activación de la Tarjeta de Guía GPS hacia la Sala (SC-07.2.1)', () => {
  it('debe desplegar la tarjeta Orientación en el Complejo, texto de indicaciones y tiempo en taquilla', async () => {
    // GIVEN que el cliente con entrada para la Sala 2 abre el detalle dentro del cine
    // WHEN autoriza los permisos de geolocalización
    const mockGuidance = {
      latitude: -16.5000,
      longitude: -68.1500,
      isNearCinema: true,
      distanceMeters: 25,
      guidanceText:
        'Te encuentras cerca de la entrada principal. Sube por las escaleras eléctricas al 2do piso y gira a la izquierda para ingresar a la Sala 2.',
      estimatedWaitMinutes: 4,
    };

    render(<GpsGuidanceCard roomName="Sala 2" initialGuidance={mockGuidance} />);

    // THEN la app despliega la tarjeta informativa "Orientación en el Complejo"
    expect(screen.getByText('Orientación en el Complejo')).toBeInTheDocument();

    // AND muestra el texto exacto de llegada a la Sala 2
    expect(
      screen.getByText(
        'Te encuentras cerca de la entrada principal. Sube por las escaleras eléctricas al 2do piso y gira a la izquierda para ingresar a la Sala 2.'
      )
    ).toBeInTheDocument();

    // AND despliega el indicador de afluencia
    expect(
      screen.getByText('Tiempo estimado en taquilla: Menos de 5 minutos (fila despejada)')
    ).toBeInTheDocument();
  });
});
