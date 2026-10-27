import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { themeScript } from "@/components/ThemeToggle";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: "InvoiceOS - Global Invoice Management",
  description: "Create invoices, collect payments, automate reminders, and track receivables",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f7f8fa" }, { media: "(prefers-color-scheme: dark)", color: "#0a0f1a" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} bg-[var(--background)] text-[var(--foreground)]`}>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body><Suspense><AppShell>{children}</AppShell></Suspense></body>
    </html>
  );
}
