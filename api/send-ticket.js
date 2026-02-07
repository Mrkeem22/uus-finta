import QRCode from "qrcode";
import { Resend } from "resend";

const APP_NAME = "PulseTickets";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

    const { buyer, order, event } = req.body || {};
    if (!buyer?.email || !buyer?.firstName || !buyer?.lastName) {
      return res.status(400).json({ ok: false, error: "Buyer fields missing" });
    }
    if (!event?.id || !event?.title) return res.status(400).json({ ok: false, error: "Event missing" });
    if (!order?.items?.length) return res.status(400).json({ ok: false, error: "Order missing" });

    const appUrl = process.env.APP_URL || `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;
    const token = crypto.randomUUID().replaceAll("-", "") + Date.now().toString(16);
    const ticketUrl = `${appUrl}/#ticket-${token}`;

    const qrDataUrl = await QRCode.toDataURL(ticketUrl, { margin: 1, width: 420 });
    const total = typeof order.total === "number" ? order.total.toFixed(2) : String(order.total);

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;background:#f6f7fb;padding:24px">
        <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e6eaf2;border-radius:16px;overflow:hidden">
          <div style="padding:16px 18px;border-bottom:1px solid #e6eaf2">
            <div style="font-weight:900;font-size:16px">${APP_NAME}</div>
            <div style="color:#64748b;font-weight:800;font-size:12px">Sinu digipilet</div>
          </div>
          <div style="padding:18px">
            <div style="font-weight:1000;font-size:18px;margin-bottom:6px">${event.title}</div>
            <div style="color:#475569;font-weight:800;margin-bottom:12px">${event.when} • ${event.where}</div>

            <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start">
              <div style="background:#fff;border:1px solid #e6eaf2;border-radius:14px;padding:10px">
                <img src="${qrDataUrl}" width="210" height="210" alt="QR" />
              </div>
              <div style="flex:1;min-width:240px">
                <div style="font-weight:900;margin-bottom:6px">Token</div>
                <div style="font-family:monospace;word-break:break-all;font-weight:900;color:#0f172a">${token}</div>
                <div style="height:10px"></div>
                <a href="${ticketUrl}" style="display:inline-block;background:#2f5bea;color:#fff;text-decoration:none;font-weight:1000;padding:12px 14px;border-radius:12px">Ava pilet</a>
                <div style="color:#64748b;font-weight:800;font-size:12px;margin-top:10px">
                  Näita sissepääsus QR-i või tokenit.
                </div>
              </div>
            </div>

            <hr style="border:none;border-top:1px solid #e6eaf2;margin:16px 0" />
            <div style="font-weight:1000">Tellimus</div>
            <div style="color:#475569;font-weight:800;font-size:13px;margin-top:6px">
              ${order.items.map(i => `${i.name} × ${i.qty} — €${(i.price * i.qty).toFixed(2)}`).join("<br/>")}
            </div>
            <div style="margin-top:8px;font-weight:1000">Kokku: €${total}</div>
          </div>
        </div>
        <div style="max-width:640px;margin:10px auto 0;color:#94a3b8;font-weight:800;font-size:12px">
          Demo MVP. Päris versioonis lisame maksed + andmebaasi.
        </div>
      </div>
    `;

    // No key -> demo mode (still return token)
    if (!process.env.RESEND_API_KEY) {
      return res.status(200).json({ ok: true, emailed: false, token, ticketUrl });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.MAIL_FROM || "PulseTickets <onboarding@resend.dev>";

    await resend.emails.send({
      from,
      to: buyer.email,
      subject: `${APP_NAME}: ${event.title} – Sinu digipilet`,
      html
    });

    return res.status(200).json({ ok: true, emailed: true, token, ticketUrl });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || "Server error" });
  }
}
