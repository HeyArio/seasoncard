import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";
import { SELLER, SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy", alternates: { canonical: "/privacy" } };

export default function Privacy() {
  return (
    <PolicyPage title="Privacy" updated="29 September 2026">
      <h2>The short version</h2>
      <ul>
        <li>Your photo is processed on your own device, in your browser. It is never uploaded to us.</li>
        <li>We store no photos. We don&apos;t have accounts or a customer database.</li>
        <li>Payments are handled by PayPal. We never see your card details.</li>
      </ul>

      <h2>Your photo</h2>
      <p>
        When you take or upload a selfie, the colour analysis runs locally in your browser. The image stays on your device and is discarded when you
        leave the page. Your result (season name, four measurements and three sampled colours) is kept in your browser&apos;s session storage so the result
        page can show it. Closing the tab clears it.
      </p>

      <h2>When you buy the report</h2>
      <p>
        To create your order we send PayPal your season, your four measurement scores and your three sampled colours (as colour codes, not images),
        plus the price. After payment, your report link contains a signed record of your order: order and payment IDs, your result, the amount, the
        payment time and the email address PayPal gives us for your account. We use that email only to identify your order if you contact us. Anyone
        with your report link can open it, so keep the link private.
      </p>
      <p>
        PayPal processes your payment under its own privacy policy. Our hosting provider (Vercel) keeps short-lived technical logs such as IP
        addresses and request times. Our payment logs record order IDs, amounts and statuses, never your email.
      </p>

      <h2>Cookies and tracking</h2>
      <p>We don&apos;t use advertising or analytics cookies. PayPal may set its own cookies on the checkout step to process payments and prevent fraud.</p>

      <h2>Your rights</h2>
      <p>
        You can ask what we hold about you, or ask us to delete it, by emailing {SUPPORT_EMAIL}. Because we don&apos;t store photos or accounts, there is
        usually very little to find beyond PayPal&apos;s record of your payment.
      </p>

      <h2>Who we are</h2>
      <p>
        Season Card is run by {SELLER.legalName}, {SELLER.address}. Contact: {SUPPORT_EMAIL}.
      </p>
    </PolicyPage>
  );
}
