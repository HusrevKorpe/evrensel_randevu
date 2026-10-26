import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/auth/session";

/**
 * PROXY (eski adıyla "middleware" — Next 16'da yeniden adlandırıldı).
 *
 * 1. BAKIM MODU: Vercel'de `MAINTENANCE_MODE=1` ise site tamamen kapanır,
 *    her sayfa ve günlük cron dahil her istek düz "Error" (503) döner —
 *    hatırlatma/bildirim gitmez. DB'ye istek gitmediği için ücretsiz Supabase
 *    7 günde uykuya dalar; açarken panelden "Resume project" gerekir.
 *    Açmak için değişkeni silip yeniden deploy etmek yeterli.
 * 2. `/admin` isteklerinde Supabase oturumunu tazeler ve giriş yapmamış
 *    ziyaretçiyi giriş sayfasına yönlendirir.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (process.env.MAINTENANCE_MODE === "1") {
    return new Response("Error", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return await updateSession(request);
  }
}

export const config = {
  // Bakım modu her sayfayı kapsasın diye tüm yollar; Next'in kendi statik
  // dosyaları hariç.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
