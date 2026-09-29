import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/PolicyPage";
import { SELLER, SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "Terms", alternates: { canonical: "/terms" } };

export default function Terms() {
  return (
    <PolicyPage title="Terms" updated="29 September 2026">
      <h2>Who you&apos;re buying from</h2>
      <p>Season Card is sold by {SELLER.legalName}, {SELLER.address} (&quot;we&quot;). Contact: {SUPPORT_EMAIL}.</p>

      <h2>What Season Card is</h2>
      <p>
        Season Card estimates your colour season from a photo and gives colour and style suggestions. It is entertainment and style guidance. It is
        not medical, dermatological or professional advice, and it can&apos;t diagnose anything about your skin or health. Results depend on the photo
        and the light, and they are suggestions, not facts about you.
      </p>

      <h2>The free scan</h2>
      <p>The scan and your free result are free to use. The photo is processed on your device (see our <Link href="/privacy">Privacy policy</Link>).</p>

      <h2>The full report</h2>
      <ul>
        <li>The Full Season Report costs $9.99 USD. The optional Capsule Wardrobe add-on costs $4.99 USD. Prices are in US dollars; PayPal or your bank may add a currency conversion charge.</li>
        <li>Payment is taken by PayPal (PayPal balance or card). Your report is delivered instantly as a private web link.</li>
        <li>Keep your report link safe. We don&apos;t keep accounts, so the link is how you access your report.</li>
        <li>The report is for your personal use.</li>
      </ul>

      <h2>Refunds</h2>
      <p>You can refund in one click within 7 days of purchase. See the <Link href="/refund">Refund policy</Link>.</p>

      <h2>Liability</h2>
      <p>
        We provide Season Card &quot;as is&quot;. To the extent the law allows, our total liability to you for any claim is limited to the amount you paid
        us. Nothing in these terms limits rights you have under consumer law that can&apos;t be excluded.
      </p>

      <h2>Changes and law</h2>
      <p>
        We may update these terms; the version shown when you buy applies to that purchase. These terms are governed by the laws of the United Arab
        Emirates as applied in the Emirate of Dubai.
      </p>
    </PolicyPage>
  );
}
