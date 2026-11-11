import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MovieList } from '../components/Billboard/MovieList';
import { ShowtimeSelector } from '../components/Billboard/ShowtimeSelector';
import { SeatSelectionMap } from '../components/Purchase/SeatSelectionMap';
import { TicketPreviewModal } from '../components/Purchase/TicketPreviewModal';
import { StripeCheckoutWrapper } from '../components/Purchase/StripeCheckoutWrapper';
import { MyTicketsList } from '../components/Tickets/MyTicketsList';
import { QrCodeViewer } from '../components/Tickets/QrCodeViewer';
import { GpsGuidanceCard } from '../components/Navigation/GpsGuidanceCard';
import { DEFAULT_MOCK_MOVIES, DEFAULT_MOCK_SHOWTIMES } from '../services/showtimes-api.service';

describe('MovieList Component', () => {
  it('debe renderizar la lista de películas con títulos y datos clave', () => {
    const handleSelect = vi.fn();
    render(<MovieList movies={DEFAULT_MOCK_MOVIES} onSelectMovie={handleSelect} />);

    expect(screen.getByText('Cartelera en Estreno')).toBeInTheDocument();
    expect(screen.getByText('Dune: Parte 2')).toBeInTheDocument();
    expect(screen.getByText('Kung Fu Panda 4')).toBeInTheDocument();
    expect(screen.getByText('Oppenheimer')).toBeInTheDocument();
  });

  it('debe invocar onSelectMovie al hacer clic en Ver Funciones', () => {
    const handleSelect = vi.fn();
    render(<MovieList movies={DEFAULT_MOCK_MOVIES} onSelectMovie={handleSelect} />);

    const buttons = screen.getAllByRole('button', { name: /ver funciones/i });
    fireEvent.click(buttons[0]);

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith(DEFAULT_MOCK_MOVIES[0]);
  });

  it('debe mostrar el estado de skeleton cuando loading es true', () => {
    render(<MovieList loading={true} />);
    expect(screen.getByTestId('movie-list-loading')).toBeInTheDocument();
  });

  it('debe transicionar limpiamente de loading a películas cargadas sin quedar bloqueado en skeleton', () => {
    const { rerender } = render(<MovieList movies={[]} loading={true} />);
    expect(screen.getByTestId('movie-list-loading')).toBeInTheDocument();

    rerender(<MovieList movies={DEFAULT_MOCK_MOVIES} loading={false} />);
    expect(screen.queryByTestId('movie-list-loading')).not.toBeInTheDocument();
    expect(screen.getByText('Dune: Parte 2')).toBeInTheDocument();
  });

  it('debe mostrar mensaje amigable de cartelera vacía cuando no hay películas', () => {
    render(<MovieList movies={[]} loading={false} />);
    expect(screen.getByTestId('movie-list-empty')).toBeInTheDocument();
    expect(screen.getByText('No hay películas en cartelera')).toBeInTheDocument();
  });
});

describe('ShowtimeSelector Component', () => {
  const selectedMovie = DEFAULT_MOCK_MOVIES[0];
  const movieShowtimes = DEFAULT_MOCK_SHOWTIMES.filter((st) => st.movieId === selectedMovie.id);

  it('debe renderizar los horarios y salas de la película', () => {
    const handleSelect = vi.fn();
    render(
      <ShowtimeSelector
        movie={selectedMovie}
        showtimes={movieShowtimes}
        onSelectShowtime={handleSelect}
      />
    );

    expect(screen.getByText('Dune: Parte 2')).toBeInTheDocument();
    expect(screen.getByText('Selecciona Horario y Sala')).toBeInTheDocument();
    expect(screen.getByText(/Sala 2/)).toBeInTheDocument();
  });

  it('debe invocar onSelectShowtime al pulsar en una función', () => {
    const handleSelect = vi.fn();
    render(
      <ShowtimeSelector
        movie={selectedMovie}
        showtimes={movieShowtimes}
        onSelectShowtime={handleSelect}
      />
    );

    const firstItem = screen.getByTestId(`showtime-item-${movieShowtimes[0].id}`);
    fireEvent.click(firstItem);

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith(movieShowtimes[0]);
  });

  it('debe disparar fetch de funciones cuando initialShowtimes se pasa como array vacío []', async () => {
    const handleSelect = vi.fn();
    render(
      <ShowtimeSelector
        movie={selectedMovie}
        showtimes={[]}
        onSelectShowtime={handleSelect}
      />
    );

    // Debe mostrar loading o consultar y luego cargar las funciones
    await waitFor(() => {
      expect(screen.getByText(/Sala 2/)).toBeInTheDocument();
    });
  });
});

