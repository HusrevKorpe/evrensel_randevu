import { siteConfig } from "@/lib/site";
import { formatClock, formatDateLong } from "@/lib/format";
import type { ApprovalLinks } from "@/lib/notifications/approval-token";

/**
 * E-POSTA ŞABLONLARI (Faz 7 düzeni).
 *
 * Berbere: yeni randevu talebi (tek tıkla onay/red butonlu) + bekleyen
 * randevu dürtmesi (cron). Müşteriye: YALNIZCA iptal/red bildirimi —
 * "talep alındı" / "onaylandı" / hatırlatma mailleri bilinçli kaldırıldı.
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
const GREEN = "#1d8a4a";
const RED = "#b3372f";

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
function detailRows(d: AppointmentEmailData, forBarber: boolean): [string, string][] {
  const rows: [string, string][] = [
    ["Tarih", when(d)],
    ["Hizmet", d.serviceName],
    ["Usta", d.barberName],
    ["Referans", d.reference],
  ];
  if (forBarber) {
    rows.unshift(["Müşteri", `${d.customerName} — ${d.customerPhone}`]);
    if (d.notes) rows.push(["Not", d.notes]);
  }
  return rows;
}

/** Detay tablosu (gri kart). */
function detailTable(d: AppointmentEmailData, forBarber: boolean): string {
  const rows = detailRows(d, forBarber)
    .map(
      ([k, v]) => `
        <tr>
          <td style="padding:6px 12px 6px 0;color:#8a8a8a;font-size:13px;white-space:nowrap;vertical-align:top;">${esc(k)}</td>
          <td style="padding:6px 0;color:#1a1a1a;font-size:14px;font-weight:500;">${esc(v)}</td>
        </tr>`,
    )
    .join("");
  return `<table role="presentation" style="border-collapse:collapse;width:100%;background:#faf8f4;border-radius:12px;padding:8px;margin:0 0 4px;" cellpadding="8">${rows}</table>`;
}

/** ✅ Onayla / ❌ Reddet buton çifti. Linkler onay SAYFASINA gider (GET'te
 *  işlem yapılmaz — mail tarayıcıları linkleri otomatik açabilir). */
function actionButtons(links: ApprovalLinks): string {
  const btn = (href: string, label: string, bg: string, fg: string, border: string) =>
    `<a href="${esc(href)}" style="display:inline-block;padding:11px 22px;border-radius:10px;background:${bg};color:${fg};border:1px solid ${border};font-size:14px;font-weight:600;text-decoration:none;">${label}</a>`;
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0 4px;">
      <tr>
        <td>${btn(links.approveUrl, "✅ Onayla", GREEN, "#ffffff", GREEN)}</td>
        <td style="padding-left:12px;">${btn(links.rejectUrl, "❌ Reddet", "#ffffff", RED, "#e3b6b2")}</td>
      </tr>
    </table>`;
}

/** Ortak dış çerçeve: başlık şeridi + içerik + dükkan bilgili alt bilgi. */
function shell(title: string, bodyHtml: string): string {
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
      ${bodyHtml}
    </div>
    <div style="padding:16px 24px;border-top:1px solid #e6e2da;font-size:12px;color:#8a8a8a;line-height:1.6;">
      ${esc(siteConfig.address)}<br>
      Tel: ${esc(siteConfig.phone)}
    </div>
  </div>
</body>
</html>`;
}

function intro(text: string): string {
  return `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#4a4a4a;">${esc(text)}</p>`;
}

function plainText(
  title: string,
  introText: string,
  d: AppointmentEmailData,
  forBarber = false,
): string {
  const rows = detailRows(d, forBarber)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  return `${title}\n\n${introText}\n\n${rows}\n\n${siteConfig.name} · ${siteConfig.address} · ${siteConfig.phone}`;
}

// ── Müşteriye giden TEK şablon: iptal/red ────────────────────────────────

/** Randevu iptal edildi (admin iptali veya berberin maili/sayfadan reddi). */
export function cancelledEmail(d: AppointmentEmailData): EmailContent {
  const title = "Randevun iptal edildi";
  const text = `Merhaba ${d.customerName}, aşağıdaki randevun iptal edildi. Dilersen sitemizden yeni bir randevu alabilirsin.`;
  return {
    subject: `Randevun iptal edildi — ${when(d)}`,
    html: shell(title, intro(text) + detailTable(d, false)),
    text: plainText(title, text, d),
  };
}

// ── Berbere giden şablonlar ──────────────────────────────────────────────

/**
 * Berbere yeni randevu talebi. `links` varsa tek tıkla onay/red butonları
 * eklenir; yoksa (imza anahtarı tanımsız) panele yönlendiren metin kalır.
 */
export function newBookingBarberEmail(
  d: AppointmentEmailData,
  links: ApprovalLinks | null,
): EmailContent {
  const title = "Yeni randevu talebi 💈";
  const text = links
    ? "Sana yeni bir randevu talebi geldi. Aşağıdaki butonlarla tek tıkla yanıtlayabilirsin."
    : "Sana yeni bir randevu talebi geldi. Panelden onaylayabilirsin.";
  const html = shell(
    title,
    intro(text) + detailTable(d, true) + (links ? actionButtons(links) : ""),
  );
  const plain =
    plainText(title, text, d, true) +
    (links ? `\n\nOnayla: ${links.approveUrl}\nReddet: ${links.rejectUrl}` : "");
  return {
    subject: `Yeni randevu: ${d.customerName} — ${when(d)}`,
    html,
    text: plain,
  };
}

/** Bekleyen randevu dürtmesindeki tek kalem: randevu + (varsa) linkleri. */
export type PendingNagItem = {
  data: AppointmentEmailData;
  links: ApprovalLinks | null;
};

/**
 * Berbere günlük dürtme: hâlâ yanıtlanmamış (pending) randevuların listesi.
 * Cron günde bir çalıştığı için randevu yanıtlanana dek her sabah yinelenir.
 */
export function pendingNagEmail(
  barberName: string,
  items: PendingNagItem[],
): EmailContent {
  const title = "Yanıt bekleyen randevuların var ⏳";
  const text = `${barberName}, ${items.length} randevu talebi hâlâ yanıtını bekliyor. Müşteriyi bekletmemek için aşağıdan onayla ya da reddet.`;

  const blocks = items
    .map(
      ({ data, links }) =>
        detailTable(data, true) + (links ? actionButtons(links) : ""),
    )
    .join(`<hr style="border:none;border-top:1px solid #e6e2da;margin:20px 0;">`);

  const plainBlocks = items
    .map(({ data, links }) => {
      const rows = detailRows(data, true)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");
      const linkLines = links
        ? `\nOnayla: ${links.approveUrl}\nReddet: ${links.rejectUrl}`
        : "";
      return rows + linkLines;
    })
    .join("\n\n---\n\n");

  return {
    subject: `${items.length} randevu talebi yanıtını bekliyor`,
    html: shell(title, intro(text) + blocks),
    text: `${title}\n\n${text}\n\n${plainBlocks}\n\n${siteConfig.name} · ${siteConfig.address} · ${siteConfig.phone}`,
  };
}
