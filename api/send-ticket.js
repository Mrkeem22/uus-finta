import { Resend } from "resend";
import QRCode from "qrcode";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok:false, error:"Method not allowed" });

  const { type, to, order, event } = req.body || {};
  if (!to || !to.includes("@")) return res.status(400).json({ ok:false, error:"Missing/invalid to" });

  const hasResend = !!process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || "Ticketrise <onboarding@resend.dev>";

  // If RESEND not configured -> preview mode
  if (!hasResend) {
    return res.status(200).json({ ok:true, preview:true });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    if (type === "welcome") {
      await resend.emails.send({
        from,
        to,
        subject: "Ticketrise — konto loodud ✅",
        html: `
          <div style="font-family:Inter,Arial,sans-serif;line-height:1.5">
            <h2>Tere!</h2>
            <p>Sinu Ticketrise konto on loodud. Võid nüüd sisse logida ja kasutada platvormi.</p>
            <p style="color:#666">Kui see polnud sina, ignoreeri seda kirja.</p>
          </div>
        `
      });
      return res.status(200).json({ ok:true });
    }

    if (type === "organizer_profile") {
      await resend.emails.send({
        from,
        to,
        subject: "Ticketrise — korraldaja andmed salvestatud ✅",
        html: `
          <div style="font-family:Inter,Arial,sans-serif;line-height:1.5">
            <h2>Korraldaja andmed salvestatud</h2>
            <p>Täname! Kui lisad ka väljamaksed (IBAN), saad üritusi avalikuks panna.</p>
          </div>
        `
      });
      return res.status(200).json({ ok:true });
    }

    if (type === "tickets") {
      if (!order || !event) return res.status(400).json({ ok:false, error:"Missing order/event" });

      // Create QR images for each ticket code
      const qrBlocks = [];
      for (const t of order.tickets || []) {
        const data = JSON.stringify({
          code: t.code,
          eventId: order.eventId,
          orderId: order.id,
          email: order.buyer?.email,
        });

        const dataUrl = await QRCode.toDataURL(data, { margin: 1, width: 220 });
        qrBlocks.push(`
          <div style="border:1px solid #eee;border-radius:12px;padding:12px;margin:12px 0">
            <div style="font-weight:800;margin-bottom:6px">${escapeHtml(t.ticketName)}</div>
            <div style="color:#666;margin-bottom:10px">Kood: <b>${escapeHtml(t.code)}</b></div>
            <img src="${dataUrl}" alt="QR" width="220" height="220" style="display:block;border-radius:10px;border:1px solid #eee" />
          </div>
        `);
      }

      const start = new Date(event.startISO);
      const when = start.toLocaleString("et-EE");

      await resend.emails.send({
        from,
        to,
        subject: `Sinu piletid: ${event.title}`,
        html: `
          <div style="font-family:Inter,Arial,sans-serif;line-height:1.5">
            <div style="border-radius:14px;overflow:hidden;border:1px solid #eee">
              <img src="${event.image}" alt="" style="width:100%;height:240px;object-fit:cover;display:block" />
              <div style="padding:16px">
                <h2 style="margin:0 0 6px">${escapeHtml(event.title)}</h2>
                <div style="color:#666;margin-bottom:10px">${escapeHtml(event.location)} • ${escapeHtml(event.city)} • ${escapeHtml(when)}</div>
                <div style="font-weight:800;margin:10px 0">Tellimus: ${escapeHtml(order.id)}</div>
                <div style="color:#666">Kokku: <b>${Number(order.total||0).toFixed(2)} €</b></div>
              </div>
            </div>

            <h3 style="margin:18px 0 6px">QR-piletid</h3>
            ${qrBlocks.join("")}

            <p style="color:#666;margin-top:16px">
              Näita QR-koodi check-in’is. Kui tekib mure, vasta sellele kirjale.
            </p>
          </div>
        `
      });

      return res.status(200).json({ ok:true });
    }

    return res.status(400).json({ ok:false, error:"Unknown type" });
  } catch (e) {
    return res.status(500).json({ ok:false, error: String(e?.message || e) });
  }
}

function escapeHtml(s){
  return String(s||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

