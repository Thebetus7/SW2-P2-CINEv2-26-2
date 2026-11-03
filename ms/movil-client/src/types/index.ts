export interface Movie {
  id: string;
  title: string;
  synopsis: string;
  durationMinutes: number;
  genre: string;
  rating: string;
  posterUrl: string;
}

export interface Seat {
  id: string;
  code: string;
  row: string;
  number: number;
  isAvailable: boolean;
  price: number;
}

export interface Showtime {
  id: string;
  movieId: string;
  movieTitle: string;
  roomName: string;
  roomFloor?: number;
  startsAt: string;
  seats: Seat[];
}

export interface BillboardResponse {
  movies: Movie[];
  showtimes: Showtime[];
}

export interface InitiatePurchasePayload {
  ticketId: string;
  previewImageUrl: string;
  expiresAt: string;
  amount: number;
  seatCode: string;
  movieTitle: string;
  roomName: string;
}

export interface ConfirmPurchasePayload {
  ticketId: string;
  status: 'CONFIRMED' | 'PAID';
  qrJsonPayload: string;
  finalImageUrl: string;
  seatCode: string;
  movieTitle: string;
  roomName: string;
  startsAt: string;
}

export interface GpsLocationInfo {
  latitude: number;
  longitude: number;
  isNearCinema: boolean;
  distanceMeters: number;
  guidanceText: string;
  estimatedWaitMinutes: number;
}
