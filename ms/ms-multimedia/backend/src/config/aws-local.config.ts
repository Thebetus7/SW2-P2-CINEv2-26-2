import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';

export interface AwsLocalConfigOptions {
  s3Endpoint: string;
  dynamoDbEndpoint: string;
  region: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export const getAwsLocalConfig = (): AwsLocalConfigOptions => {
  const s3Endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000';
  const dynamoDbEndpoint = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8002';
  const region = process.env.AWS_REGION || 'us-east-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.MINIO_ROOT_USER || 'minioadmin';
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.MINIO_ROOT_PASSWORD || 'minioadmin';

  // Validación estricta INV-ARCH-02 / RB-MEDIA-05: Prohibir endpoints en dominios públicos de AWS
  const forbiddenDomains = ['amazonaws.com'];
  if (forbiddenDomains.some((domain) => s3Endpoint.includes(domain) || dynamoDbEndpoint.includes(domain))) {
    throw new Error('Configuración inválida: Los endpoints deben ser estrictamente locales (INV-ARCH-02)');
  }

  return {
    s3Endpoint,
    dynamoDbEndpoint,
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  };
};

export const createS3Client = (customConfig?: Partial<S3ClientConfig>): S3Client => {
  const localConfig = getAwsLocalConfig();
  return new S3Client({
    endpoint: localConfig.s3Endpoint,
    region: localConfig.region,
    credentials: localConfig.credentials,
    forcePathStyle: true,
    ...customConfig,
  });
};

export const createDynamoDbClient = (customConfig?: Partial<DynamoDBClientConfig>): DynamoDBClient => {
  const localConfig = getAwsLocalConfig();
  return new DynamoDBClient({
    endpoint: localConfig.dynamoDbEndpoint,
    region: localConfig.region,
    credentials: localConfig.credentials,
    ...customConfig,
  });
};

export const s3Client = createS3Client();
export const dynamoDbClient = createDynamoDbClient();
