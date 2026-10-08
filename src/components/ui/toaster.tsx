"use client";

import { useEffect, useState } from "react";

const EVENT = "app:toast";

/** Show a short confirmation that survives the form disappearing (e.g. an item leaving a list). */
export function toast(message: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: message }));
}

/** Mounted once in the root layout. Announces messages politely to screen readers. */
export function Toaster() {
  const [items, setItems] = useState<Array<{ id: number; message: string }>>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const id = Date.now() + Math.random();
      setItems((list) => [...list.slice(-2), { id, message: (e as CustomEvent<string>).detail }]);
      window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 5000);
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <p key={t.id} className="pointer-events-auto flex max-w-md items-start gap-2 rounded-xl bg-ink-800 px-4 py-3 text-[15px] text-white shadow-lg">
          <svg aria-hidden viewBox="0 0 20 20" className="mt-0.5 h-5 w-5 shrink-0 fill-star-500">
            <path d="M8.2 13.6l-3.5-3.5 1.4-1.4 2.1 2.1 5.7-5.7 1.4 1.4z" />
          </svg>
          {t.message}
        </p>
      ))}
    </div>
  );
}
