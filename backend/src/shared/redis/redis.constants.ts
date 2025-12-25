export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

export type RedisLike = {
	get(key: string): Promise<string | null>;
	// Matches ioredis usage in this codebase: set(key, value, 'EX', seconds)
	set(key: string, value: string, mode?: string, durationType?: string | number, duration?: number): Promise<unknown>;
	del(key: string): Promise<number>;
};
