import { getAwsLocalConfig, createS3Client, createDynamoDbClient } from '../src/config/aws-local.config';

describe('AwsLocalConfig (INV-ARCH-02, RB-MEDIA-05)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('debe configurar endpoints locales por defecto hacia MinIO (9000) y DynamoDB (8002)', () => {
    delete process.env.S3_ENDPOINT;
    delete process.env.DYNAMODB_ENDPOINT;

    const config = getAwsLocalConfig();
    expect(config.s3Endpoint).toBe('http://localhost:9000');
    expect(config.dynamoDbEndpoint).toBe('http://localhost:8002');
    expect(config.region).toBe('us-east-1');
    expect(config.credentials.accessKeyId).toBe('minioadmin');
    expect(config.credentials.secretAccessKey).toBe('minioadmin');
  });

  it('debe instanciar S3Client con forcePathStyle: true', () => {
    const client = createS3Client();
    expect(client.config.forcePathStyle).toBe(true);
  });

  it('debe instanciar DynamoDBClient con región us-east-1', async () => {
    const client = createDynamoDbClient();
    const region = await client.config.region();
    expect(region).toBe('us-east-1');
  });

  it('debe lanzar error de violación arquitectónica si se intenta usar un endpoint público de AWS', () => {
    process.env.S3_ENDPOINT = 'https://s3.amazonaws.com';
    expect(() => getAwsLocalConfig()).toThrow(/INV-ARCH-02/);
  });
});
