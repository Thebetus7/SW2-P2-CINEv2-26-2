import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarDrawer } from '../components/Navigation/SidebarDrawer';
import { ShowtimeCardList } from '../components/Chatbot/ShowtimeCardList';
import { SelectedShowtimeHero } from '../components/Chatbot/SelectedShowtimeHero';
import { SeatSelectorPills } from '../components/Chatbot/SeatSelectorPills';
import { PurchaseSummaryCard } from '../components/Chatbot/PurchaseSummaryCard';
import { EmptySearchCard } from '../components/Chatbot/EmptySearchCard';
import { ChatFaqHub } from '../components/Chatbot/ChatFaqHub';
import { ShowtimeCard, RecommendedSeat, PurchaseSummary, EmptyStateInfo } from '../types/client-chat.types';

describe('SidebarDrawer Component (Rediseño Lateral UI)', () => {
  const dummyUser = {
    token: 'jwt-123',
    email: 'cliente@cine.local',
    fullName: 'Juan Pérez',
    role: 'CLIENTE',
  };

  it('debe mantenerse cerrado u oculto cuando isOpen es false', () => {
    render(
      <SidebarDrawer
        isOpen={false}
        onClose={vi.fn()}
        activeTab="billboard"
        onNavigateTab={vi.fn()}
        onOpenChat={vi.fn()}
        onOpenAuth={vi.fn()}
        currentUser={dummyUser}
        onLogout={vi.fn()}
      />
    );

    const aside = screen.getByTestId('sidebar-drawer-panel');
    expect(aside).toHaveClass('-translate-x-full');
    expect(screen.queryByTestId('sidebar-backdrop')).not.toBeInTheDocument();
  });

  it('debe desplegarse y mostrar perfil, enlaces y estado de conectividad cuando isOpen es true', () => {
    const handleClose = vi.fn();
    const handleNavigate = vi.fn();
    const handleOpenChat = vi.fn();
    const handleLogout = vi.fn();

    render(
      <SidebarDrawer
        isOpen={true}
        onClose={handleClose}
        activeTab="billboard"
        onNavigateTab={handleNavigate}
        onOpenChat={handleOpenChat}
        onOpenAuth={vi.fn()}
        currentUser={dummyUser}
        onLogout={handleLogout}
        unreadNotifications={3}
      />
    );

    const aside = screen.getByTestId('sidebar-drawer-panel');
    expect(aside).toHaveClass('translate-x-0');
    expect(screen.getByTestId('sidebar-backdrop')).toBeInTheDocument();

    // Verificación de datos de perfil
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('cliente@cine.local')).toBeInTheDocument();
    expect(screen.getByText('CLIENTE')).toBeInTheDocument();

    // Verificación de enlaces de navegación
    expect(screen.getByTestId('sidebar-link-billboard')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-link-tickets')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-link-chat')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-link-gps')).toBeInTheDocument();
    expect(screen.getByText('GCP / Online')).toBeInTheDocument();

    // Navegar a Mis Boletos
    fireEvent.click(screen.getByTestId('sidebar-link-tickets'));
    expect(handleNavigate).toHaveBeenCalledWith('tickets');
    expect(handleClose).toHaveBeenCalled();

    // Abrir Chat IA desde Sidebar
    fireEvent.click(screen.getByTestId('sidebar-link-chat'));
    expect(handleOpenChat).toHaveBeenCalled();

    // Cerrar sesión
    fireEvent.click(screen.getByTestId('sidebar-logout-btn'));
    expect(handleLogout).toHaveBeenCalled();
  });

  it('debe mostrar botón de iniciar sesión cuando currentUser es null', () => {
    const handleOpenAuth = vi.fn();
    render(
      <SidebarDrawer
        isOpen={true}
        onClose={vi.fn()}
        activeTab="billboard"
        onNavigateTab={vi.fn()}
        onOpenChat={vi.fn()}
        onOpenAuth={handleOpenAuth}
        currentUser={null}
        onLogout={vi.fn()}
      />
    );

    const loginBtn = screen.getByTestId('sidebar-auth-login-btn');
    expect(loginBtn).toBeInTheDocument();
    fireEvent.click(loginBtn);
    expect(handleOpenAuth).toHaveBeenCalled();
  });
});

