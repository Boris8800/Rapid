import 'reflect-metadata';

import cookieParser from 'cookie-parser';
import csurf from 'csurf';
import helmet from 'helmet';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.setGlobalPrefix('v1');

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(cookieParser());

  // Optional CSRF protection when using cookie-based auth flows.
  // For pure Authorization-header JWT flows, CSRF is not needed.
  if (process.env.ENABLE_CSRF === 'true') {
    app.use(
      csurf({
        cookie: {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
        },
      }),
    );
  }

  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Rapid Roads API')
    .setDescription('Production API for Rapid Roads Taxi System')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  // Run migrations if TypeORM is enabled/present
  try {
    const dataSource = app.get(DataSource);
    if (dataSource) {
      await dataSource.runMigrations();
      Logger.log('Migrations executed successfully', 'Bootstrap');
    }
  } catch (error) {
    // If DataSource is not found (e.g. SKIP_DB=true) or migration fails
    Logger.warn(`Skipping migrations: ${error instanceof Error ? error.message : error}`, 'Bootstrap');
  }

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
