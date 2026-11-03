import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ManualEntryModal } from '../ManualEntryModal';

describe('ManualEntry', () => {
  it('no renderiza nada cuando isOpen es false', () => {
    render(<ManualEntryModal isOpen={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.queryByTestId('manual-entry-modal')).toBeNull();
  });

  it('renderiza la ventana modal y campo de texto cuando isOpen es true', () => {
    render(<ManualEntryModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByTestId('manual-entry-modal')).toBeTruthy();
    expect(screen.getByTestId('manual-entry-input')).toBeTruthy();
    expect(screen.getByText('Validación Manual de Boleto')).toBeTruthy();
  });

  it('dispara el submit con el payload parseado si el usuario ingresa JSON', () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    render(<ManualEntryModal isOpen={true} onClose={onClose} onSubmit={onSubmit} />);

    const jsonString = JSON.stringify({
      ticketId: 'TCK-2026-0001',
      seatId: 'B-04',
      showtimeId: 'SHW-10',
      issuedAt: '2026-11-03T18:00:00Z',
      sig: 'abcdef1234567890',
    });

    const input = screen.getByTestId('manual-entry-input');
    fireEvent.change(input, { target: { value: jsonString } });

    const submitBtn = screen.getByTestId('manual-entry-submit');
    fireEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      raw: jsonString,
      payload: expect.objectContaining({
        ticketId: 'TCK-2026-0001',
        seatId: 'B-04',
      }),
    });
  });

  it('permite enviar ID simple si se ingresa texto plano', () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    render(<ManualEntryModal isOpen={true} onClose={onClose} onSubmit={onSubmit} />);

    const input = screen.getByTestId('manual-entry-input');
    fireEvent.change(input, { target: { value: 'TCK-MANUAL-99' } });

    const submitBtn = screen.getByTestId('manual-entry-submit');
    fireEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith({
      raw: 'TCK-MANUAL-99',
      payload: null,
    });
  });

  it('llama onClose al presionar el boton de cerrar', () => {
    const onClose = vi.fn();
    render(<ManualEntryModal isOpen={true} onClose={onClose} onSubmit={vi.fn()} />);

    const closeBtn = screen.getByTestId('manual-entry-close');
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
