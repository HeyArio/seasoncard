import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { isPayPalConfigured, paypalEnv } from "@/lib/env";
import SetupForm from "./SetupForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Owner setup",
  robots: { index: false, follow: false },
};

export default function SetupPage() {
  const configured = isPayPalConfigured();
  return (
    <main className="page">
      <SiteHeader />
      <section className="card card-lg" style={{ marginTop: 24 }}>
        <h1 style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: 30, margin: "0 0 8px" }}>Owner setup</h1>
        {configured ? (
          <p>
            PayPal is connected (<strong>{paypalEnv()}</strong> mode) and the payment webhook is registered. Nothing to do here.
          </p>
        ) : (
          <>
            <p style={{ marginTop: 0 }}>
              Connect your PayPal business account. Use the <strong>setup code</strong> shown on the server console. Your keys are checked with
              PayPal, then stored only on this server.
            </p>
            <SetupForm />
          </>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
