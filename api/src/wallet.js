const { PayOS } = require("@payos/node");
const config = require("./config");
const { query, withTransaction } = require("./db");

let payos = null;
if (config.payos.clientId && config.payos.apiKey && config.payos.checksumKey) {
  payos = new PayOS({
    clientId: config.payos.clientId,
    apiKey: config.payos.apiKey,
    checksumKey: config.payos.checksumKey
  });
}

function hasPayos() {
  return Boolean(payos) || config.payos.mock;
}

function genOrderCode() {
  // PayOS requires unique integer orderCode
  return Number(String(Date.now()).slice(-11) + String(Math.floor(Math.random() * 90 + 10)));
}

async function creditTopup(client, topup, meta = {}) {
  const upd = await client.query(
    `UPDATE topups SET status = 'paid', paid_at = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING id`,
    [topup.id]
  );
  if (!upd.rowCount) return { already: true };
  await client.query(
    `UPDATE users SET balance_cents = balance_cents + $1 WHERE id = $2`,
    [topup.amount_cents, topup.user_id]
  );
  await client.query(
    `INSERT INTO wallet_ledger (user_id, type, amount_cents, ref_id, meta)
     VALUES ($1,'topup',$2,$3,$4)`,
    [
      topup.user_id,
      topup.amount_cents,
      String(topup.payos_order_code),
      JSON.stringify(meta)
    ]
  );
  return { already: false };
}

async function createTopup(req, res) {
  try {
    if (!hasPayos()) {
      return res.status(503).json({
        error: "Hệ thống nạp ví chưa sẵn sàng. Vui lòng thử lại sau hoặc liên hệ hỗ trợ."
      });
    }
    const amount = Math.round(Number(req.body.amount || 0));
    if (!Number.isFinite(amount) || amount < 1000) {
      return res.status(400).json({ error: "Số tiền tối thiểu 1.000₫" });
    }
    if (amount > 50_000_000) {
      return res.status(400).json({ error: "Số tiền tối đa 50.000.000₫" });
    }

    const orderCode = genOrderCode();
    const returnUrl = `${config.webOrigin}/nap-tien.html?topup=ok&code=${orderCode}`;
    const cancelUrl = `${config.webOrigin}/nap-tien.html?topup=cancel&code=${orderCode}`;

    let checkoutUrl = "";
    let paymentLinkId = "";
    let qrCode = "";

    if (config.payos.mock || !payos) {
      checkoutUrl = `${config.webOrigin}/nap-tien.html?topup=mock&code=${orderCode}`;
      paymentLinkId = `mock_${orderCode}`;
    } else {
      const payment = await payos.paymentRequests.create({
        orderCode,
        amount,
        description: `Nap vi VM${String(orderCode).slice(-8)}`.slice(0, 25),
        returnUrl,
        cancelUrl,
        items: [{ name: "Nap so du Vua MMO", quantity: 1, price: amount }]
      });
      checkoutUrl = payment.checkoutUrl || payment.checkout_url || "";
      paymentLinkId = payment.paymentLinkId || payment.payment_link_id || "";
      qrCode = payment.qrCode || payment.qr_code || "";
    }

    const ins = await query(
      `INSERT INTO topups (user_id, payos_order_code, amount_cents, checkout_url, payment_link_id)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, payos_order_code, amount_cents, status, checkout_url, created_at`,
      [req.user.id, orderCode, amount, checkoutUrl, paymentLinkId]
    );

    // Mock: credit immediately for demo
    if (config.payos.mock || !payos) {
      await withTransaction(async (client) => {
        const t = await client.query(`SELECT * FROM topups WHERE id = $1 FOR UPDATE`, [
          ins.rows[0].id
        ]);
        await creditTopup(client, t.rows[0], { mock: true });
      });
    }

    return res.json({
      topup: {
        orderCode,
        amount,
        status: config.payos.mock || !payos ? "paid" : "pending",
        checkoutUrl,
        qrCode,
        paymentLinkId
      }
    });
  } catch (err) {
    console.error("createTopup", err);
    return res.status(500).json({ error: err.message || "Không tạo được giao dịch nạp" });
  }
}

async function payosWebhook(req, res) {
  try {
    let data;
    if (config.payos.mock && !payos) {
      data = req.body?.data || req.body;
    } else if (!payos) {
      return res.status(503).send("PayOS not configured");
    } else {
      data = await payos.webhooks.verify(req.body);
    }

    const orderCode = Number(data.orderCode || data.order_code);
    if (!orderCode) return res.status(400).send("missing orderCode");

    await withTransaction(async (client) => {
      const r = await client.query(
        `SELECT * FROM topups WHERE payos_order_code = $1 FOR UPDATE`,
        [orderCode]
      );
      const topup = r.rows[0];
      if (!topup) {
        console.warn("webhook unknown order", orderCode);
        return;
      }
      const code = String(req.body?.code || data.code || "00");
      if (code !== "00" && req.body?.success === false) {
        await client.query(`UPDATE topups SET status = 'failed' WHERE id = $1 AND status = 'pending'`, [
          topup.id
        ]);
        return;
      }
      await creditTopup(client, topup, { webhook: true, reference: data.reference });
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("payosWebhook", err);
    return res.status(400).json({ error: "Invalid webhook" });
  }
}

async function syncTopup(req, res) {
  try {
    const orderCode = Number(req.params.code || req.query.code);
    if (!orderCode) return res.status(400).json({ error: "Thiếu mã" });
    const r = await query(
      `SELECT * FROM topups WHERE payos_order_code = $1 AND user_id = $2`,
      [orderCode, req.user.id]
    );
    const topup = r.rows[0];
    if (!topup) return res.status(404).json({ error: "Không tìm thấy giao dịch" });

    if (topup.status === "pending" && payos) {
      try {
        const info = await payos.paymentRequests.get(topup.payment_link_id || orderCode);
        const status = String(info.status || info.data?.status || "").toUpperCase();
        if (status === "PAID") {
          await withTransaction(async (client) => {
            const t = await client.query(
              `SELECT * FROM topups WHERE id = $1 FOR UPDATE`,
              [topup.id]
            );
            await creditTopup(client, t.rows[0], { sync: true });
          });
        }
      } catch (e) {
        console.warn("sync topup lookup", e.message);
      }
    }

    const u = await query(
      `SELECT balance_cents FROM users WHERE id = $1`,
      [req.user.id]
    );
    const fresh = await query(`SELECT status, amount_cents, paid_at FROM topups WHERE id = $1`, [
      topup.id
    ]);
    return res.json({
      topup: fresh.rows[0],
      balance: Number(u.rows[0].balance_cents)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Không đồng bộ được" });
  }
}

async function ledger(req, res) {
  const r = await query(
    `SELECT id, type, amount_cents, ref_id, meta, created_at
     FROM wallet_ledger WHERE user_id = $1
     ORDER BY created_at DESC LIMIT 50`,
    [req.user.id]
  );
  return res.json({
    items: r.rows.map((row) => ({
      id: row.id,
      type: row.type,
      amount: Number(row.amount_cents),
      refId: row.ref_id,
      meta: row.meta,
      createdAt: row.created_at
    }))
  });
}

module.exports = {
  createTopup,
  payosWebhook,
  syncTopup,
  ledger,
  hasPayos
};
