const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { pool } = require("./db");

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, "..", "sql", "schema.sql"), "utf8");
  await pool.query(sql);
  const alters = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS excerpt TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS category_label TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS meta_title TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS meta_description TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS keywords TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS image TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS og_image TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS canonical_path TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS read_time TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS published_date DATE`
  ];
  for (const q of alters) await pool.query(q);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_blog_cat ON blog_posts(category)`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code TEXT`);
  await pool.query(
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_cents BIGINT NOT NULL DEFAULT 0`
  );
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal_cents BIGINT`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS public_code TEXT`);
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_public_code ON orders(public_code) WHERE public_code IS NOT NULL`
  );
  await pool.query(
    `ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'`
  );
  await pool.query(
    `ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS once_per_user BOOLEAN NOT NULL DEFAULT FALSE`
  );
  await pool.query(
    `ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS per_user_limit INT NOT NULL DEFAULT 0`
  );
  await pool.query(`
    UPDATE promo_codes
    SET per_user_limit = 1
    WHERE once_per_user = TRUE AND (per_user_limit IS NULL OR per_user_limit = 0)
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS promo_redemptions (
      id BIGSERIAL PRIMARY KEY,
      promo_id BIGINT NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  // Allow multiple redemptions per user (limit enforced in app via per_user_limit)
  await pool.query(
    `ALTER TABLE promo_redemptions DROP CONSTRAINT IF EXISTS promo_redemptions_promo_id_user_id_key`
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user ON promo_redemptions(user_id)`
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_promo_redemptions_promo_user ON promo_redemptions(promo_id, user_id)`
  );
  // Backfill public_code for old orders (10 A-Z0-9)
  await pool.query(`
    DO $$
    DECLARE r RECORD;
      code TEXT;
      alphabet TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      i INT;
    BEGIN
      FOR r IN SELECT id FROM orders WHERE public_code IS NULL LOOP
        LOOP
          code := '';
          FOR i IN 1..10 LOOP
            code := code || substr(alphabet, 1 + floor(random() * 36)::int, 1);
          END LOOP;
          BEGIN
            UPDATE orders SET public_code = code WHERE id = r.id;
            EXIT;
          EXCEPTION WHEN unique_violation THEN
            NULL;
          END;
        END LOOP;
      END LOOP;
    END $$;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_reviews (
      id BIGSERIAL PRIMARY KEY,
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL DEFAULT '',
      rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
      body TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_order_reviews_product ON order_reviews(product_id, created_at DESC)`
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_order_reviews_user ON order_reviews(user_id)`
  );
  await pool.query(
    `ALTER TABLE order_disputes ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ`
  );
  // Allow buyer to withdraw a dispute (one-shot: cannot dispute again after withdraw)
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE order_disputes DROP CONSTRAINT IF EXISTS order_disputes_status_check;
    EXCEPTION WHEN undefined_object THEN NULL;
    END $$;
  `);
  await pool.query(`
    ALTER TABLE order_disputes
    ADD CONSTRAINT order_disputes_status_check
    CHECK (status IN ('open','resolved','rejected','withdrawn'))
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cms_products (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      price_cents BIGINT NOT NULL DEFAULT 0,
      regular_cents BIGINT,
      image TEXT NOT NULL DEFAULT '',
      seller TEXT NOT NULL DEFAULT '',
      seller_token TEXT NOT NULL DEFAULT '',
      seller_slug TEXT NOT NULL DEFAULT '',
      cats JSONB NOT NULL DEFAULT '[]'::jsonb,
      description TEXT NOT NULL DEFAULT '',
      meta_title TEXT NOT NULL DEFAULT '',
      meta_description TEXT NOT NULL DEFAULT '',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cms_shops (
      token TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL DEFAULT '',
      avatar_url TEXT NOT NULL DEFAULT '',
      rating NUMERIC(2,1) NOT NULL DEFAULT 5.0,
      bio TEXT NOT NULL DEFAULT '',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  console.log("Migration OK");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
