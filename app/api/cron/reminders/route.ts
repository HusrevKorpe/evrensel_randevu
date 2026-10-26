import { after } from "next/server";
import type { NextRequest } from "next/server";
import { notifyTimedOut, sendPendingNags } from "@/lib/notifications/appointments";
import { expirePendingAppointments } from "@/lib/booking/customer-status";

/**
 * BEKLEYEN RANDEVU BAKIMI — GET /api/cron/reminders
 *
 * İki iş yapar:
 *   1) ZAMAN AŞIMI SÜPÜRMESİ: süresi geçmiş `pending` randevuları otomatik
 *      iptal eder (yumuşak, cancel_reason='timeout') → slotları serbest bırakır.
 *      Sayfayı AÇAN müşteri için bu zaten anında olur (tembel expire); bu adım
 *      açmayanları temizler. Önce bunu yaparız ki dürtmeye onları KATMAYALIM.
 *   2) DÜRTME: hâlâ bekleyen (süresi dolmamış) randevuları BERBERE hatırlatır.
 *
 * (Faz 5'te müşteriye hatırlatma atıyordu; Faz 7'de berber-dürtmesine döndü.
 * URL, vercel.json'daki cron tanımı bozulmasın diye aynı kaldı.)
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

  // 1) Önce süresi geçmişleri temizle, 2) kalanları berbere hatırlat.
  const swept = await expirePendingAppointments();

  // Zaman aşımına düşen randevuların (izin vermiş) müşterilerine PUSH bildir —
  // cevabı bekletmeden. Push-only; e-posta akışı etkilenmez.
  if (swept.ids.length) {
    after(() => Promise.all(swept.ids.map((id) => notifyTimedOut(id))));
  }

  const result = await sendPendingNags();
  return Response.json(
    { ...result, expired: swept.expired },
    { status: result.ok ? 200 : 500 },
  );
}
