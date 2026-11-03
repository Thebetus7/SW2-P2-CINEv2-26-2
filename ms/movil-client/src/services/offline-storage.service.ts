import Dexie, { Table } from 'dexie';

export interface OfflineTicketRecord {
  id?: number;
  ticketId: string;
  showtimeId?: string;
  peliculaTitulo: string;
  salaNombre: string;
  butacaCodigo: string;
  fechaHoraFuncion: string;
  qrJsonPayload: string;
  jpegImageBlob?: Blob | string;
  descargadoEn: string;
}

export class CineClientDatabase extends Dexie {
  offlineTickets!: Table<OfflineTicketRecord, number>;

  constructor() {
    super('CineClientDB');
    this.version(1).stores({
      offlineTickets: '++id, ticketId, showtimeId, descargadoEn',
    });
  }
}

export const db = new CineClientDatabase();

export class OfflineStorageService {
  private database: CineClientDatabase;

  constructor(customDb?: CineClientDatabase) {
    this.database = customDb || db;
  }

  async saveTicket(ticket: Omit<OfflineTicketRecord, 'id'>): Promise<number> {
    const existing = await this.database.offlineTickets.where('ticketId').equals(ticket.ticketId).first();
    if (existing && existing.id) {
      await this.database.offlineTickets.update(existing.id, ticket);
      return existing.id;
    }
    return (await this.database.offlineTickets.add(ticket as OfflineTicketRecord)) as number;
  }

  async getAllTickets(): Promise<OfflineTicketRecord[]> {
    return await this.database.offlineTickets.orderBy('descargadoEn').reverse().toArray();
  }

  async getTicketById(ticketId: string): Promise<OfflineTicketRecord | undefined> {
    return await this.database.offlineTickets.where('ticketId').equals(ticketId).first();
  }

  async deleteTicket(ticketId: string): Promise<void> {
    await this.database.offlineTickets.where('ticketId').equals(ticketId).delete();
  }

  async clearAllTickets(): Promise<void> {
    await this.database.offlineTickets.clear();
  }

  async saveTicketWithBlob(
    ticketData: Omit<OfflineTicketRecord, 'id' | 'jpegImageBlob'>,
    imageUrl?: string
  ): Promise<number> {
    let blob: Blob | undefined;
    if (imageUrl) {
      try {
        const response = await fetch(imageUrl);
        if (response.ok) {
          blob = await response.blob();
        }
      } catch (err) {
        console.warn('No se pudo descargar la imagen del ticket como blob:', err);
      }
    }

    return await this.saveTicket({
      ...ticketData,
      jpegImageBlob: blob || 'data:image/jpeg;base64,mocked-ticket-blob',
    });
  }
}

export const offlineStorageService = new OfflineStorageService();
export default offlineStorageService;
