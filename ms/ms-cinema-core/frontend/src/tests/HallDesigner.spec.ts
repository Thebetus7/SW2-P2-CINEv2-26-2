import { HallDesignerComponent, SeatModel, Hall } from '../app/features/halls/components/hall-designer.component';
import { of } from 'rxjs';

describe('HallDesignerComponent (HU-04, HU-13)', () => {
  let component: HallDesignerComponent;
  let mockHttp: any;

  beforeEach(() => {
    mockHttp = {
      get: jest.fn().mockReturnValue(of([])),
      post: jest.fn().mockReturnValue(of({})),
      patch: jest.fn().mockReturnValue(of({ updatedCapacity: 3 })),
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

  it('debe enviar PATCH al backend incluso cuando el ID de la butaca sea un UUID con guiones', () => {
    const uuidSeat: SeatModel = {
      id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
      hallId: 'hall-uuid-1234',
      rowLetter: 'A',
      seatNumber: 1,
      visibleCode: 'A-1',
      seatType: 'ESTANDAR',
      isActive: true,
    };

    component.selectedHall = {
      id: 'hall-uuid-1234',
      name: 'Sala IMAX',
      totalRows: 1,
      columnsPerRow: 1,
      totalCapacity: 1,
      projectionType: 'IMAX',
      status: 'ACTIVA',
    };
    component.seatRows = [[uuidSeat]];

    component.activeBrush = 'VIP';
    component.applyBrush(uuidSeat);

    expect(uuidSeat.seatType).toBe('VIP');
    expect(uuidSeat.isActive).toBe(true);
    expect(mockHttp.patch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/halls/seats/a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
      {
        seatType: 'VIP',
        isActive: true,
      }
    );
    expect(component.modifiedSeats.has(uuidSeat)).toBe(true);
  });

  it('debe abrir modal de edición y actualizar la sala en backend y localmente', () => {
    const originalHall: Hall = {
      id: 'hall-uuid-999',
      name: 'Sala 1 - Tradicional',
      totalRows: 5,
      columnsPerRow: 5,
      totalCapacity: 25,
      projectionType: '2D',
      status: 'ACTIVA',
    };

    component.halls = [{ ...originalHall }];
    component.selectedHall = { ...originalHall };

    component.openEditHallModal();
    expect(component.openEditModal).toBe(true);
    expect(component.editHallForm.name).toBe('Sala 1 - Tradicional');

    // Cambiar valores en el formulario
    component.editHallForm.name = 'Sala 1 - Dolby Atmos 3D';
    component.editHallForm.projectionType = '3D';
    component.editHallForm.status = 'MANTENIMIENTO';

    const updatedHallResponse: Hall = {
      ...originalHall,
      name: 'Sala 1 - Dolby Atmos 3D',
      projectionType: '3D',
      status: 'MANTENIMIENTO',
    };
    mockHttp.patch.mockReturnValue(of(updatedHallResponse));

    component.updateHall();

    expect(mockHttp.patch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/halls/hall-uuid-999',
      {
        name: 'Sala 1 - Dolby Atmos 3D',
        projectionType: '3D',
        status: 'MANTENIMIENTO',
      }
    );
    expect(component.openEditModal).toBe(false);
    expect(component.selectedHall.name).toBe('Sala 1 - Dolby Atmos 3D');
    expect(component.selectedHall.projectionType).toBe('3D');
    expect(component.selectedHall.status).toBe('MANTENIMIENTO');
    expect(component.halls[0].name).toBe('Sala 1 - Dolby Atmos 3D');
  });

  it('debe guardar en batch las butacas modificadas con saveSeatChanges', () => {
    const seat1: SeatModel = {
      id: 'seat-uuid-1',
      hallId: 'hall-1',
      rowLetter: 'A',
      seatNumber: 1,
      visibleCode: 'A-1',
      seatType: 'VIP',
      isActive: true,
    };
    const seat2: SeatModel = {
      id: 'seat-uuid-2',
      hallId: 'hall-1',
      rowLetter: 'A',
      seatNumber: 2,
      visibleCode: 'A-2',
      seatType: 'DISCAPACIDAD',
      isActive: true,
    };

    component.selectedHall = {
      id: 'hall-1',
      name: 'Sala 1',
      totalRows: 1,
      columnsPerRow: 2,
      totalCapacity: 2,
      projectionType: '2D',
      status: 'ACTIVA',
    };
    component.seatRows = [[seat1, seat2]];
    component.modifiedSeats.add(seat1);
    component.modifiedSeats.add(seat2);

    mockHttp.patch.mockReturnValue(of({}));
    component.saveSeatChanges();

    expect(mockHttp.patch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/halls/seats/seat-uuid-1',
      { seatType: 'VIP', isActive: true }
    );
    expect(mockHttp.patch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/halls/seats/seat-uuid-2',
      { seatType: 'DISCAPACIDAD', isActive: true }
    );
    expect(component.modifiedSeats.size).toBe(0);
  });
});