describe('SeatSelectionMap Component', () => {
  const sampleShowtime = DEFAULT_MOCK_SHOWTIMES[0];

  it('debe renderizar el plano de la sala con pantalla y butacas', () => {
    const handleSeatSelected = vi.fn();
    const handleContinue = vi.fn();
    render(
      <SeatSelectionMap
        showtime={sampleShowtime}
        onSeatSelected={handleSeatSelected}
        onContinue={handleContinue}
      />
    );

    expect(screen.getByText('Pantalla')).toBeInTheDocument();
    expect(screen.getByTestId('continue-purchase-btn')).toBeDisabled();
    expect(screen.getByTestId('seat-btn-A-1')).toBeInTheDocument();
  });

  it('debe permitir seleccionar una butaca disponible y habilitar Continuar Compra', () => {
    const handleSeatSelected = vi.fn();
    const handleContinue = vi.fn();
    render(
      <SeatSelectionMap
        showtime={sampleShowtime}
        onSeatSelected={handleSeatSelected}
        onContinue={handleContinue}
      />
    );

    const seatBtnA1 = screen.getByTestId('seat-btn-A-1');
    fireEvent.click(seatBtnA1);

    expect(handleSeatSelected).toHaveBeenCalled();
    const continueBtn = screen.getByTestId('continue-purchase-btn');
    expect(continueBtn).not.toBeDisabled();

    fireEvent.click(continueBtn);
    expect(handleContinue).toHaveBeenCalledTimes(1);
  });

  it('no debe permitir seleccionar una butaca ocupada', () => {
    const handleSeatSelected = vi.fn();
    const handleContinue = vi.fn();
    render(
      <SeatSelectionMap
        showtime={sampleShowtime}
        onSeatSelected={handleSeatSelected}
        onContinue={handleContinue}
      />
    );

    // B-4 está marcada ocupada
    const occupiedSeat = screen.getByTestId('seat-btn-B-4');
    expect(occupiedSeat).toBeDisabled();
    fireEvent.click(occupiedSeat);
    expect(handleSeatSelected).not.toHaveBeenCalled();
  });
});

