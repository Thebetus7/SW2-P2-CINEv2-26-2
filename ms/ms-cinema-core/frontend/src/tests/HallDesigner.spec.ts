import { HallDesignerComponent, SeatModel } from '../app/features/halls/components/hall-designer.component';

describe('HallDesignerComponent (HU-04, HU-13)', () => {
  let component: HallDesignerComponent;
  let mockHttp: any;

  beforeEach(() => {
    mockHttp = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
    };
    component = new HallDesignerComponent(mockHttp);
  });

  it('debe generar la matriz paramétrica de butacas correctamente', () => {
    component.generateDemoSeats(5, 10);
    expect(component.seatRows.length).toBe(5);
    expect(component.seatRows[0].length).toBe(10);
    expect(component.seatRows[0][0].visibleCode).toBe('A-1');
    expect(component.seatRows[4][9].visibleCode).toBe('E-10');
  });

  it('debe reclasificar un asiento y actualizar la capacidad vendible total', () => {
    component.selectedHall = {
      id: 'hall-1',
      name: 'Sala Demo',
      totalRows: 2,
      columnsPerRow: 2,
      totalCapacity: 4,
      projectionType: '2D',
      status: 'ACTIVA',
    };

    component.generateDemoSeats(2, 2);
    expect(component.selectedHall.totalCapacity).toBe(4);

    const seat = component.seatRows[0][0]; // A-1
    component.activeBrush = 'PASILLO_BLOQUEADO';
    component.applyBrush(seat);

    expect(seat.seatType).toBe('PASILLO_BLOQUEADO');
    expect(seat.isActive).toBe(false);
    expect(component.selectedHall.totalCapacity).toBe(3);
  });
});
