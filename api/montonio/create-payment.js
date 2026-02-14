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
    const env = process.env.MONTONIO_ENV || "sandbox"; // sandbox | live
    const base = stripSlash(process.env.MONTONIO_API_BASE || "");
    const accessKey = process.env.MONTONIO_ACCESS_KEY || "";
    const secretKey = process.env.MONTONIO_SECRET_KEY || "";

    // Preview mode (env puudu)
    if (!base || !secretKey) {
      return res.status(200).json({
        ok: true,
        preview: true,
        message: "Montonio ENV puudub (MONTONIO_API_BASE / MONTONIO_SECRET_KEY)."
      });
    }

    // Payload (starter – kohandame 1:1 Montonio docs järgi hiljem)
    const payload = {
      merchantReference: orderId,
      currency: "EUR",
      amount: Number(total).toFixed(2),
      customer: {
        email: String(customer.email || ""),
        firstName: String(customer.firstName || ""),
        lastName: String(customer.lastName || "")
      },
      items: items.map((i) => ({
        name: String(i.name || "Ticket"),
        quantity: Number(i.qty || 1),
        unitPrice: Number(i.price || 0).toFixed(2)
      })),
      returnUrl: String(successUrl || ""),
      cancelUrl: String(cancelUrl || ""),
      meta: {
        eventTitle: String(event.title || ""),
        eventId: String(event.id || ""),
        city: String(event.city || "")
      }
    };

    // JWT token (HS256) – “starter”
    const token = jwt.sign(payload, secretKey, {
      algorithm: "HS256",
      expiresIn: "10m",
      issuer: "ticketrise",
      audience: env
    });

    // Starter endpoint (tavaliselt see EI OLE lõplik – kohandame docs järgi)
    const endpoint = `${base}/payments`;

    const r = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessKey ? { "X-Access-Key": accessKey } : {})
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

    const paymentUrl =
      json.paymentUrl ||
      json.redirectUrl ||
      json?.data?.paymentUrl ||
      json?.data?.redirectUrl;

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
