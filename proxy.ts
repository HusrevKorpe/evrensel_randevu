import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/auth/session";

/**
 * PROXY (eski adıyla "middleware" — Next 16'da yeniden adlandırıldı).
 * Her `/admin` isteğinden ÖNCE çalışır: Supabase oturumunu tazeler ve
 * giriş yapmamış ziyaretçiyi giriş sayfasına yönlendirir.
 *
 * Sadece `/admin` altında çalışsın diye `matcher` ile sınırladık —
 * vitrin (anasayfa, /randevu) bundan hiç etkilenmez, hızlı kalır.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
