import RefCapture from "@/components/RefCapture";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { publicSiteUrl } from "@/lib/site";

const description =
  "Take one selfie by a window and find your colour season in seconds. Measured on your device, never uploaded. Full 36-colour report $9.99 with a 7-day refund.";

export const metadata: Metadata = {
  metadataBase: new URL(publicSiteUrl()),
  title: { default: "Season Card · Find the colours that make your face glow", template: "%s · Season Card" },
  description,
  applicationName: "Season Card",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Season Card",
    title: "Find the colours that make your face glow.",
    description,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: "Find the colours that make your face glow.", description },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#F5EFE6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/fonts/fraunces-latin-opsz-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/manrope-latin-wght-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>
        <RefCapture />
        {children}
      </body>
    </html>
  );
}
