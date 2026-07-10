"use client";

/**
 * KÖK layout çökerse devreye giren son savunma hattı. Root layout'un yerine
 * render edildiği için kendi <html>/<body> etiketlerini tanımlamak ve global
 * CSS'e güvenMEmek zorunda — stiller inline.
 */
export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0a0a0a",
          color: "#fafafa",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
            Bir şeyler ters gitti
          </h1>
          <p style={{ color: "#a3a3a3", marginBottom: "1.25rem" }}>
            Beklenmedik bir hata oluştu. Lütfen tekrar dene.
          </p>
          <button
            onClick={() => unstable_retry()}
            style={{
              background: "#e2b857",
              color: "#1a1405",
              border: 0,
              borderRadius: "0.75rem",
              padding: "0.6rem 1.4rem",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Tekrar dene
          </button>
        </div>
      </body>
    </html>
  );
}
