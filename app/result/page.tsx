import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import ResultClient from "./ResultClient";

export const metadata: Metadata = {
  title: "Your season",
  robots: { index: false, follow: false },
};

export default function ResultPage() {
  return (
    <main className="page">
      <SiteHeader />
      <ResultClient />
      <SiteFooter />
    </main>
  );
}
