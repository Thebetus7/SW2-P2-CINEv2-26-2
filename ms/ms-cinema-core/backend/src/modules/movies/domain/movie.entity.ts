import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MovieRating {
  ATP = 'ATP',
  PG_13 = 'PG-13',
  R_16 = 'R-16',
  R_18 = 'R-18',
}

export enum MovieStatus {
  EN_CARTELERA = 'EN_CARTELERA',
  PROXIMO_ESTRENO = 'PROXIMO_ESTRENO',
  ARCHIVADA = 'ARCHIVADA',
}

@Entity('movies')
export class Movie {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'text', nullable: true })
  synopsis: string;

  @Column({ name: 'duration_minutes', type: 'int' })
  durationMinutes: number;

  @Column({ type: 'varchar', length: 10, default: MovieRating.PG_13 })
  rating: MovieRating | string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  genre: string;

  @Column({ name: 'poster_url', type: 'varchar', length: 255, nullable: true })
  posterUrl: string;

  @Column({ type: 'varchar', length: 20, default: MovieStatus.EN_CARTELERA })
  status: MovieStatus | string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
