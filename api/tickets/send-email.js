// api/tickets/send-email.js
import nodemailer from "nodemailer";
import QRCode from "qrcode";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { to, subject, ticket } = req.body || {};
    if (!to || !ticket?.qrText) return res.status(400).json({ error: "Missing to / ticket.qrText" });

    const SMTP_HOST = process.env.SMTP_HOST;
    const SMTP_PORT = Number(process.env.SMTP_PORT || "587");
    const SMTP_USER = process.env.SMTP_USER;
    const SMTP_PASS = process.env.SMTP_PASS;
    const MAIL_FROM = process.env.MAIL_FROM;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !MAIL_FROM) {
      return res.status(500).json({ error: "SMTP env missing" });
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });

    const qrDataUrl = await QRCode.toDataURL(ticket.qrText, { margin: 1, scale: 6 });

    const html = `
      <div style="font-family:Inter,Arial,sans-serif;background:#0b1220;color:#eaf0ff;padding:20px">
        <div style="max-width:620px;margin:0 auto;background:#111a2e;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:18px">
          <h2 style="margin:0 0 8px 0">Sinu pilet – Ticketrise ✅</h2>
          <p style="margin:0 0 10px 0;color:#9fb0d0">
            Aitäh! Siin on sinu QR-kood. Näita seda ukse peal.
          </p>
          <div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;margin-top:12px">
            <img alt="QR" src="${qrDataUrl}" style="width:220px;height:220px;border-radius:12px;background:#fff;padding:10px">
            <div style="min-width:260px">
              <div style="font-weight:800;margin-bottom:6px">${ticket.eventTitle || ""}</div>
              <div style="color:#9fb0d0;margin-bottom:6px">${ticket.eventWhen || ""}</div>
              <div style="color:#9fb0d0;margin-bottom:6px">${ticket.ticketName || ""} × ${ticket.qty || 1}</div>
              <div style="font-size:12px;color:#9fb0d0;margin-top:10px">QR tekst:</div>
              <div style="font-weight:800;word-break:break-all">${ticket.qrText}</div>
            </div>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: MAIL_FROM,
      to,
      subject: subject || "Sinu Ticketrise pilet",
      html
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: "Email send failed", message: e?.message || String(e) });
  }
}
