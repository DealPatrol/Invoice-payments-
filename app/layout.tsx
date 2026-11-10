import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter, Fraunces } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { themeScript } from "@/components/ThemeToggle";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const fraunces = Fraunces({ subsets: ["latin"], display: "swap", variable: "--font-serif" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || "https://invoice-payments-two.vercel.app"),
  title: "Invoice Laboratory",
  description: "Photo estimates priced from your own price book, one-tap invoices, and client approval links for contractors.",
  applicationName: "Invoice Laboratory",
  manifest: "/manifest.webmanifest",
  openGraph: { title: "Invoice Laboratory", description: "Snap it. Say it. Send it, priced from your book.", type: "website" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f3efe6" }, { media: "(prefers-color-scheme: dark)", color: "#14110e" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${fraunces.variable} bg-[var(--background)] text-[var(--foreground)]`}>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body><Suspense><AppShell>{children}</AppShell></Suspense></body>
    </html>
  );
}