describe('TicketPreviewModal Component', () => {
  it('no debe renderizarse cuando isOpen es false', () => {
    render(
      <TicketPreviewModal
        isOpen={false}
        ticketPreviewUrl="http://localhost:9000/preview.jpg"
        movieTitle="Dune: Parte 2"
        roomName="Sala 2"
        seatCode="C-8"
        amount={45.0}
        onConfirmAndProceedToPayment={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByTestId('ticket-preview-modal')).not.toBeInTheDocument();
  });

  it('debe mostrar la previsualización del ticket y los detalles cuando isOpen es true', () => {
    const handleProceed = vi.fn();
    const handleClose = vi.fn();
    render(
      <TicketPreviewModal
        isOpen={true}
        ticketPreviewUrl="http://localhost:9000/preview.jpg"
        movieTitle="Dune: Parte 2"
        roomName="Sala 2"
        seatCode="C-8"
        amount={45.0}
        onConfirmAndProceedToPayment={handleProceed}
        onClose={handleClose}
      />
    );

    expect(screen.getByTestId('ticket-preview-modal')).toBeInTheDocument();
    expect(screen.getByText('Previsualización de Entrada')).toBeInTheDocument();
    expect(screen.getByText('Dune: Parte 2')).toBeInTheDocument();
    expect(screen.getByText(/Butaca: C-8/)).toBeInTheDocument();
    expect(screen.getByText('Bs. 45.00')).toBeInTheDocument();

    const proceedBtn = screen.getByTestId('proceed-to-payment-btn');
    fireEvent.click(proceedBtn);
    expect(handleProceed).toHaveBeenCalledTimes(1);

    const closeBtn = screen.getByTestId('close-preview-modal-btn');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

describe('StripeCheckoutWrapper Component', () => {
  it('debe mostrar el temporizador y el botón de pago', () => {
    render(
      <StripeCheckoutWrapper
        ticketId="tck-01"
        amount={45.0}
        initialSeconds={60}
        onPaymentSuccess={vi.fn()}
        onPaymentCancel={vi.fn()}
      />
    );

    expect(screen.getByTestId('stripe-checkout-wrapper')).toBeInTheDocument();
    expect(screen.getByTestId('timer-display')).toHaveTextContent('00:60');
    expect(screen.getByRole('button', { name: /pagar bs\. 45\.00/i })).toBeInTheDocument();
  });

  it('debe rellenar la tarjeta de prueba con el botón demo', () => {
    render(
      <StripeCheckoutWrapper
        ticketId="tck-01"
        amount={45.0}
        initialSeconds={60}
        onPaymentSuccess={vi.fn()}
        onPaymentCancel={vi.fn()}
      />
    );

    const demoBtn = screen.getByTestId('demo-card-btn');
    fireEvent.click(demoBtn);

    const cardInput = screen.getByTestId('card-number-input') as HTMLInputElement;
    expect(cardInput.value).toBe('4242 4242 4242 4242');
  });

  it('debe mostrar alerta de expiración cuando los segundos llegan a 0', () => {
    const handleTimeout = vi.fn();
    render(
      <StripeCheckoutWrapper
        ticketId="tck-01"
        amount={45.0}
        initialSeconds={0}
        onPaymentSuccess={vi.fn()}
        onPaymentCancel={vi.fn()}
        onTimeout={handleTimeout}
      />
    );

    expect(screen.getByTestId('checkout-expired-alert')).toBeInTheDocument();
    expect(screen.getByText('Reserva Expirada')).toBeInTheDocument();
    expect(handleTimeout).toHaveBeenCalled();
  });
});

describe('MyTicketsListOffline Component', () => {
  const sampleTickets = [
    {
      id: 1,
      ticketId: 'tck-offline-01',
      peliculaTitulo: 'Dune: Parte 2',
      salaNombre: 'Sala 2',
      butacaCodigo: 'C-8',
      fechaHoraFuncion: '2026-11-03T20:00:00Z',
      qrJsonPayload: JSON.stringify({ ticketId: 'tck-offline-01', sig: 'hmac-abc' }),
      descargadoEn: new Date().toISOString(),
    },
  ];

  it('debe listar los boletos recuperados de la base IndexedDB local', () => {
    const handleViewQr = vi.fn();
    render(<MyTicketsList initialTickets={sampleTickets} onViewQr={handleViewQr} />);

    expect(screen.getByText('Mis Boletos Comprados')).toBeInTheDocument();
    expect(screen.getByText('Dune: Parte 2')).toBeInTheDocument();
    expect(screen.getByText(/Sala 2/)).toBeInTheDocument();
    expect(screen.getByText('C-8')).toBeInTheDocument();

    const viewQrBtn = screen.getByTestId('view-qr-btn-tck-offline-01');
    fireEvent.click(viewQrBtn);
    expect(handleViewQr).toHaveBeenCalledTimes(1);
    expect(handleViewQr).toHaveBeenCalledWith(sampleTickets[0]);
  });

  it('debe mostrar la vista vacía cuando no existen boletos almacenados', () => {
    render(<MyTicketsList initialTickets={[]} onViewQr={vi.fn()} />);
    expect(screen.getByTestId('empty-tickets-view')).toBeInTheDocument();
    expect(screen.getByText('No tienes boletos guardados')).toBeInTheDocument();
  });
});

describe('QrCodeViewer Component', () => {
  const sampleTicket = {
    id: 1,
    ticketId: 'tck-offline-01',
    peliculaTitulo: 'Dune: Parte 2',
    salaNombre: 'Sala 2',
    butacaCodigo: 'C-8',
    fechaHoraFuncion: '2026-11-03T20:00:00Z',
    qrJsonPayload: JSON.stringify({
      ticketId: 'tck-offline-01',
      hashSignature: 'HMAC-SHA256-SECRET-DEMO',
    }),
    descargadoEn: new Date().toISOString(),
  };

  it('debe renderizar el código QR de alto contraste y los datos de la butaca', () => {
    const handleClose = vi.fn();
    render(<QrCodeViewer ticket={sampleTicket} onClose={handleClose} />);

    expect(screen.getByTestId('qr-code-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('dynamic-qr-svg')).toBeInTheDocument();
    expect(screen.getByText('Código de Entrada Oficial')).toBeInTheDocument();
    expect(screen.getByText(/HMAC-SHA256-SECRET-DEMO/)).toBeInTheDocument();
    expect(screen.getByText('Butaca C-8')).toBeInTheDocument();
  });

  it('debe conmutar el modo de brillo al pulsar el botón de brillo', () => {
    render(<QrCodeViewer ticket={sampleTicket} onClose={vi.fn()} />);

    const brightnessBtn = screen.getByTestId('toggle-brightness-btn');
    expect(brightnessBtn).toHaveTextContent('Brillo Óptimo');

    fireEvent.click(brightnessBtn);
    expect(brightnessBtn).toHaveTextContent('Brillo Normal');
  });

  it('debe invocar onClose al pulsar cerrar visor', () => {
    const handleClose = vi.fn();
    render(<QrCodeViewer ticket={sampleTicket} onClose={handleClose} />);

    const closeBtn = screen.getByTestId('close-qr-viewer-btn');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

describe('GpsGuidanceCard Component (HU-18, SC-07.2.1)', () => {
  const sampleGuidance = {
    latitude: -16.5000,
    longitude: -68.1500,
    isNearCinema: true,
    distanceMeters: 50,
    guidanceText:
      'Te encuentras cerca de la entrada principal. Sube por las escaleras eléctricas al 2do piso y gira a la izquierda para ingresar a la Sala 2.',
    estimatedWaitMinutes: 4,
  };

  it('debe renderizar el título Orientación en el Complejo y las indicaciones de la Sala 2', () => {
    const handleClose = vi.fn();
    render(
      <GpsGuidanceCard
        roomName="Sala 2"
        initialGuidance={sampleGuidance}
        onClose={handleClose}
      />
    );

    expect(screen.getByTestId('gps-guidance-card')).toBeInTheDocument();
    expect(screen.getByText('Orientación en el Complejo')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Te encuentras cerca de la entrada principal. Sube por las escaleras eléctricas al 2do piso y gira a la izquierda para ingresar a la Sala 2.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('Tiempo estimado en taquilla: Menos de 5 minutos (fila despejada)')
    ).toBeInTheDocument();

    const closeBtn = screen.getByTestId('close-guidance-btn');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});






