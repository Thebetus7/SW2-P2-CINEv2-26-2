import { DynamoDbTicketAdapter, TicketMetadataRecord } from '../src/modules/tickets-media/infrastructure/dynamodb-ticket.adapter';
import { PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';

describe('DynamoDbTicketAdapter (PLAN-04, RF-07.3)', () => {
  let adapter: DynamoDbTicketAdapter;
  let mockDynamoClient: any;

  beforeEach(() => {
    mockDynamoClient = {
      send: jest.fn().mockResolvedValue({}),
    };
    adapter = new DynamoDbTicketAdapter(mockDynamoClient);
  });

  it('debe persistir los metadatos del boleto con PutItemCommand en la tabla TicketMetadata', async () => {
    const record: TicketMetadataRecord = {
      ticketId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      seatId: 'e1f14798-2936-4d08-8123-cb84524458d1',
      showtimeId: 'a9a85f64-5717-4562-b3fc-2c963f66af11',
      issuedAt: '2026-11-03T01:50:00Z',
      cryptoSignature: 'b5a932c0f21448d3885d56b00684f09d846b4f74d022b7a9768fb7d206f40b3c',
      s3JpegUrl: 'http://localhost:9000/cine-tickets/tickets/3fa85f64.jpg',
    };

    await adapter.saveTicketMetadata(record);

    expect(mockDynamoClient.send).toHaveBeenCalledTimes(1);
    const sentCommand = mockDynamoClient.send.mock.calls[0][0];
    expect(sentCommand).toBeInstanceOf(PutItemCommand);
    expect(sentCommand.input.TableName).toBe('TicketMetadata');
    expect(sentCommand.input.Item).toEqual({
      ticketId: { S: record.ticketId },
      seatId: { S: record.seatId },
      showtimeId: { S: record.showtimeId },
      issuedAt: { S: record.issuedAt },
      cryptoSignature: { S: record.cryptoSignature },
      s3JpegUrl: { S: record.s3JpegUrl },
    });
  });

  it('debe recuperar metadatos por ticketId correctamente', async () => {
    mockDynamoClient.send.mockResolvedValueOnce({
      Item: {
        ticketId: { S: 'ticket-1' },
        seatId: { S: 'seat-1' },
        showtimeId: { S: 'show-1' },
        issuedAt: { S: '2026-11-03T00:00:00Z' },
        cryptoSignature: { S: 'sig-123' },
        s3JpegUrl: { S: 'http://localhost:9000/cine-tickets/tickets/ticket-1.jpg' },
      },
    });

    const result = await adapter.getTicketMetadata('ticket-1');
    expect(result).not.toBeNull();
    expect(result?.ticketId).toBe('ticket-1');
    expect(result?.cryptoSignature).toBe('sig-123');
  });
});
