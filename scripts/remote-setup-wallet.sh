#!/bin/bash
set -euo pipefail

echo "== Postgres =="
PG_CID=$(docker ps --format '{{.ID}} {{.Names}}' | awk '/supabase-db/ {print $1; exit}')
if [ -z "${PG_CID:-}" ]; then
  PG_CID=$(docker ps --format '{{.ID}} {{.Image}} {{.Names}}' | awk 'tolower($0) ~ /postgres/ {print $1; exit}')
fi
if [ -z "${PG_CID:-}" ]; then
  echo "No postgres docker container found"
  docker ps
  exit 1
fi
echo "Using postgres container: $PG_CID"
PG_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$PG_CID" | awk '{print $1}')
if [ -z "$PG_IP" ]; then
  echo "Cannot resolve postgres container IP"
  exit 1
fi
echo "Postgres IP: $PG_IP"

DBPASS="Vuammo_$(openssl rand -hex 6)"
JWT="$(openssl rand -hex 24)"
PAYOS_CLIENT_ID=""
PAYOS_API_KEY=""
PAYOS_CHECKSUM_KEY=""
PAYOS_MOCK=1
if [ -f /root/hostinger-payos-env.txt ]; then
  set -a
  # shellcheck source=/dev/null
  . /root/hostinger-payos-env.txt || true
  set +a
  if [ -n "${PAYOS_CLIENT_ID:-}" ] && [ -n "${PAYOS_API_KEY:-}" ] && [ -n "${PAYOS_CHECKSUM_KEY:-}" ]; then
    PAYOS_MOCK=0
    echo "Using PayOS keys from hostinger-payos-env.txt"
  fi
fi

if [ -f /var/www/vuammo-api/.env ]; then
  OLD_URL=$(grep '^DATABASE_URL=' /var/www/vuammo-api/.env | head -1 | cut -d= -f2- || true)
  if echo "${OLD_URL:-}" | grep -q 'postgres://vuammo:'; then
    EXTRACTED=$(echo "$OLD_URL" | sed -n 's|postgres://vuammo:\([^@]*\)@.*|\1|p')
    if [ -n "$EXTRACTED" ]; then DBPASS="$EXTRACTED"; fi
  fi
  OLD_JWT=$(grep '^JWT_SECRET=' /var/www/vuammo-api/.env | head -1 | cut -d= -f2- || true)
  if [ -n "${OLD_JWT:-}" ]; then JWT="$OLD_JWT"; fi
fi

docker exec -i "$PG_CID" psql -U postgres -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vuammo') THEN
    CREATE ROLE vuammo LOGIN PASSWORD '${DBPASS}';
  ELSE
    ALTER ROLE vuammo WITH LOGIN PASSWORD '${DBPASS}';
  END IF;
END
\$\$;
SQL
EXISTS=$(docker exec -i "$PG_CID" psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='vuammo'" | tr -d '[:space:]')
if [ "$EXISTS" != "1" ]; then
  docker exec -i "$PG_CID" psql -U postgres -c "CREATE DATABASE vuammo;"
fi
docker exec -i "$PG_CID" psql -U postgres -d vuammo -v ON_ERROR_STOP=1 <<SQL
GRANT ALL PRIVILEGES ON DATABASE vuammo TO vuammo;
GRANT ALL ON SCHEMA public TO vuammo;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO vuammo;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO vuammo;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO vuammo;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO vuammo;
SQL

cat > /var/www/vuammo-api/.env <<EOF
PORT=3100
HOST=127.0.0.1
WEB_ORIGIN=http://187.52.116.85
DATABASE_URL=postgres://vuammo:${DBPASS}@${PG_IP}:5432/vuammo
JWT_SECRET=${JWT}
JWT_DAYS=14
HOLD_DAYS=3
PAYOS_CLIENT_ID=${PAYOS_CLIENT_ID}
PAYOS_API_KEY=${PAYOS_API_KEY}
PAYOS_CHECKSUM_KEY=${PAYOS_CHECKSUM_KEY}
PAYOS_MOCK=${PAYOS_MOCK}
EOF
chmod 600 /var/www/vuammo-api/.env
echo "Wrote .env -> ${PG_IP}:5432"

echo "== migrate =="
cd /var/www/vuammo-api
npm install --omit=dev
node src/migrate.js

echo "== nginx =="
CONF=""
for c in /etc/nginx/sites-available/vuammo /etc/nginx/sites-enabled/vuammo; do
  if [ -f "$c" ]; then CONF="$c"; break; fi
done
if [ -z "$CONF" ]; then
  echo "vuammo nginx conf not found"; ls -la /etc/nginx/sites-enabled/; exit 1
fi
if ! grep -q 'location /api/' "$CONF"; then
  python3 - "$CONF" <<'PY'
import sys
from pathlib import Path
p = Path(sys.argv[1])
text = p.read_text()
block = """
    location /api/ {
        proxy_pass http://127.0.0.1:3100/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
"""
if "location /api/" not in text:
    idx = text.rfind("}")
    text = text[:idx] + block + "\n" + text[idx:]
    p.write_text(text)
    print("inserted /api into", p)
else:
    print("already has /api")
PY
fi
if ! grep -q 'Cache-Control.*no-cache' "$CONF"; then
  python3 - "$CONF" <<'PY'
import sys
from pathlib import Path
p = Path(sys.argv[1])
text = p.read_text()
block = """
    location ~* \\.(?:js|css)$ {
        add_header Cache-Control "no-cache, must-revalidate";
        try_files $uri =404;
    }
"""
if "location ~* \\.(?:js|css)$" not in text and "no-cache, must-revalidate" not in text:
    idx = text.rfind("}")
    text = text[:idx] + block + "\n" + text[idx:]
    p.write_text(text)
    print("inserted js/css no-cache into", p)
else:
    print("already has js/css cache rule")
PY
fi
nginx -t
systemctl reload nginx

echo "== pm2 =="
command -v pm2 >/dev/null || npm install -g pm2
pm2 delete vuammo-api >/dev/null 2>&1 || true
pm2 start /var/www/vuammo-api/src/server.js --name vuammo-api --cwd /var/www/vuammo-api
pm2 save
sleep 1
curl -sS http://127.0.0.1:3100/health
echo
curl -sS -o /dev/null -w "public /api/health => HTTP %{http_code}\n" http://127.0.0.1/api/health || true
echo "OK"
