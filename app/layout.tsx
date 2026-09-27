import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "InvoiceOS - Global Invoice Management",
  description: "Create invoices, collect payments, automate reminders, and track receivables",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#4f6ef7",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-[var(--background)] text-[var(--foreground)]">
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}
