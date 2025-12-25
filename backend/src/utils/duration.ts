const UNIT_TO_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
};

export function parseExpiresInToSeconds(input: string | number | undefined, fallbackSeconds: number): number {
  if (input === undefined || input === null || input === '') return fallbackSeconds;

  if (typeof input === 'number' && Number.isFinite(input)) return Math.max(1, Math.floor(input));

  const str = String(input).trim();
  if (/^\d+$/.test(str)) return Math.max(1, Math.floor(Number(str)));

  const match = str.match(/^(\d+)([smhd])$/i);
  if (!match) return fallbackSeconds;

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const seconds = value * (UNIT_TO_SECONDS[unit] ?? 0);

  if (!Number.isFinite(seconds) || seconds <= 0) return fallbackSeconds;
  return Math.max(1, Math.floor(seconds));
}