describe('Rich Client Chat Components (Paridad 1:1 con Panel Web)', () => {
  it('ShowtimeCardList debe renderizar las tarjetas de funciones y permitir seleccionar una', () => {
    const dummyCards: ShowtimeCard[] = [
      {
        showtimeId: 'st-01',
        movieTitle: 'Dune: Parte 2',
        hallName: 'Sala 1 (IMAX)',
        hallType: 'IMAX Laser',
        startTime: '19:00',
        price: 45.0,
      },
      {
        showtimeId: 'st-02',
        movieTitle: 'Kung Fu Panda 4',
        hallName: 'Sala 3',
        hallType: '2D',
        startTime: '16:30',
        price: 35.0,
      },
    ];

    const handleSelect = vi.fn();
    render(<ShowtimeCardList cards={dummyCards} onSelect={handleSelect} />);

    expect(screen.getByText('Dune: Parte 2')).toBeInTheDocument();
    expect(screen.getByText('Kung Fu Panda 4')).toBeInTheDocument();
    expect(screen.getByText('Bs. 45.00')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('showtime-card-st-01'));
    expect(handleSelect).toHaveBeenCalledWith(dummyCards[0]);
  });

  it('SelectedShowtimeHero debe mostrar la función seleccionada y botón para cambiarla', () => {
    const card: ShowtimeCard = {
      showtimeId: 'st-01',
      movieTitle: 'Oppenheimer',
      hallName: 'Sala 2',
      hallType: 'Dolby Atmos',
      startTime: '21:00',
      price: 40.0,
    };
    const handleChange = vi.fn();
    render(<SelectedShowtimeHero card={card} onChangeShowtime={handleChange} />);

    expect(screen.getByTestId('selected-showtime-hero')).toBeInTheDocument();
    expect(screen.getByText('Oppenheimer')).toBeInTheDocument();
    expect(screen.getByText('Sala 2')).toBeInTheDocument();

    const changeBtn = screen.getByTestId('change-showtime-button');
    fireEvent.click(changeBtn);
    expect(handleChange).toHaveBeenCalled();
  });

  it('SeatSelectorPills debe renderizar pantalla de sala y soportar selección individual y múltiple', () => {
    const dummySeats: RecommendedSeat[] = [
      { seatCode: 'C-4', row: 'C', number: 4, isOptimal: true, badge: 'Visión Óptima' },
      { seatCode: 'C-5', row: 'C', number: 5, isOptimal: true, badge: 'Central' },
      { seatCode: 'C-6', row: 'C', number: 6, isOptimal: true, badge: 'Central' },
    ];
    const handleSelect = vi.fn();
    render(<SeatSelectorPills seats={dummySeats} onSelect={handleSelect} />);

    expect(screen.getByText(/Pantalla de la Sala/i)).toBeInTheDocument();
    expect(screen.getByText('C-4')).toBeInTheDocument();
    expect(screen.getByText('C-5')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('seat-pill-C-4'));
    expect(handleSelect).toHaveBeenCalledWith(dummySeats[0]);
  });

  it('PurchaseSummaryCard debe desglosar el resumen y activar el flujo de pago', () => {
    const summary: PurchaseSummary = {
      showtimeId: 'st-01',
      movieTitle: 'Dune: Parte 2',
      hallName: 'Sala 1 (IMAX)',
      seatCode: 'C-5',
      startTime: '19:00',
      unitPrice: 45.0,
      totalPrice: 45.0,
    };
    const handleProceed = vi.fn();
    const handleBackSeats = vi.fn();
    const handleBackShowtimes = vi.fn();

    render(
      <PurchaseSummaryCard
        summary={summary}
        onProceedToPayment={handleProceed}
        onBackToSeats={handleBackSeats}
        onBackToShowtimes={handleBackShowtimes}
      />
    );

    expect(screen.getByTestId('purchase-summary-card')).toBeInTheDocument();
    expect(screen.getByText('Bs. 45.00')).toBeInTheDocument();
    expect(screen.getByText('C-5')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('proceed-payment-button'));
    expect(handleProceed).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('summary-back-to-seats-button'));
    expect(handleBackSeats).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('summary-back-to-showtimes-button'));
    expect(handleBackShowtimes).toHaveBeenCalled();
  });

  it('EmptySearchCard debe renderizar mensaje de fallback amigable y sugerir géneros', () => {
    const emptyState: EmptyStateInfo = {
      title: 'No encontramos funciones para terror',
      message: 'No hay proyecciones de terror el día de hoy.',
      availableGenres: ['Acción', 'Animación', 'Drama'],
    };
    const handleGenre = vi.fn();
    const handleAll = vi.fn();

    render(
      <EmptySearchCard
        emptyState={emptyState}
        onExploreGenre={handleGenre}
        onExploreAll={handleAll}
      />
    );

    expect(screen.getByTestId('chat-empty-search-card')).toBeInTheDocument();
    expect(screen.getByText('No encontramos funciones para terror')).toBeInTheDocument();
    expect(screen.getByText('Acción')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Acción'));
    expect(handleGenre).toHaveBeenCalledWith('Ver películas de Acción');

    fireEvent.click(screen.getByTestId('empty-card-explore-all-btn'));
    expect(handleAll).toHaveBeenCalled();
  });

  it('ChatFaqHub debe permitir consultar preguntas frecuentes con 1 clic', () => {
    const handleSelectQuestion = vi.fn();
    render(<ChatFaqHub onSelectQuestion={handleSelectQuestion} />);

    expect(screen.getByTestId('chat-faq-hub')).toBeInTheDocument();
    const faqBtn = screen.getByText('¿Qué funciones hay para hoy en la tarde?');
    fireEvent.click(faqBtn);
    expect(handleSelectQuestion).toHaveBeenCalledWith('¿Qué funciones hay para hoy en la tarde?');
  });
});
