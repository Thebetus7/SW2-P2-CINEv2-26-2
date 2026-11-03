import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Movie } from '../../movies/domain/movie.entity';
import { CinemaHall } from '../../halls/domain/cinema-hall.entity';
import { ShowtimeSeat } from './showtime-seat.entity';

export enum ShowtimeStatus {
  PROGRAMADA = 'PROGRAMADA',
  EN_CURSO = 'EN_CURSO',
  FINALIZADA = 'FINALIZADA',
  CANCELADA = 'CANCELADA',
}

@Entity('showtimes')
@Index('idx_showtimes_hall_time', ['hallId', 'startTime', 'endTime'])
export class Showtime {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'movie_id', type: 'uuid' })
  movieId: string;

  @ManyToOne(() => Movie, { eager: true })
  @JoinColumn({ name: 'movie_id' })
  movie: Movie;

  @Column({ name: 'hall_id', type: 'uuid' })
  hallId: string;

  @ManyToOne(() => CinemaHall, { eager: true })
  @JoinColumn({ name: 'hall_id' })
  hall: CinemaHall;

  @Column({ name: 'start_time', type: 'timestamp' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamp' })
  endTime: Date;

  @Column({ name: 'base_price', type: 'decimal', precision: 10, scale: 2, default: 45.00 })
  basePrice: number;

  @Column({ type: 'varchar', length: 20, default: ShowtimeStatus.PROGRAMADA })
  status: ShowtimeStatus | string;

  @OneToMany(() => ShowtimeSeat, (showtimeSeat) => showtimeSeat.showtime, { cascade: true })
  seats: ShowtimeSeat[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Computa inmutablemente la hora de finalización sumando duración + 20 minutos de limpieza (RB-CORE-02).
   */
  static computeEndTime(startTime: Date, durationMinutes: number): Date {
    const totalMinutes = durationMinutes + 20;
    return new Date(startTime.getTime() + totalMinutes * 60 * 1000);
  }
}
