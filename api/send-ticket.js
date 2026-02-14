// api/send-ticket.js
import { Resend } from "resend";
import nodemailer from "nodemailer";
import QRCode from "qrcode";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const { type, to, order, event } = req.body || {};
    if (!to || !String(to).includes("@")) return res.status(400).json({ ok: false, error: "Missing/invalid to" });

    const from = process.env.MAIL_FROM || "Ticketrise <onboarding@resend.dev>";

    const canResend = !!process.env.RESEND_API_KEY;
    const canSmtp = !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASS;

    // Preview mode: kui pole ühtegi maili providerit
    if (!canResend && !canSmtp) {
      return res.status(200).json({ ok: true, preview: true, message: "No email provider configured" });
    }

    // ========== WELCOME ==========
    if (type === "welcome") {
      const subject = "Ticketrise — konto loodud ✅";
      const html = `
        <div style="font-family:Inter,Arial,sans-serif;line-height:1.55">
          <h2 style="margin:0 0 10px">Tere!</h2>
          <p style="margin:0 0 10px">Sinu Ticketrise konto on loodud. Võid nüüd sisse logida ja kasutada platvormi.</p>
          <p style="margin:0;color:#666">Kui see polnud sina, ignoreeri seda kirja.</p>
        </div>
      `;
      await sendEmail({ canResend, canSmtp, from, to, subject, html });
      return res.status(200).json({ ok: true });
    }

    // ========== ORGANIZER PROFILE ==========
    if (type === "organizer_profile") {
      const subject = "Ticketrise — korraldaja andmed salvestatud ✅";
      const html = `
        <div style="font-family:Inter,Arial,sans-serif;line-height:1.55">
          <h2 style="margin:0 0 10px">Korraldaja andmed salvestatud</h2>
          <p style="margin:0 0 10px">Täname! Kui lisad ka väljamaksed (IBAN), saad üritusi avalikuks panna.</p>
          <p style="margin:0;color:#666">Kui sa seda muudatust ei teinud, anna teada.</p>
        </div>
      `;
      await sendEmail({ canResend, canSmtp, from, to, subject, html });
      return res.status(200).json({ ok: true });
    }

    // ========== TICKETS ==========
    if (type === "tickets") {
      if (!order || !event) return res.status(400).json({ ok: false, error: "Missing order/event" });

      const safeEventTitle = escapeHtml(event.title);
      const safeLoc = escapeHtml(event.location || "");
      const safeCity = escapeHtml(event.city || "");
      const when = event.startISO ? new Date(event.startISO).toLocaleString("et-EE") : "";

      const tickets = Array.isArray(order.tickets) ? order.tickets : [];
      if (!tickets.length) return res.status(400).json({ ok: false, error: "Missing order.tickets" });

      // QR: hoia payload minimaalne (väldi liiga palju PII)
      const qrBlocks = [];
      for (const t of tickets) {
        const code = String(t.code || "").trim();
        const ticketName = String(t.ticketName || "Pilet").trim();
        if (!code) continue;

        const qrPayload = JSON.stringify({
          v: 1,
          code,
          eventId: String(order.eventId || ""),
          orderId: String(order.id || "")
        });

        const dataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 220 });

        qrBlocks.push(`
          <div style="border:1px solid #eaeaea;border-radius:14px;padding:12px;margin:12px 0;background:#fff">
            <div style="font-weight:900;margin-bottom:6px;color:#0b1220">${escapeHtml(ticketName)}</div>
            <div style="color:#667085;margin-bottom:10px">Kood: <b>${escapeHtml(code)}</b></div>
            <img src="${dataUrl}" alt="QR" width="220" height="220" style="display:block;border-radius:12px;border:1px solid #eee" />
          </div>
        `);
      }

      const totalStr = Number(order.total || 0).toFixed(2) + " €";

      const subject = `Sinu piletid: ${event.title}`;
      const html = `
        <div style="font-family:Inter,Arial,sans-serif;line-height:1.55;background:#f6f7fb;padding:18px">
          <div style="max-width:720px;margin:0 auto">
            <div style="border-radius:16px;overflow:hidden;border:1px solid #eaeaea;background:#fff">
              ${event.image ? `<img src="${escapeHtml(event.image)}" alt="" style="width:100%;height:240px;object-fit:cover;display:block" />` : ``}
              <div style="padding:16px">
                <h2 style="margin:0 0 6px;color:#0b1220">${safeEventTitle}</h2>
                <div style="color:#667085;margin-bottom:10px">${safeLoc} • ${safeCity} • ${escapeHtml(when)}</div>
                <div style="font-weight:900;margin:10px 0;color:#0b1220">Tellimus: ${escapeHtml(order.id)}</div>
                <div style="color:#667085">Kokku: <b style="color:#0b1220">${escapeHtml(totalStr)}</b></div>
              </div>
            </div>

            <h3 style="margin:18px 0 8px;color:#0b1220">QR-piletid</h3>
            ${qrBlocks.join("")}

            <p style="color:#667085;margin-top:16px">
              Näita QR-koodi check-in’is. Kui tekib mure, vasta sellele kirjale.
            </p>
          </div>
        </div>
      `;

      await sendEmail({ canResend, canSmtp, from, to, subject, html });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ ok: false, error: "Unknown type" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "Server error", message: e?.message || String(e) });
  }
}

async function sendEmail({ canResend, canSmtp, from, to, subject, html }) {
  if (canResend) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from, to, subject, html });
    return;
  }

  // SMTP fallback
  const SMTP_HOST = process.env.SMTP_HOST;
  const SMTP_PORT = Number(process.env.SMTP_PORT || "587");
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });

  await transporter.sendMail({ from, to, subject, html });
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
