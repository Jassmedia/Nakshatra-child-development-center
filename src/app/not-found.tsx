import Link from "next/link";

import { buttonClass } from "@/components/ui/button";
import { StarMark } from "@/components/ui/star-mark";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-start justify-center gap-4 px-4 py-16">
      <StarMark className="h-10 w-10" />
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-[15px] text-ink-500">
        This page doesn&apos;t exist, or you don&apos;t have access to it. If you followed a link from the center, ask them to check it.
      </p>
      <Link href="/" className={buttonClass("primary")}>Go to my home page</Link>
    </main>
  );
}
