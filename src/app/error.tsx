"use client";

import Link from "next/link";
import { useEffect } from "react";

import { buttonClass } from "@/components/ui/button";

// Shown when something on a page fails unexpectedly. No technical details are shown to users.
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-start justify-center gap-4 px-4 py-16">
      <h1 className="text-2xl font-bold">This page could not be loaded</h1>
      <p className="text-[15px] text-ink-500">
        Something went wrong on our side, or the connection dropped. Your saved information is safe. Try again, and if it keeps
        happening, tell the center administrator{error.digest ? ` (reference ${error.digest})` : ""}.
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={() => retry()} className={buttonClass("primary")}>Try again</button>
        <Link href="/" className={buttonClass("secondary")}>Go to my home page</Link>
      </div>
    </main>
  );
}
