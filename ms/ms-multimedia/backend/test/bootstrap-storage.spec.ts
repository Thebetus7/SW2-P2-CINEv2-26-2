import { bootstrapStorage } from '../src/config/bootstrap-storage';
import { CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';

describe('BootstrapStorage (INV-ARCH-01, RF-07.3)', () => {
  let mockS3: any;
  let mockDynamo: any;

  beforeEach(() => {
    mockS3 = {
      send: jest.fn(),
    };
    mockDynamo = {
      send: jest.fn(),
    };
  });

  it('debe crear buckets cine-posters y cine-tickets si no existen', async () => {
    // Simular que HeadBucket lanza NotFound (404)
    mockS3.send.mockImplementation(async (command: any) => {
      if (command instanceof HeadBucketCommand) {
        const error = new Error('Not Found');
        error.name = 'NotFound';
        throw error;
      }
      if (command instanceof CreateBucketCommand) {
        return { Location: `/${command.input.Bucket}` };
      }
      return {};
    });

    // Simular que DynamoDB describe lanza ResourceNotFoundException
    mockDynamo.send.mockImplementation(async (command: any) => {
      if (command instanceof DescribeTableCommand) {
        const error = new Error('ResourceNotFound');
        error.name = 'ResourceNotFoundException';
        throw error;
      }
      if (command instanceof CreateTableCommand) {
        return { TableDescription: { TableName: command.input.TableName } };
      }
      return {};
    });

    const result = await bootstrapStorage(mockS3, mockDynamo);
    expect(result.buckets).toContain('cine-posters');
    expect(result.buckets).toContain('cine-tickets');
    expect(result.tables).toContain('LineAnalytics');
    expect(result.tables).toContain('TicketMetadata');
  });

  it('debe manejar idempotencia si los buckets y tablas ya existen', async () => {
    mockS3.send.mockImplementation(async (command: any) => {
      if (command instanceof HeadBucketCommand) {
        return {};
      }
      return {};
    });

    mockDynamo.send.mockImplementation(async (command: any) => {
      if (command instanceof DescribeTableCommand) {
        return { Table: { TableName: command.input.TableName } };
      }
      return {};
    });

    const result = await bootstrapStorage(mockS3, mockDynamo);
    expect(result.buckets).toEqual(['cine-posters', 'cine-tickets']);
    expect(result.tables).toEqual(['LineAnalytics', 'TicketMetadata']);
  });
});
