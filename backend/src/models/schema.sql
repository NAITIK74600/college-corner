-- ============================================================
-- College Corner — PostgreSQL Schema (Phase 1 Foundation)
-- Run this once against your college_corner database.
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------
-- USERS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(120)  NOT NULL,
  email       VARCHAR(255)  NOT NULL UNIQUE,
  phone       VARCHAR(15),
  password    TEXT          NOT NULL,       -- bcrypt hash
  role        VARCHAR(20)   NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  is_verified BOOLEAN       NOT NULL DEFAULT FALSE,
  wallet      NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- PRODUCTS  (populated in Phase 2)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(200)  NOT NULL,
  description TEXT,
  category    VARCHAR(100)  NOT NULL,
  price       NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  stock       INTEGER       NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url   TEXT,
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- PRINTERS  (populated in Phase 3)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS printers (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(150) NOT NULL,
  capabilities    VARCHAR(20)  NOT NULL CHECK (capabilities IN ('bw', 'color', 'both')),
  status          VARCHAR(20)  NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  current_job_id  UUID,                     -- FK added after print_jobs table
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- PRINT JOBS  (populated in Phase 3)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS print_jobs (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_url      TEXT          NOT NULL,
  file_name     TEXT          NOT NULL,
  color_mode    VARCHAR(10)   NOT NULL CHECK (color_mode IN ('bw', 'color')),
  page_size     VARCHAR(5)    NOT NULL DEFAULT 'A4' CHECK (page_size IN ('A4', 'A3')),
  copies        INTEGER       NOT NULL DEFAULT 1 CHECK (copies >= 1),
  lamination    BOOLEAN       NOT NULL DEFAULT FALSE,
  total_pages   INTEGER       NOT NULL DEFAULT 1,
  amount        NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  status        VARCHAR(20)   NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'paid', 'processing', 'printed', 'ready', 'failed')),
  assigned_printer_id UUID    REFERENCES printers(id) ON DELETE SET NULL,
  error_message TEXT,                        -- populated if status = 'failed'
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Back-fill the FK on printers now that print_jobs exists
ALTER TABLE printers
  ADD CONSTRAINT fk_printer_current_job
  FOREIGN KEY (current_job_id) REFERENCES print_jobs(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------
-- ORDERS  (populated in Phase 4)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sequence_number   SERIAL        UNIQUE,          -- human-readable order number
  delivery_type     VARCHAR(20)   NOT NULL DEFAULT 'pickup' CHECK (delivery_type IN ('pickup', 'delivery')),
  delivery_charge   NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  subtotal          NUMERIC(10,2) NOT NULL,
  total             NUMERIC(10,2) NOT NULL,
  payment_status    VARCHAR(20)   NOT NULL DEFAULT 'pending'
                      CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_id        TEXT,                          -- gateway transaction ID
  notes             TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ORDER LINE ITEMS — links orders to products and/or print jobs
CREATE TABLE IF NOT EXISTS order_items (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  UUID          REFERENCES products(id) ON DELETE SET NULL,
  print_job_id UUID         REFERENCES print_jobs(id) ON DELETE SET NULL,
  quantity    INTEGER       NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  unit_price  NUMERIC(10,2) NOT NULL,
  CONSTRAINT item_must_reference_one CHECK (
    (product_id IS NOT NULL AND print_job_id IS NULL) OR
    (product_id IS NULL AND print_job_id IS NOT NULL)
  )
);

-- ----------------------------------------------------------------
-- Indexes for common query patterns
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_email          ON users(email);
CREATE INDEX IF NOT EXISTS idx_print_jobs_user      ON print_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_status    ON print_jobs(status);
CREATE INDEX IF NOT EXISTS idx_orders_user          ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order    ON order_items(order_id);

-- ----------------------------------------------------------------
-- Auto-update updated_at via trigger
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','products','printers','print_jobs','orders'] LOOP
    EXECUTE format(
      'CREATE OR REPLACE TRIGGER set_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()', t
    );
  END LOOP;
END;
$$;
