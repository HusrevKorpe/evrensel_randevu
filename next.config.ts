import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      // Tüm rotalar için temel güvenlik başlıkları.
      {
        source: "/(.*)",
        headers: [
          // MIME türü tahminini kapat (yanlış içerik türü saldırılarına karşı).
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Siteyi iframe'e gömmeyi engelle (clickjacking'e karşı).
          { key: "X-Frame-Options", value: "DENY" },
          // Referrer bilgisini kısıtla (gizlilik + güvenlik dengesi).
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      // Service worker: HER ZAMAN taze çekilsin ve doğru MIME ile sunulsun.
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          // Service worker yalnızca kendi kaynağından script çalıştırsın.
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
