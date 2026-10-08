import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary: "bg-ink-600 text-white hover:bg-ink-700",
  secondary: "border border-line bg-white text-ink-800 hover:bg-ink-50",
  danger: "border border-rose-600 bg-white text-rose-800 hover:bg-rose-50",
  ghost: "text-ink-600 hover:bg-ink-50",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-[15px]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
