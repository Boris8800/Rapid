export const throttlerConfig = () => ({
  throttler: {
    window: process.env.RATE_LIMIT_WINDOW ?? '15m',
    max: Number(process.env.RATE_LIMIT_MAX ?? 100),
  },
});
