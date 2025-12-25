-- Rapid Roads Taxi System - Core schema (bootstrap)
-- This runs only on *first* init of a fresh Postgres data volume.

BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Helpers
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enums
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('customer','driver','admin','superadmin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('active','disabled','pending_verification');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM (
    'draft','created','quoted','payment_pending','confirmed','driver_assigned',
    'driver_arriving','in_progress','completed','cancelled','failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE trip_status AS ENUM ('pending','accepted','arrived','started','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('requires_payment_method','requires_confirmation','processing','succeeded','failed','refunded','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE document_type AS ENUM ('drivers_license','private_hire_license','insurance','mot','vehicle_registration','profile_photo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ticket_status AS ENUM ('open','in_progress','resolved','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_channel AS ENUM ('email','sms','push','in_app');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Core tables
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext UNIQUE,
  phone_e164 text UNIQUE,
  password_hash text,
  role user_role NOT NULL DEFAULT 'customer',
  status user_status NOT NULL DEFAULT 'active',
  email_verified_at timestamptz,
  phone_verified_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name text,
  date_of_birth date,
  avatar_url text,
  address_line1 text,
  address_line2 text,
  city text,
  postcode text,
  country_code char(2) DEFAULT 'GB',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TRIGGER trg_user_profiles_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  make text NOT NULL,
  model text NOT NULL,
  color text,
  plate_number text NOT NULL,
  year smallint,
  seats smallint NOT NULL DEFAULT 4,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plate_number)
);

CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON vehicles(driver_id);

CREATE TRIGGER trg_vehicles_updated_at
BEFORE UPDATE ON vehicles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS driver_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type document_type NOT NULL,
  file_url text NOT NULL,
  issued_at date,
  expires_at date,
  verified_at timestamptz,
  verified_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_documents_driver_id ON driver_documents(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_documents_type ON driver_documents(type);

CREATE TRIGGER trg_driver_documents_updated_at
BEFORE UPDATE ON driver_documents
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Pricing and promos
CREATE TABLE IF NOT EXISTS pricing_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  currency char(3) NOT NULL DEFAULT 'GBP',
  base_fare_pence integer NOT NULL DEFAULT 300,
  per_km_pence integer NOT NULL DEFAULT 150,
  per_minute_pence integer NOT NULL DEFAULT 30,
  minimum_fare_pence integer NOT NULL DEFAULT 500,
  polygon geography(Polygon, 4326) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pricing_zones_polygon_gist ON pricing_zones USING GIST (polygon);

CREATE TRIGGER trg_pricing_zones_updated_at
BEFORE UPDATE ON pricing_zones
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS surge_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES pricing_zones(id) ON DELETE CASCADE,
  multiplier numeric(5,2) NOT NULL DEFAULT 1.00,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_surge_pricing_zone_id ON surge_pricing(zone_id);
CREATE INDEX IF NOT EXISTS idx_surge_pricing_window ON surge_pricing(starts_at, ends_at);

CREATE TRIGGER trg_surge_pricing_updated_at
BEFORE UPDATE ON surge_pricing
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code citext NOT NULL UNIQUE,
  description text,
  percent_off integer,
  amount_off_pence integer,
  starts_at timestamptz,
  ends_at timestamptz,
  max_redemptions integer,
  redeemed_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (percent_off IS NULL OR (percent_off >= 1 AND percent_off <= 100)),
  CHECK (amount_off_pence IS NULL OR amount_off_pence >= 1),
  CHECK (NOT (percent_off IS NULL AND amount_off_pence IS NULL))
);

CREATE TRIGGER trg_promotions_updated_at
BEFORE UPDATE ON promotions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_driver_id uuid REFERENCES users(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  status booking_status NOT NULL DEFAULT 'created',
  scheduled_pickup_at timestamptz,
  estimated_distance_m integer,
  estimated_duration_s integer,
  quoted_fare_pence integer,
  final_fare_pence integer,
  currency char(3) NOT NULL DEFAULT 'GBP',
  promotion_id uuid REFERENCES promotions(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_driver_id ON bookings(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status_created_at ON bookings(status, created_at DESC);

CREATE TRIGGER trg_bookings_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS booking_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  pickup_address text NOT NULL,
  dropoff_address text NOT NULL,
  pickup_point geography(Point, 4326) NOT NULL,
  dropoff_point geography(Point, 4326) NOT NULL,
  pickup_notes text,
  dropoff_notes text,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(pickup_address,'') || ' ' || coalesce(dropoff_address,''))
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(booking_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_locations_booking_id ON booking_locations(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_locations_pickup_gist ON booking_locations USING GIST (pickup_point);
CREATE INDEX IF NOT EXISTS idx_booking_locations_dropoff_gist ON booking_locations USING GIST (dropoff_point);
CREATE INDEX IF NOT EXISTS idx_booking_locations_search_gin ON booking_locations USING GIN (search_vector);

CREATE TRIGGER trg_booking_locations_updated_at
BEFORE UPDATE ON booking_locations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trips
CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status trip_status NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  distance_m integer,
  duration_s integer,
  route_line geography(LineString, 4326),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(booking_id)
);

CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_status_created_at ON trips(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trips_route_gist ON trips USING GIST (route_line);

CREATE TRIGGER trg_trips_updated_at
BEFORE UPDATE ON trips
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Driver locations (append-only + "latest" query)
CREATE TABLE IF NOT EXISTS driver_locations (
  id bigserial PRIMARY KEY,
  driver_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location geography(Point, 4326) NOT NULL,
  heading_degrees numeric(6,2),
  speed_mps numeric(8,3),
  accuracy_m numeric(8,3),
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id_recorded_at ON driver_locations(driver_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_locations_location_gist ON driver_locations USING GIST (location);

-- Payments and invoices
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  provider text NOT NULL, -- stripe/razorpay/cash/etc
  provider_payment_id text,
  status payment_status NOT NULL DEFAULT 'requires_payment_method',
  amount_pence integer NOT NULL,
  currency char(3) NOT NULL DEFAULT 'GBP',
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status_created_at ON payments(status, created_at DESC);

CREATE TRIGGER trg_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  invoice_number text NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  subtotal_pence integer NOT NULL,
  tax_pence integer NOT NULL DEFAULT 0,
  total_pence integer NOT NULL,
  currency char(3) NOT NULL DEFAULT 'GBP',
  pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON invoices(booking_id);

CREATE TRIGGER trg_invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Ratings
CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  driver_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  score smallint NOT NULL CHECK (score >= 1 AND score <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(booking_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_driver_id_created_at ON ratings(driver_id, created_at DESC);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel notification_channel NOT NULL,
  title text,
  body text,
  data jsonb,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at ON notifications(user_id, created_at DESC);

-- Audit logs (append-only)
CREATE TABLE IF NOT EXISTS audit_logs (
  id bigserial PRIMARY KEY,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  ip inet,
  user_agent text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created_at ON audit_logs(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_to_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  status ticket_status NOT NULL DEFAULT 'open',
  subject text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status_created_at ON support_tickets(status, created_at DESC);

CREATE TRIGGER trg_support_tickets_updated_at
BEFORE UPDATE ON support_tickets
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- System settings (simple key/value)
CREATE TABLE IF NOT EXISTS system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Views
CREATE OR REPLACE VIEW daily_earnings AS
SELECT
  t.driver_id,
  date_trunc('day', t.completed_at) AS day,
  COUNT(*) AS trips_count,
  SUM(COALESCE(b.final_fare_pence, b.quoted_fare_pence, 0)) AS gross_earnings_pence
FROM trips t
JOIN bookings b ON b.id = t.booking_id
WHERE t.status = 'completed'
GROUP BY 1, 2;

CREATE OR REPLACE VIEW driver_performance AS
SELECT
  t.driver_id,
  COUNT(*) FILTER (WHERE t.status = 'completed') AS completed_trips,
  AVG(COALESCE(r.score, NULL)) AS avg_rating,
  MAX(t.completed_at) AS last_completed_at
FROM trips t
LEFT JOIN ratings r ON r.booking_id = t.booking_id
GROUP BY 1;

CREATE OR REPLACE VIEW customer_lifetime_value AS
SELECT
  b.customer_id,
  COUNT(*) FILTER (WHERE b.status = 'completed') AS completed_bookings,
  SUM(COALESCE(b.final_fare_pence, 0)) AS total_spend_pence,
  MAX(b.created_at) AS last_booking_at
FROM bookings b
GROUP BY 1;

CREATE OR REPLACE VIEW booking_analytics AS
SELECT
  date_trunc('day', created_at) AS day,
  COUNT(*) AS total_bookings,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed_bookings,
  COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_bookings,
  AVG(COALESCE(final_fare_pence, quoted_fare_pence)) AS avg_fare_pence
FROM bookings
GROUP BY 1;

-- Functions
CREATE OR REPLACE FUNCTION calculate_distance(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ST_DistanceSphere(
    ST_MakePoint(lon1, lat1),
    ST_MakePoint(lon2, lat2)
  );
$$;

CREATE OR REPLACE FUNCTION find_nearby_drivers(lat double precision, lon double precision, radius_m integer)
RETURNS TABLE(driver_id uuid, distance_m double precision)
LANGUAGE sql
STABLE
AS $$
  WITH latest AS (
    SELECT DISTINCT ON (dl.driver_id)
      dl.driver_id,
      dl.location
    FROM driver_locations dl
    ORDER BY dl.driver_id, dl.recorded_at DESC
  )
  SELECT
    l.driver_id,
    ST_DistanceSphere(ST_MakePoint(lon, lat), l.location::geometry) AS distance_m
  FROM latest l
  JOIN users u ON u.id = l.driver_id
  WHERE u.role = 'driver'
    AND u.status = 'active'
    AND ST_DWithin(l.location, ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography, radius_m)
  ORDER BY distance_m ASC;
$$;

-- Simplified fare calculation using the first matching active pricing zone of the pickup point.
CREATE OR REPLACE FUNCTION calculate_fare(p_booking_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_distance_m integer;
  v_duration_s integer;
  v_pickup geography(Point, 4326);
  v_zone pricing_zones%ROWTYPE;
  v_multiplier numeric(5,2) := 1.00;
  v_fare integer;
  v_now timestamptz := now();
BEGIN
  SELECT estimated_distance_m, estimated_duration_s
    INTO v_distance_m, v_duration_s
  FROM bookings
  WHERE id = p_booking_id;

  SELECT pickup_point
    INTO v_pickup
  FROM booking_locations
  WHERE booking_id = p_booking_id;

  SELECT *
    INTO v_zone
  FROM pricing_zones
  WHERE is_active = true
    AND ST_Contains(polygon::geometry, v_pickup::geometry)
  ORDER BY created_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    -- fallback pricing
    v_zone.base_fare_pence := 300;
    v_zone.per_km_pence := 150;
    v_zone.per_minute_pence := 30;
    v_zone.minimum_fare_pence := 500;
  END IF;

  SELECT sp.multiplier
    INTO v_multiplier
  FROM surge_pricing sp
  WHERE sp.zone_id = v_zone.id
    AND sp.starts_at <= v_now
    AND sp.ends_at > v_now
  ORDER BY sp.starts_at DESC
  LIMIT 1;

  v_fare := v_zone.base_fare_pence
    + ((COALESCE(v_distance_m,0)::numeric / 1000.0) * v_zone.per_km_pence)::integer
    + ((COALESCE(v_duration_s,0)::numeric / 60.0) * v_zone.per_minute_pence)::integer;

  v_fare := GREATEST(v_fare, v_zone.minimum_fare_pence);
  v_fare := (v_fare::numeric * v_multiplier)::integer;

  RETURN v_fare;
END;
$$;

COMMIT;
