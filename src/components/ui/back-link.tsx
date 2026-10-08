import Link from "next/link";

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-8 items-center text-sm font-bold text-ink-600 hover:underline">
      <span aria-hidden className="mr-1">‹</span>
      {children}
    </Link>
  );
}
