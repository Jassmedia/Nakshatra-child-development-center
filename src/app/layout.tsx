import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Nakshatra Child Development Center",
    template: "%s · Nakshatra CDC",
  },
  description: "Student & Parent Management System for Nakshatra Child Development Center.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1e2a4a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-paper font-sans text-ink-800">{children}</body>
    </html>
  );
}
