/**
 * Modelos de Dominio y Contratos de Películas para el Módulo de Notificaciones y Estrenos
 * Trazabilidad: Milestone M2 (T2.1, T2.2), PLAN-02, RF-08.1, RF-08.2, RF-08.3, RB-07, RB-08, RB-09
 */

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

export interface Movie {
  id?: string;
  title: string;
  synopsis?: string;
  durationMinutes: number;
  rating: MovieRating | 'ATP' | 'PG-13' | 'R-16' | 'R-18' | string;
  genre?: string;
  posterUrl?: string;
  status: MovieStatus | 'EN_CARTELERA' | 'PROXIMO_ESTRENO' | 'ARCHIVADA';
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMovieDto {
  title: string;
  synopsis?: string;
  durationMinutes: number;
  rating?: MovieRating | string;
  genre?: string;
  posterUrl?: string;
  status?: MovieStatus | string;
}

export interface AnalyzePosterResponse {
  posterUrl: string;
  suggestedGenre: string;
  suggestedRating: string;
  detectedTitle: string;
  inferenceTimeMs?: number;
  confidence?: number;
}

export type AnalyzePosterResult = AnalyzePosterResponse;
