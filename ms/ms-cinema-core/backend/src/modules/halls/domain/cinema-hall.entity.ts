import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Seat, SeatType } from './seat.entity';

export enum ProjectionType {
  TWO_D = '2D',
  THREE_D = '3D',
  IMAX = 'IMAX',
  VIP = 'VIP',
}

export enum HallStatus {
  ACTIVA = 'ACTIVA',
  EN_MANTENIMIENTO = 'EN_MANTENIMIENTO',
}

@Entity('cinema_halls')
export class CinemaHall {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80, unique: true })
  name: string;

  @Column({ name: 'total_rows', type: 'int' })
  totalRows: number;

  @Column({ name: 'columns_per_row', type: 'int' })
  columnsPerRow: number;

  @Column({ name: 'total_capacity', type: 'int' })
  totalCapacity: number;

  @Column({ name: 'projection_type', type: 'varchar', length: 20, default: ProjectionType.TWO_D })
  projectionType: ProjectionType | string;

  @Column({ type: 'varchar', length: 20, default: HallStatus.ACTIVA })
  status: HallStatus | string;

  @OneToMany(() => Seat, (seat) => seat.hall, { cascade: true })
  seats: Seat[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Recalcula la capacidad vendible deduciendo asientos inactivos o bloqueados por pasillo.
   */
  recalculateCapacity(): number {
    if (!this.seats || this.seats.length === 0) {
      return this.totalCapacity || this.totalRows * this.columnsPerRow;
    }
    const sellableSeats = this.seats.filter(
      (seat) => seat.isActive && seat.seatType !== SeatType.PASILLO_BLOQUEADO,
    );
    this.totalCapacity = sellableSeats.length;
    return this.totalCapacity;
  }
}
