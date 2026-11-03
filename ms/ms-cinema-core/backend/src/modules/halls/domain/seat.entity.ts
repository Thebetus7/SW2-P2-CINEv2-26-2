import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { CinemaHall } from './cinema-hall.entity';

export enum SeatType {
  ESTANDAR = 'ESTANDAR',
  VIP = 'VIP',
  DISCAPACIDAD = 'DISCAPACIDAD',
  PASILLO_BLOQUEADO = 'PASILLO_BLOQUEADO',
}

@Entity('seats')
@Index('idx_seats_hall_row_col', ['hallId', 'rowLetter', 'seatNumber'], { unique: true })
export class Seat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'hall_id', type: 'uuid' })
  hallId: string;

  @ManyToOne(() => CinemaHall, (hall) => hall.seats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hall_id' })
  hall: CinemaHall;

  @Column({ name: 'row_letter', type: 'varchar', length: 2 })
  rowLetter: string;

  @Column({ name: 'seat_number', type: 'int' })
  seatNumber: number;

  @Column({ name: 'visible_code', type: 'varchar', length: 10 })
  visibleCode: string;

  @Column({ name: 'seat_type', type: 'varchar', length: 30, default: SeatType.ESTANDAR })
  seatType: SeatType | string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
