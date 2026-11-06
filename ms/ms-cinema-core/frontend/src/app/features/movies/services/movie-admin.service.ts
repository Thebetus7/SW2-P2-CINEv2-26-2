import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  MovieRating,
  MovieStatus,
} from '../models/movie.model';
import type {
  Movie,
  CreateMovieDto,
  AnalyzePosterResponse,
  AnalyzePosterResult,
} from '../models/movie.model';

export { MovieRating, MovieStatus };
export type { Movie, CreateMovieDto, AnalyzePosterResponse, AnalyzePosterResult };

@Injectable({
  providedIn: 'root',
})
export class MovieAdminService {
  private readonly cinemaCoreUrl = 'http://localhost:3000/api/v1/movies';
  private readonly multimediaUrl = 'http://localhost:3001/api/v1/multimedia/movies/analyze-poster';

  constructor(private readonly http: HttpClient) {}

  /**
   * Sube el póster al microservicio MS MULTIMEDIA para inferencia con TensorFlow COCO-SSD
   * y persistencia en MinIO S3 (T1.1, PLAN-01).
   * Adjunta el archivo en los campos 'poster' y 'file' para máxima compatibilidad con el backend.
   */
  analyzePoster(file: File): Observable<AnalyzePosterResponse> {
    const formData = new FormData();
    formData.append('poster', file, file.name);
    formData.append('file', file, file.name);
    return this.http.post<AnalyzePosterResponse>(this.multimediaUrl, formData);
  }

  /**
   * Obtiene la lista completa de películas desde MS CINEMA-CORE.
   */
  getMovies(): Observable<Movie[]> {
    return this.http.get<Movie[]>(this.cinemaCoreUrl);
  }

  /**
   * Obtiene una película por su identificador único.
   */
  getMovieById(id: string): Observable<Movie> {
    return this.http.get<Movie>(`${this.cinemaCoreUrl}/${id}`);
  }

  /**
   * Registra una nueva película en la base de datos de MS CINEMA-CORE.
   */
  createMovie(payload: CreateMovieDto | Partial<Movie>): Observable<Movie> {
    return this.http.post<Movie>(this.cinemaCoreUrl, payload);
  }

  /**
   * Realiza el archivado lógico de una película (RB-09, SC-08.5.1).
   * Envía solicitud PATCH a Cinema-Core sin invocar DELETE destructivo.
   */
  archiveMovie(id: string): Observable<Movie> {
    return this.http.patch<Movie>(`${this.cinemaCoreUrl}/${id}/archive`, {
      status: MovieStatus.ARCHIVADA,
    });
  }

  /**
   * Actualiza el estado del ciclo de vida de una película.
   */
  updateStatus(id: string, status: MovieStatus | string): Observable<Movie> {
    return this.http.patch<Movie>(`${this.cinemaCoreUrl}/${id}`, { status });
  }
}
