-- Rapid Roads Taxi System - Seed data (bootstrap)
-- Runs on first init only.

BEGIN;

-- Default system settings
INSERT INTO system_settings(key, value)
VALUES
  ('app.currency', '"GBP"'::jsonb),
  ('app.supportEmail', '"support@rapidroad.uk"'::jsonb),
  ('security.passwordPolicy', '{"minLength":12,"requireNumbers":true,"requireSymbols":true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Default pricing zone: "UK Default" (very large polygon fallback)
-- This is a coarse polygon; replace with real service area polygons.
INSERT INTO pricing_zones (
  name, currency, base_fare_pence, per_km_pence, per_minute_pence, minimum_fare_pence, polygon, is_active
)
SELECT
  'UK Default', 'GBP', 300, 150, 30, 500,
  ST_GeogFromText('POLYGON((-8 49, 2 49, 2 61, -8 61, -8 49))'),
  true
WHERE NOT EXISTS (SELECT 1 FROM pricing_zones);

-- Example promo code
INSERT INTO promotions(code, description, percent_off, starts_at, ends_at, max_redemptions, is_active)
SELECT
  'WELCOME10',
  '10% off your first ride',
  10,
  now(),
  now() + interval '90 days',
  10000,
  true
WHERE NOT EXISTS (SELECT 1 FROM promotions WHERE code = 'WELCOME10');

COMMIT;
