import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import CheckoutClient from "./CheckoutClient";
import { optionalEnv } from "@/lib/env";

// Read the PayPal client id at request time so the Docker image needs no build args.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <main className="page">
      <SiteHeader />
      <CheckoutClient paypalClientId={optionalEnv("PAYPAL_CLIENT_ID") ?? process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? ""} />
      <SiteFooter />
    </main>
  );
}
