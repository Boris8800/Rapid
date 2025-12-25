import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TerminusModule } from '@nestjs/terminus';
import * as pg from 'pg';

import configuration from './config/configuration';
import { databaseConfig } from './config/database.config';
import { redisConfig } from './config/redis.config';
import { jwtConfig } from './config/jwt.config';
import { throttlerConfig } from './config/throttler.config';

import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { TripsModule } from './modules/trips/trips.module';
import { AdminModule } from './modules/admin/admin.module';
import { AppController } from './app.controller';

const dbEnabled = process.env.SKIP_DB !== 'true';

const databaseImports = dbEnabled
  ? [
      TypeOrmModule.forRootAsync({
        useFactory: () => ({
          type: 'postgres',
          // Explicitly provide the pg driver to avoid CJS/ESM interop edge cases
          // that can result in `Pool is not a constructor` at runtime.
          driver: pg,
          host: process.env.POSTGRES_HOST,
          port: Number(process.env.POSTGRES_PORT ?? 5432),
          username: process.env.POSTGRES_USER,
          password: process.env.POSTGRES_PASSWORD,
          database: process.env.POSTGRES_DB,
          autoLoadEntities: true,
          synchronize: false,
          logging: false,
          extra: {
            max: Number(process.env.POSTGRES_MAX_CONNECTIONS ?? 50),
          },
        }),
      }),
    ]
  : [];

const featureModules = dbEnabled
  ? [AuthModule, RealtimeModule, BookingsModule, DriversModule, TripsModule, AdminModule]
  : [];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration, databaseConfig, redisConfig, jwtConfig, throttlerConfig],
    }),
    ThrottlerModule.forRootAsync({
      useFactory: () => [
        {
          ttl: 60,
          limit: Number(process.env.RATE_LIMIT_MAX ?? 100),
        },
      ],
    }),
    ...databaseImports,
    TerminusModule,
    HealthModule,
    MetricsModule,
    ...featureModules,
  ],
  controllers: [AppController],
})
export class AppModule {}
