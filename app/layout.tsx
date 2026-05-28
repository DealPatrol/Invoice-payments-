import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InvoiceOS - Global Invoice Management",
  description: "Create, manage, and receive payments for invoices across 40+ global e-invoicing networks",
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
      <body>{children}</body>
    </html>
  );
}
