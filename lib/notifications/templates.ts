import { siteConfig } from "@/lib/site";
import { formatClock, formatDateLong } from "@/lib/format";

/**
 * E-POSTA ŞABLONLARI — onay / iptal / hatırlatma + berbere yeni randevu.
 *
 * Her şablon {subject, html, text} döner (text = HTML gösteremeyen istemciler
 * ve spam skoru için). HTML, e-posta istemcilerinin ortak paydası için
 * inline-stilli tek sütunlu basit bir kart olarak yazıldı.
 */

export type AppointmentEmailData = {
  customerName: string;
  customerPhone: string;
  serviceName: string;
  barberName: string;
  startsAtISO: string;
  reference: string;
  notes?: string | null;
};

export type EmailContent = { subject: string; html: string; text: string };

const GOLD = "#c79a3a"; // --brand token'ının e-posta karşılığı

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function when(d: AppointmentEmailData): string {
  return `${formatDateLong(d.startsAtISO)} · ${formatClock(d.startsAtISO)}`;
}

/** Randevu detay satırları (hem müşteri hem berber e-postalarında ortak). */
function detailRows(d: AppointmentEmailData, forAdmin: boolean): [string, string][] {
  const rows: [string, string][] = [
    ["Tarih", when(d)],
    ["Hizmet", d.serviceName],
    ["Usta", d.barberName],
    ["Referans", d.reference],
  ];
  if (forAdmin) {
    rows.unshift(["Müşteri", `${d.customerName} — ${d.customerPhone}`]);
    if (d.notes) rows.push(["Not", d.notes]);
  }
  return rows;
}

function layout(title: string, intro: string, d: AppointmentEmailData, forAdmin = false): string {
  const rows = detailRows(d, forAdmin)
    .map(
      ([k, v]) => `
        <tr>
          <td style="padding:6px 12px 6px 0;color:#8a8a8a;font-size:13px;white-space:nowrap;vertical-align:top;">${esc(k)}</td>
          <td style="padding:6px 0;color:#1a1a1a;font-size:14px;font-weight:500;">${esc(v)}</td>
        </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="tr">
<body style="margin:0;padding:24px 12px;background:#f4f2ee;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e6e2da;">
    <div style="padding:20px 24px;border-bottom:3px solid ${GOLD};">
      <span style="font-size:18px;font-weight:700;letter-spacing:0.5px;color:#1a1a1a;">${esc(siteConfig.name)}</span>
      <span style="font-size:12px;color:#8a8a8a;"> · ${esc(siteConfig.slogan)}</span>
    </div>
    <div style="padding:24px;">
      <h1 style="margin:0 0 8px;font-size:18px;color:#1a1a1a;">${esc(title)}</h1>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#4a4a4a;">${esc(intro)}</p>
      <table role="presentation" style="border-collapse:collapse;width:100%;background:#faf8f4;border-radius:12px;padding:8px;" cellpadding="8">
        ${rows}
      </table>
    </div>
    <div style="padding:16px 24px;border-top:1px solid #e6e2da;font-size:12px;color:#8a8a8a;line-height:1.6;">
      ${esc(siteConfig.address)}<br>
      Tel: ${esc(siteConfig.phone)}
    </div>
  </div>
</body>
</html>`;
}

function plainText(title: string, intro: string, d: AppointmentEmailData, forAdmin = false): string {
  const rows = detailRows(d, forAdmin)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  return `${title}\n\n${intro}\n\n${rows}\n\n${siteConfig.name} · ${siteConfig.address} · ${siteConfig.phone}`;
}

// ── Müşteriye giden şablonlar ────────────────────────────────────────────

/** Randevu talebi alındı (status=pending — henüz onaylanmadı). */
export function createdEmail(d: AppointmentEmailData): EmailContent {
  const title = "Randevu talebini aldık";
  const intro = `Merhaba ${d.customerName}, randevu talebin bize ulaştı. Ustamız onayladığında tekrar haber vereceğiz.`;
  return {
    subject: `Randevu talebin alındı — ${when(d)}`,
    html: layout(title, intro, d),
    text: plainText(title, intro, d),
  };
}

/** Randevu onaylandı. */
export function confirmedEmail(d: AppointmentEmailData): EmailContent {
  const title = "Randevun onaylandı ✂️";
  const intro = `Merhaba ${d.customerName}, randevun onaylandı. Seni bekliyoruz!`;
  return {
    subject: `Randevun onaylandı — ${when(d)}`,
    html: layout(title, intro, d),
    text: plainText(title, intro, d),
  };
}

/** Randevu iptal edildi. */
export function cancelledEmail(d: AppointmentEmailData): EmailContent {
  const title = "Randevun iptal edildi";
  const intro = `Merhaba ${d.customerName}, aşağıdaki randevun iptal edildi. Dilersen sitemizden yeni bir randevu alabilirsin.`;
  return {
    subject: `Randevun iptal edildi — ${when(d)}`,
    html: layout(title, intro, d),
    text: plainText(title, intro, d),
  };
}

/** Randevu hatırlatması (randevudan önce cron gönderir). */
export function reminderEmail(d: AppointmentEmailData): EmailContent {
  const title = "Randevu hatırlatması ⏰";
  const intro = `Merhaba ${d.customerName}, yaklaşan randevunu hatırlatmak istedik. Gelemeyeceksen lütfen bizi ara: ${siteConfig.phone}`;
  return {
    subject: `Hatırlatma: ${when(d)} randevun var`,
    html: layout(title, intro, d),
    text: plainText(title, intro, d),
  };
}

// ── Berbere giden şablon ─────────────────────────────────────────────────

/** Berbere yeni randevu talebi bildirimi. */
export function newBookingAdminEmail(d: AppointmentEmailData): EmailContent {
  const title = "Yeni randevu talebi 💈";
  const intro = "Siteden yeni bir randevu talebi geldi. Panelden onaylayabilirsin.";
  return {
    subject: `Yeni randevu: ${d.customerName} — ${when(d)}`,
    html: layout(title, intro, d, true),
    text: plainText(title, intro, d, true),
  };
}
