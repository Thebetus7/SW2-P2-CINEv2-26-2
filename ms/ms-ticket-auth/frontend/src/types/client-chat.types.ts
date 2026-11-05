export type ChatFlowState =
  | 'EXPLORING'
  | 'SHOWTIME_SELECTED'
  | 'SEAT_ASSIGNED'
  | 'PAYMENT_PENDING'
  | 'TICKET_ISSUED';

export interface ShowtimeCard {
  showtimeId: string;
  movieTitle: string;
  posterUrl?: string;
  hallName: string;
  hallType: string;
  startTime: string;
  price: number;
}

export interface RecommendedSeat {
  seatCode: string;
  row: string;
  number: number;
  isOptimal: boolean;
  badge: string;
}

export interface PurchaseSummary {
  showtimeId: string;
  movieTitle: string;
  hallName: string;
  hallType?: string;
  seatCode: string;
  startTime: string;
  unitPrice: number;
  totalPrice: number;
}

export interface IssuedTicketInfo {
  ticketId: string;
  qrPayload: string;
  movieTitle: string;
  seatCode: string;
  hallName: string;
  formattedDate: string;
  totalPaid: number;
}

export interface ClientChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  showtimeCards?: ShowtimeCard[];
  recommendedSeats?: RecommendedSeat[];
  summary?: PurchaseSummary;
  issuedTicket?: IssuedTicketInfo;
  quickChips?: string[];
}

