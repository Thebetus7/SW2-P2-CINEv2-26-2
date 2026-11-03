import { Geolocation } from '@capacitor/geolocation';
import { GpsLocationInfo } from '../types';

export const CINEMA_COORDINATES = {
  latitude: -16.5000,
  longitude: -68.1500,
};

export class GpsGuidanceService {
  private cinemaLat: number;
  private cinemaLng: number;

  constructor(cinemaLat: number = CINEMA_COORDINATES.latitude, cinemaLng: number = CINEMA_COORDINATES.longitude) {
    this.cinemaLat = cinemaLat;
    this.cinemaLng = cinemaLng;
  }

  // Fórmula Haversine para calcular distancia en metros entre dos coordenadas geográficas
  calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Radio de la Tierra en metros
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  }

  getGuidanceTextForRoom(roomName: string): string {
    const normalized = roomName.toLowerCase();
    if (normalized.includes('2')) {
      return 'Te encuentras cerca de la entrada principal. Sube por las escaleras eléctricas al 2do piso y gira a la izquierda para ingresar a la Sala 2.';
    }
    if (normalized.includes('1')) {
      return 'Te encuentras en planta baja. Avanza 30 metros por el pasillo central hacia la Sala 1.';
    }
    return `Dirígete al pasillo general siguiendo los letreros luminosos hacia la ${roomName}.`;
  }

  async checkProximityAndGuidance(roomName: string = 'Sala 2'): Promise<GpsLocationInfo> {
    const guidanceText = this.getGuidanceTextForRoom(roomName);

    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 5000,
      });

      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;
      const distance = this.calculateHaversineDistance(userLat, userLng, this.cinemaLat, this.cinemaLng);
      const isNear = distance <= 500;

      return {
        latitude: userLat,
        longitude: userLng,
        isNearCinema: isNear,
        distanceMeters: distance,
        guidanceText,
        estimatedWaitMinutes: 4,
      };
    } catch (err) {
      // Manejo de denegación de permisos o entorno sin GPS (RB-MOB-04)
      console.warn('[GpsGuidanceService] Fallback de ubicación sin GPS nativo:', err);
      return {
        latitude: this.cinemaLat,
        longitude: this.cinemaLng,
        isNearCinema: true,
        distanceMeters: 50,
        guidanceText,
        estimatedWaitMinutes: 4,
      };
    }
  }
}

export const gpsGuidanceService = new GpsGuidanceService();
export default gpsGuidanceService;
