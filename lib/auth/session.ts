import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * OTURUM TAZELEME + /admin KORUMASI — proxy.ts'ten çağrılır.
 *
 * Neden burada? Supabase oturumu çerezlerde JWT olarak tutar; bu token'ın
 * süresi dolunca YENİLENMESİ gerekir. Yenileme, isteği en başta yakalayan
 * proxy'de yapılır ki hem sayfa hem server action taze bir oturumla çalışsın.
 *
 * ⚠️ Not: Bu Next.js sürümünde `middleware` kaldırıldı, adı `proxy` oldu ve
 * artık varsayılan olarak Node.js runtime'da çalışıyor (Supabase için ideal).
 */

const LOGIN_PATH = "/admin/giris";

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  // İşe "olduğu gibi devam et" cevabıyla başlarız; Supabase çerez tazelerse
  // aşağıdaki setAll bu response'u yeniden kurup taze çerezleri iliştirir.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Hem gelen isteğe (aşağı akışa) hem de giden cevaba yaz.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // ÖNEMLİ: createServerClient ile getUser arasına başka kod koyma —
  // token tazeleme tam burada olur. getUser sunucuda DOĞRULANMIŞ kullanıcıyı verir
  // (çerezdeki veriye körlemesine güvenmez).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isLoginPage = path === LOGIN_PATH;

  // 1) Girişsiz + korumalı admin sayfası → login'e yönlendir (nereye gitmek
  //    istediğini `next` ile taşı ki girişten sonra oraya dönebilelim).
  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // 2) Zaten girişli + login sayfasındaysa → doğrudan panele al.
  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
