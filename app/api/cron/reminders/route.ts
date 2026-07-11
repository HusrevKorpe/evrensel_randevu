import type { NextRequest } from "next/server";
import { sendPendingNags } from "@/lib/notifications/appointments";

/**
 * BEKLEYEN RANDEVU DÜRTMESİ — GET /api/cron/reminders
 *
 * (Faz 5'te müşteriye hatırlatma atıyordu; Faz 7 kararıyla görevi değişti:
 * artık yanıtlanmamış `pending` randevuları BERBERE hatırlatır. URL,
 * vercel.json'daki cron tanımı bozulmasın diye aynı kaldı.)
 *
 * Vercel Cron bu adresi zamanlanmış olarak çağırır (vercel.json > crons).
 * Vercel, projede CRON_SECRET ortam değişkeni tanımlıysa isteğe otomatik
 * "Authorization: Bearer <CRON_SECRET>" başlığı ekler — biz de doğrularız
 * ki adresi bilen herkes cron'u tetikleyemesin.
 *
 * Elle test: curl -H "Authorization: Bearer $CRON_SECRET" .../api/cron/reminders
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (secret) {
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    // Prod'da gizli anahtar şart — yanlış yapılandırmayı açıkça söyle.
    return Response.json(
      { ok: false, error: "CRON_SECRET tanımlı değil." },
      { status: 500 },
    );
  }

  const result = await sendPendingNags();
  return Response.json(result, { status: result.ok ? 200 : 500 });
}
