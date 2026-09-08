-- Vua MMO wallet schema
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  balance_cents BIGINT NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_ledger (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('topup','purchase','refund','release')),
  amount_cents BIGINT NOT NULL,
  ref_id TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON wallet_ledger(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS topups (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  payos_order_code BIGINT NOT NULL UNIQUE,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed')),
  checkout_url TEXT,
  payment_link_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_topups_user ON topups(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_code TEXT UNIQUE,
  buyer_id UUID NOT NULL REFERENCES users(id),
  items_json JSONB NOT NULL,
  total_cents BIGINT NOT NULL CHECK (total_cents > 0),
  status TEXT NOT NULL DEFAULT 'paid'
    CHECK (status IN ('paid','delivered','disputed','released','refunded')),
  delivery_note TEXT NOT NULL DEFAULT '',
  hold_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_hold ON orders(status, hold_until);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS public_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_public_code ON orders(public_code)
  WHERE public_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS order_disputes (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) UNIQUE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','rejected','withdrawn')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  withdrawn_at TIMESTAMPTZ
);

-- Kho hàng sản phẩm số (1 dòng = 1 tài khoản/key giao khách) — kiểu santhovn
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_payload JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS stock_items (
  id BIGSERIAL PRIMARY KEY,
  product_id TEXT NOT NULL,
  shop_token TEXT NOT NULL DEFAULT '',
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available','reserved','sold','void')),
  order_id UUID REFERENCES orders(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sold_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_stock_available
  ON stock_items(product_id, status, id)
  WHERE status = 'available';
CREATE INDEX IF NOT EXISTS idx_stock_order ON stock_items(order_id)
  WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_shop ON stock_items(shop_token, product_id, status);

-- Chat (support sàn vs từng shop) — admin theo dõi được từng phòng
CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  room_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('support','shop')),
  shop_token TEXT NOT NULL DEFAULT '',
  shop_name TEXT NOT NULL DEFAULT '',
  visitor_key TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  role TEXT NOT NULL CHECK (role IN ('user','support','shop','admin')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_room_time ON chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_channel ON chat_messages(channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_shop ON chat_messages(shop_token, created_at DESC)
  WHERE shop_token <> '';
CREATE INDEX IF NOT EXISTS idx_chat_visitor ON chat_messages(visitor_key, room_id);

-- Shop overrides (chỉnh từ admin, không sửa file tĩnh)
CREATE TABLE IF NOT EXISTS shop_overrides (
  token TEXT PRIMARY KEY,
  name TEXT,
  city TEXT,
  district TEXT,
  bio TEXT,
  rating NUMERIC(2,1),
  joined_year INT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ẩn / ghi chú sản phẩm catalog
CREATE TABLE IF NOT EXISTS product_overrides (
  product_id TEXT PRIMARY KEY,
  name TEXT,
  price_cents BIGINT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  note TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Blacklist khách (chặn mua bằng ví / bắt buộc nạp trước)
CREATE TABLE IF NOT EXISTS user_blacklist (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  admin_email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);
CREATE INDEX IF NOT EXISTS idx_blacklist_created ON user_blacklist(created_at DESC);

-- Mã khuyến mãi (công khai / ẩn / giới hạn mỗi user)
CREATE TABLE IF NOT EXISTS promo_codes (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  percent INT NOT NULL CHECK (percent > 0 AND percent <= 100),
  max_cents BIGINT NOT NULL DEFAULT 0 CHECK (max_cents >= 0),
  min_order_cents BIGINT NOT NULL DEFAULT 0 CHECK (min_order_cents >= 0),
  expires_at DATE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  used_count INT NOT NULL DEFAULT 0,
  max_uses INT NOT NULL DEFAULT 1 CHECK (max_uses >= 1),
  visibility TEXT NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public','hidden')),
  once_per_user BOOLEAN NOT NULL DEFAULT FALSE,
  per_user_limit INT NOT NULL DEFAULT 0 CHECK (per_user_limit >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_promo_active ON promo_codes(active, expires_at);
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS once_per_user BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS per_user_limit INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS promo_redemptions (
  id BIGSERIAL PRIMARY KEY,
  promo_id BIGINT NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user ON promo_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_promo_user ON promo_redemptions(promo_id, user_id);

-- Đánh giá sau mua (1 đơn = 1 đánh giá, phục vụ SEO trang sản phẩm)
CREATE TABLE IF NOT EXISTS order_reviews (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL DEFAULT '',
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_reviews_product ON order_reviews(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_reviews_user ON order_reviews(user_id);

-- Thông báo gửi từ admin
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  audience TEXT NOT NULL CHECK (audience IN ('all','customers','shops')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'system',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at DESC);

-- Blog / viết bài (SEO đầy đủ)
CREATE TABLE IF NOT EXISTS blog_posts (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  locale TEXT NOT NULL DEFAULT 'vi',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  category_label TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  meta_title TEXT NOT NULL DEFAULT '',
  meta_description TEXT NOT NULL DEFAULT '',
  keywords TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  og_image TEXT NOT NULL DEFAULT '',
  canonical_path TEXT NOT NULL DEFAULT '',
  read_time TEXT NOT NULL DEFAULT '',
  published_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_blog_status ON blog_posts(status, updated_at DESC);

-- Shop ảo (hiển thị khám phá / filler — tách biệt 80 shop thật)
CREATE TABLE IF NOT EXISTS virtual_shops (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  district TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  rating NUMERIC(2,1) NOT NULL DEFAULT 4.9,
  bio TEXT NOT NULL DEFAULT '',
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  on_shift BOOLEAN NOT NULL DEFAULT TRUE,
  avatar_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vshop_visible ON virtual_shops(visible, city);

-- Sản phẩm / gian hàng tạo từ admin (merge vào catalog tĩnh)
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
);
CREATE INDEX IF NOT EXISTS idx_cms_products_active ON cms_products(active, updated_at DESC);

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
);
CREATE INDEX IF NOT EXISTS idx_cms_shops_active ON cms_shops(active, updated_at DESC);
