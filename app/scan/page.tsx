import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteChrome";
import ScanClient from "./ScanClient";

export const metadata: Metadata = {
  title: "Free colour scan",
  description: "Take a selfie by a window and get your colour season in seconds. The scan runs on your device.",
  alternates: { canonical: "/scan" },
};

export default function ScanPage() {
  return (
    <main className="page">
      <SiteHeader />
      <ScanClient />
    </main>
  );
}
