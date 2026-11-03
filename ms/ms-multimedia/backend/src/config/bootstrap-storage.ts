import {
  CreateBucketCommand,
  HeadBucketCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import { s3Client, dynamoDbClient } from './aws-local.config';

export interface BootstrapResult {
  buckets: string[];
  tables: string[];
}

export async function bootstrapStorage(
  s3: S3Client = s3Client,
  dynamo: DynamoDBClient = dynamoDbClient
): Promise<BootstrapResult> {
  const buckets = ['cine-posters', 'cine-tickets'];
  const createdBuckets: string[] = [];

  for (const bucket of buckets) {
    try {
      await s3.send(new HeadBucketCommand({ Bucket: bucket }));
      createdBuckets.push(bucket);
    } catch (error: any) {
      if (error?.name === 'NotFound' || error?.$metadata?.httpStatusCode === 404) {
        try {
          await s3.send(new CreateBucketCommand({ Bucket: bucket }));
          createdBuckets.push(bucket);
        } catch (createErr: any) {
          if (
            createErr?.name === 'BucketAlreadyOwnedByYou' ||
            createErr?.name === 'BucketAlreadyExists'
          ) {
            createdBuckets.push(bucket);
          } else {
            throw createErr;
          }
        }
      } else if (
        error?.name === 'BucketAlreadyOwnedByYou' ||
        error?.name === 'BucketAlreadyExists'
      ) {
        createdBuckets.push(bucket);
      } else {
        throw error;
      }
    }
  }

  const createdTables: string[] = [];

  // 1. Tabla LineAnalytics (cameraZoneId: S (PK), timestamp: S (SK))
  try {
    await dynamo.send(new DescribeTableCommand({ TableName: 'LineAnalytics' }));
    createdTables.push('LineAnalytics');
  } catch (err: any) {
    if (err?.name === 'ResourceNotFoundException') {
      try {
        await dynamo.send(
          new CreateTableCommand({
            TableName: 'LineAnalytics',
            KeySchema: [
              { AttributeName: 'cameraZoneId', KeyType: 'HASH' },
              { AttributeName: 'timestamp', KeyType: 'RANGE' },
            ],
            AttributeDefinitions: [
              { AttributeName: 'cameraZoneId', AttributeType: 'S' },
              { AttributeName: 'timestamp', AttributeType: 'S' },
            ],
            BillingMode: 'PAY_PER_REQUEST',
          })
        );
        createdTables.push('LineAnalytics');
      } catch (createTableErr: any) {
        if (createTableErr?.name === 'ResourceInUseException') {
          createdTables.push('LineAnalytics');
        } else {
          throw createTableErr;
        }
      }
    } else {
      throw err;
    }
  }

  // 2. Tabla TicketMetadata (ticketId: S (PK))
  try {
    await dynamo.send(new DescribeTableCommand({ TableName: 'TicketMetadata' }));
    createdTables.push('TicketMetadata');
  } catch (err: any) {
    if (err?.name === 'ResourceNotFoundException') {
      try {
        await dynamo.send(
          new CreateTableCommand({
            TableName: 'TicketMetadata',
            KeySchema: [{ AttributeName: 'ticketId', KeyType: 'HASH' }],
            AttributeDefinitions: [{ AttributeName: 'ticketId', AttributeType: 'S' }],
            BillingMode: 'PAY_PER_REQUEST',
          })
        );
        createdTables.push('TicketMetadata');
      } catch (createTableErr: any) {
        if (createTableErr?.name === 'ResourceInUseException') {
          createdTables.push('TicketMetadata');
        } else {
          throw createTableErr;
        }
      }
    } else {
      throw err;
    }
  }

  return { buckets: createdBuckets, tables: createdTables };
}

// Ejecución standalone
if (require.main === module) {
  bootstrapStorage()
    .then((result) => {
      console.log('Bootstrap completado con éxito:', result);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error en bootstrapStorage:', err.message);
      process.exit(1);
    });
}
