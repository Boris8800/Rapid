import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

class InMemoryRedis {
  private readonly store = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== undefined && Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, mode?: string, durationType?: string | number, duration?: number): Promise<'OK'> {
    // Supports: set(key, value) and set(key, value, 'EX', seconds)
    const args = [mode, durationType, duration].filter((x) => x !== undefined);

    let expiresAt: number | undefined;
    if (args.length >= 2) {
      const ttlMode = String(args[0]).toUpperCase();
      const ttlValue = Number(args[1]);
      if (ttlMode === 'EX' && Number.isFinite(ttlValue) && ttlValue > 0) {
        expiresAt = Date.now() + ttlValue * 1000;
      }
    }

    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    const existed = this.store.delete(key);
    return existed ? 1 : 0;
  }
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        if (process.env.SKIP_REDIS === 'true') {
          return new InMemoryRedis();
        }

        const logger = new Logger('RedisModule');
        const host = config.get<string>('redis.host') ?? process.env.REDIS_HOST;
        const port = Number(config.get<number>('redis.port') ?? process.env.REDIS_PORT ?? 6379);

        const client = new Redis({
          host,
          port,
          maxRetriesPerRequest: null,
          enableReadyCheck: true,
        });

        // ioredis emits 'error' events; without a listener Node treats this as unhandled.
        client.on('error', (err) => {
          logger.warn(`Redis error: ${err instanceof Error ? err.message : String(err)}`);
        });

        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
