import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * E-POSTA GÖNDERİM KATMANI (kanal soyutlaması).
 *
 * İKİ KANAL var, sırayla denenir — çağıran kod (appointments.ts) hiçbir şey
 * bilmez, hep `sendEmail()` çağırır:
 *
 *  1) GMAIL SMTP — `GMAIL_USER` + `GMAIL_APP_PASSWORD` tanımlıysa kullanılır.
 *     Alan adı (domain) GEREKTİRMEZ: mail doğrudan Google'ın sunucusundan
 *     çıkar, SPF/DKIM zaten Google'ın olduğu için spam'e düşmez. Ücretsiz
 *     Gmail hesabında günlük ~500 alıcı sınırı vardır (kuaför için fazlasıyla
 *     yeter). Şifre olarak HESAP ŞİFRESİ DEĞİL, "Uygulama Şifresi" girilir
 *     (Google Hesabı > Güvenlik > 2 Adımlı Doğrulama > Uygulama Şifreleri).
 *
 *  2) RESEND — `RESEND_API_KEY` tanımlıysa kullanılır (Gmail yoksa).
 *     Doğrulanmış kendi alan adın olduğunda tercih edilir: gönderen adres
 *     "randevu@alanadin.com" gibi kurumsal görünür. Alan adı doğrulanana
 *     kadar Resend yalnızca KENDİ hesap adresine mail atmana izin verir —
 *     bu yüzden domain yokken Gmail kanalı kullanılır.
 *
 * Hiçbiri tanımlı değilse gönderim SESSİZCE ATLANIR (console'a özet düşer) —
 * böylece anahtar gelmeden de site sorunsuz çalışır.
 */

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
  /** Hangi kanaldan gitti — log/teşhis için. */
  channel?: "gmail" | "resend";
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/** Maillerde görünecek gönderen adı (adres kanala göre değişir). */
function fromName(): string {
  return process.env.MAIL_FROM_NAME || "Evrensel Kuaför";
}

// ── Kanal 1: Gmail SMTP ──────────────────────────────────────────────────

/**
 * Transporter'ı modül düzeyinde bir kez kurup saklarız: Vercel'de sıcak
 * (warm) fonksiyon örneği boyunca aynı SMTP bağlantısı yeniden kullanılır,
 * her mailde yeniden TLS el sıkışması yapılmaz.
 */
let gmailTransport: Transporter | null = null;

function getGmailTransport(): Transporter | null {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;

  if (!gmailTransport) {
    gmailTransport = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // 465 = baştan TLS
      auth: {
        user,
        // Uygulama şifreleri panelde "abcd efgh ijkl mnop" diye boşluklu
        // gösterilir; kopyala-yapıştırda boşluk kalırsa auth patlar → temizle.
        pass: pass.replace(/\s+/g, ""),
      },
      pool: true,
      maxConnections: 1,
    });
  }
  return gmailTransport;
}

async function sendViaGmail(
  transport: Transporter,
  msg: EmailMessage,
): Promise<SendResult> {
  try {
    // Gönderen adresi Gmail tarafından zaten kimliği doğrulanmış hesaba
    // sabitlenir; farklı bir adres yazmak işe yaramaz, o yüzden GMAIL_USER.
    await transport.sendMail({
      from: { name: fromName(), address: process.env.GMAIL_USER as string },
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    });
    return { ok: true, channel: "gmail" };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`sendEmail(gmail): ${detail}`);
    return { ok: false, error: detail.slice(0, 200), channel: "gmail" };
  }
}

// ── Kanal 2: Resend ──────────────────────────────────────────────────────

/**
 * Gönderen adresi. Resend'te kendi alan adın doğrulanana kadar test için
 * "onboarding@resend.dev" kullanılabilir (yalnızca kendi hesabına gönderir).
 */
function resendFromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL || `${fromName()} <onboarding@resend.dev>`
  );
}

async function sendViaResend(
  apiKey: string,
  msg: EmailMessage,
): Promise<SendResult> {
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resendFromAddress(),
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`sendEmail: Resend ${res.status} — ${body.slice(0, 300)}`);
      return { ok: false, error: `Resend ${res.status}`, channel: "resend" };
    }
    return { ok: true, channel: "resend" };
  } catch (err) {
    console.error("sendEmail:", err);
    return { ok: false, error: "Ağ hatası", channel: "resend" };
  }
}

// ── Ortak giriş noktası ──────────────────────────────────────────────────

export async function sendEmail(msg: EmailMessage): Promise<SendResult> {
  const gmail = getGmailTransport();
  if (gmail) return sendViaGmail(gmail, msg);

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) return sendViaResend(apiKey, msg);

  console.log(
    `[e-posta atlandı: gönderim kanalı yapılandırılmamış] to=${msg.to} subject="${msg.subject}"`,
  );
  return { ok: false, skipped: true };
}
