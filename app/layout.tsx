import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter, Fraunces } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { PwaSupport } from "@/components/PwaSupport";
import { themeScript } from "@/components/ThemeToggle";
import { NativeBridge } from "@/components/native/NativeBridge";
import { NATIVE_FLAG_SCRIPT } from "@/lib/native/platform";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const fraunces = Fraunces({ subsets: ["latin"], display: "swap", variable: "--font-serif" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || "https://invoice-payments-two.vercel.app"),
  title: "Invoice Laboratory",
  description: "Photo estimates priced from your own price book, one-tap invoices, and client approval links for contractors.",
  applicationName: "Invoice Laboratory",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Invoice Lab",
    statusBarStyle: "default",
  },
  icons: {
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: { title: "Invoice Laboratory", description: "Snap it. Say it. Send it, priced from your book.", type: "website" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f3efe6" }, { media: "(prefers-color-scheme: dark)", color: "#14110e" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${fraunces.variable} bg-[var(--background)] text-[var(--foreground)]`}>
      <head>
        {/* Next.js emits mobile-web-app-capable; iOS still honors the Apple-prefixed tag. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: NATIVE_FLAG_SCRIPT }} />
      </head>
      <body>
        <Suspense>
          <PwaSupport />
          <NativeBridge />
          <AppShell>{children}</AppShell>
        </Suspense>
      </body>
    </html>
  );
}
