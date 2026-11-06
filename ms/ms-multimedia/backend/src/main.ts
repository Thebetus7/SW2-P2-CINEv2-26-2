import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { startLocalS3Server } from './config/local-s3-server';

async function bootstrap() {
  // Inicializar servidor S3 local en puerto 9000 (MinIO emulado) si no está activo
  await startLocalS3Server();

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors();
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`MS Multimedia running on port ${port}`);
}

bootstrap();
