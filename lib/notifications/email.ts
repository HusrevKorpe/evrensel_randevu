import "server-only";

/**
 * E-POSTA GÖNDERİM KATMANI (kanal soyutlaması).
 *
 * Şimdilik tek kanal: Resend (https://resend.com). SDK yerine düz HTTP
 * kullanıyoruz — ekstra bağımlılık yok, API tek bir POST'tan ibaret.
 *
 * RESEND_API_KEY tanımlı değilse gönderim SESSİZCE ATLANIR (console'a
 * özet düşer) — böylece anahtar gelmeden de site sorunsuz çalışır.
 * İleride WhatsApp/SMS eklenirse bu dosyanın yanına yeni kanal gelir;
 * çağıran kod (appointments.ts) değişmez.
 */

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendResult = { ok: boolean; skipped?: boolean; error?: string };

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Gönderen adresi. Resend'te kendi alan adın doğrulanana kadar test için
 * "onboarding@resend.dev" kullanılabilir (yalnızca kendi hesabına gönderir).
 */
function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL || "Berber Randevu <onboarding@resend.dev>";
}

export async function sendEmail(msg: EmailMessage): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(
      `[e-posta atlandı: RESEND_API_KEY yok] to=${msg.to} subject="${msg.subject}"`,
    );
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`sendEmail: Resend ${res.status} — ${body.slice(0, 300)}`);
      return { ok: false, error: `Resend ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("sendEmail:", err);
    return { ok: false, error: "Ağ hatası" };
  }
}
