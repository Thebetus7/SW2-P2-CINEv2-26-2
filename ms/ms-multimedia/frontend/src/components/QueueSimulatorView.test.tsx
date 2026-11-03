// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { QueueSimulatorView } from './QueueSimulatorView';

// @ts-ignore
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('QueueSimulatorView (Frontend React)', () => {
  let container: HTMLDivElement | null = null;
  let root: any = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network offline in tests')));
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('debe renderizar el título del monitor y los botones de simulación', async () => {
    await act(async () => {
      root.render(<QueueSimulatorView />);
    });

    expect(container?.textContent).toContain('Monitor de Afluencia de Taquilla');
    expect(container?.textContent).toContain('[Simular Fila Normal] (8 personas)');
    expect(container?.textContent).toContain('[Simular Fila Congestionada] (45 personas)');
  });

  it('debe activar estado CONGESTIONADA al hacer clic en [Simular Fila Congestionada] (SC-03.2.1)', async () => {
    let notifyDone: () => void = () => {};
    const simulationDone = new Promise<void>((resolve) => {
      notifyDone = resolve;
    });

    await act(async () => {
      root.render(<QueueSimulatorView onSimulationComplete={() => notifyDone()} />);
    });

    const btnCongested = container?.querySelector('#btn-simulate-congested') as HTMLButtonElement;
    expect(btnCongested).toBeTruthy();

    await act(async () => {
      btnCongested.click();
      await simulationDone;
    });

    // SC-03.2.1: Aviso "Taquilla Congestionada: 45 personas en fila"
    expect(container?.textContent).toContain('Taquilla Congestionada: 45 personas en fila');
    expect(container?.textContent).toContain('CONGESTIONADA');
    expect(container?.textContent).toContain('45');
  });

  it('debe activar estado NORMAL al hacer clic en [Simular Fila Normal]', async () => {
    let notifyDone: () => void = () => {};
    const simulationDone = new Promise<void>((resolve) => {
      notifyDone = resolve;
    });

    await act(async () => {
      root.render(<QueueSimulatorView onSimulationComplete={() => notifyDone()} />);
    });

    const btnNormal = container?.querySelector('#btn-simulate-normal') as HTMLButtonElement;
    expect(btnNormal).toBeTruthy();

    await act(async () => {
      btnNormal.click();
      await simulationDone;
    });

    expect(container?.textContent).toContain('Afluencia Normal: 8 personas en fila');
    expect(container?.textContent).toContain('NORMAL');
    expect(container?.textContent).toContain('8');
  });
});
