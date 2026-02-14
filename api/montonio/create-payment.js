// api/montonio/create-payment.js
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const {
      orderId,
      customer,
      event,
      items,
      total,
      successUrl,
      cancelUrl
    } = req.body || {};

    if (!orderId || !customer?.email || !event?.title || !Array.isArray(items) || !Number(total)) {
      return res.status(400).json({ ok: false, error: "Missing fields" });
    }

    // ENV
    const MONTONIO_ENV = process.env.MONTONIO_ENV || "sandbox"; // sandbox | live
    const MONTONIO_ACCESS_KEY = process.env.MONTONIO_ACCESS_KEY || "";
    const MONTONIO_SECRET_KEY = process.env.MONTONIO_SECRET_KEY || "";
    const MONTONIO_API_BASE = process.env.MONTONIO_API_BASE || "";

    // Preview mode (kui env pole seadistatud)
    if (!MONTONIO_SECRET_KEY || !MONTONIO_API_BASE) {
      return res.status(200).json({
        ok: true,
        preview: true,
        message: "Montonio ENV puudub (MONTONIO_SECRET_KEY / MONTONIO_API_BASE)."
      });
    }

    // Payload (üldine struktuur — kohandame 100% Montonio docs järgi järgmises osas)
    const payload = {
      merchantReference: orderId,
      currency: "EUR",
      amount: Number(total).toFixed(2),

      customer: {
        email: customer.email,
        firstName: customer.firstName || "",
        lastName: customer.lastName || ""
      },

      items: items.map((i) => ({
        name: i.name,
        quantity: Number(i.qty || 1),
        unitPrice: Number(i.price).toFixed(2)
      })),

      returnUrl: successUrl,
      cancelUrl: cancelUrl,

      meta: {
        eventTitle: event.title,
        eventId: event.id || "",
        city: event.city || ""
      }
    };

    // Signed token (HS256) — “server-to-server” muster
    const token = jwt.sign(payload, MONTONIO_SECRET_KEY, {
      algorithm: "HS256",
      expiresIn: "10m",
      issuer: "ticketrise",
      audience: MONTONIO_ENV
    });

    // Endpoint (jääb praegu /payments — järgmises osas teeme täpselt Montonio järgi)
    const endpoint = `${stripSlash(MONTONIO_API_BASE)}/payments`;

    const r = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(MONTONIO_ACCESS_KEY ? { "X-Access-Key": MONTONIO_ACCESS_KEY } : {})
      },
      body: JSON.stringify({ token })
    });

    const json = await r.json().catch(() => ({}));

    if (!r.ok) {
      return res.status(502).json({
        ok: false,
        error: "Montonio create payment failed",
        status: r.status,
        details: json
      });
    }

    const paymentUrl = json.paymentUrl || json?.data?.paymentUrl || json?.redirectUrl || json?.data?.redirectUrl;

    if (!paymentUrl) {
      return res.status(502).json({
        ok: false,
        error: "No paymentUrl in Montonio response",
        details: json
      });
    }

    return res.status(200).json({ ok: true, paymentUrl });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "Server error", message: e?.message || String(e) });
  }
}

function stripSlash(s) {
  return String(s || "").replace(/\/+$/, "");
}
