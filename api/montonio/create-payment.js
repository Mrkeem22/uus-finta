// api/montonio/create-payment.js
import jwt from "jsonwebtoken";
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

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

    if (!orderId || !customer?.email || !event?.title || !Array.isArray(items) || !total) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // ENV
    const MONTONIO_ENV = process.env.MONTONIO_ENV || "sandbox"; // sandbox | live
    const MONTONIO_ACCESS_KEY = process.env.MONTONIO_ACCESS_KEY; // publishable / access key (depends on Montonio setup)
    const MONTONIO_SECRET_KEY = process.env.MONTONIO_SECRET_KEY; // server secret
    const MONTONIO_API_BASE = process.env.MONTONIO_API_BASE; // e.g. https://stargate-sandbox.montonio.com (placeholder)

    if (!MONTONIO_SECRET_KEY || !MONTONIO_API_BASE) {
      return res.status(500).json({ error: "Server env not configured (MONTONIO_*)" });
    }

    /**
     * ⚠️ Montonio endpoint & payload võivad olla sinu kontos teistsugused.
     * Ma panen siia "struktuuri", mis on standardne muster:
     * - server loob signed JWT (või HMAC) payloadi
     * - POST makse loomise endpointi
     * - vastusest saad paymentUrl
     *
     * Kui sa annad mulle järgmises sõnumis:
     * 1) mis Montonio API "base url" sul on (docs / dashboard),
     * 2) mis on “create payment” endpoint,
     * siis ma kohandan 100% täpselt.
     */

    const payload = {
      // tüüpiline:
      merchantReference: orderId,
      currency: "EUR",
      amount: Number(total).toFixed(2),

      customer: {
        email: customer.email,
        firstName: customer.firstName || "",
        lastName: customer.lastName || ""
      },

      // “line items” stiil
      items: items.map((i) => ({
        name: i.name,
        quantity: i.qty,
        unitPrice: Number(i.price).toFixed(2)
      })),

      // redirectid
      returnUrl: successUrl,
      cancelUrl: cancelUrl,

      // meta
      meta: {
        eventTitle: event.title,
        eventId: event.id
      }
    };

    // Signed token (näidis HS256)
    const token = jwt.sign(payload, MONTONIO_SECRET_KEY, {
      algorithm: "HS256",
      expiresIn: "10m",
      issuer: "ticketrise",
      audience: MONTONIO_ENV
    });

    // Näidis endpoint (PLACEHOLDER)
    const endpoint = `${MONTONIO_API_BASE}/payments`;

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
        error: "Montonio create payment failed",
        status: r.status,
        details: json
      });
    }

    // Ootame tüüpiliselt { paymentUrl } või { data: { paymentUrl } }
    const paymentUrl = json.paymentUrl || json?.data?.paymentUrl || json?.redirectUrl;

    if (!paymentUrl) {
      return res.status(502).json({ error: "No paymentUrl in Montonio response", details: json });
    }

    return res.status(200).json({ paymentUrl, raw: json });
  } catch (e) {
    return res.status(500).json({ error: "Server error", message: e?.message || String(e) });
  }
}

