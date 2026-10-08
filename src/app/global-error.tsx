"use client";

// Last-resort error screen (replaces the root layout, so it carries its own minimal styles).
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#f7f8fc", color: "#1e2a4a", margin: 0 }}>
        <title>Something went wrong</title>
        <main style={{ maxWidth: 420, margin: "15vh auto", padding: 16 }}>
          <h1 style={{ fontSize: 24 }}>Something went wrong</h1>
          <p>Please try again. If it keeps happening, contact the center administrator.</p>
          <button type="button" onClick={() => retry()} style={{ background: "#2b3f7a", color: "white", border: 0, borderRadius: 8, padding: "12px 16px", fontWeight: 700 }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
