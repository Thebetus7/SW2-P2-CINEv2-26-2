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
import { Showtime } from './showtime.entity';
import { Seat } from '../../halls/domain/seat.entity';

export enum ShowtimeSeatStatus {
  DISPONIBLE = 'DISPONIBLE',
  RESERVADA_TEMPORAL = 'RESERVADA_TEMPORAL',
  OCUPADA = 'OCUPADA',
  BLOQUEADA_MANTENIMIENTO = 'BLOQUEADA_MANTENIMIENTO',
}

@Entity('showtime_seats')
@Index('idx_showtime_seat_unique', ['showtimeId', 'seatId'], { unique: true })
export class ShowtimeSeat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'showtime_id', type: 'uuid' })
  showtimeId: string;

  @ManyToOne(() => Showtime, (showtime) => showtime.seats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'showtime_id' })
  showtime: Showtime;

  @Column({ name: 'seat_id', type: 'uuid' })
  seatId: string;

  @ManyToOne(() => Seat, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seat_id' })
  seat: Seat;

  @Column({
    type: 'varchar',
    length: 25,
    default: ShowtimeSeatStatus.DISPONIBLE,
  })
  status: ShowtimeSeatStatus | string;

  @Column({ name: 'locked_until', type: 'timestamp', nullable: true })
  lockedUntil: Date | null;

  @Column({ name: 'locked_by_ticket_id', type: 'uuid', nullable: true })
  lockedByTicketId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
