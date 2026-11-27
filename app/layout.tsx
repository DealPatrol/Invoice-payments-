import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter, Fraunces } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { PwaSupport } from "@/components/PwaSupport";
import { themeScript } from "@/components/ThemeToggle";
import { NativeBridge } from "@/components/native/NativeBridge";
import { NATIVE_FLAG_SCRIPT } from "@/lib/native/platform";
import { SITE_URL, appStoreId } from "@/lib/seo/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const fraunces = Fraunces({ subsets: ["latin"], display: "swap", variable: "--font-serif" });

const APP_STORE_ID = appStoreId();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Invoice Jot: Estimate Maker & Invoice App", template: "%s" },
  description: "Make invoices, estimates and receipts on your iPhone in a minute. No account, works offline, PDF in one tap.",
  applicationName: "Invoice Jot",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Invoice Jot",
    statusBarStyle: "default",
  },
  icons: {
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // Smart App Banner in Safari once the App Store id is known (NEXT_PUBLIC_APP_STORE_ID).
  ...(APP_STORE_ID ? { itunes: { appId: APP_STORE_ID } } : {}),
  openGraph: { siteName: "Invoice Jot", title: "Invoice Jot: Estimate Maker", description: "Jot it. Send it. Get paid. Invoices and estimates on iPhone, no account.", type: "website", images: ["/icons/icon-512.png"] },
  twitter: { card: "summary", title: "Invoice Jot: Estimate Maker", description: "Invoices and estimates on iPhone. No account, works offline." },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f6f4ef" }, { media: "(prefers-color-scheme: dark)", color: "#14110e" }],
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
        <Suspense fallback={null}>
          <PwaSupport />
          <NativeBridge />
        </Suspense>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
