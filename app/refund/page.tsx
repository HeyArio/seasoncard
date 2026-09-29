import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";
import { SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "Refund policy", alternates: { canonical: "/refund" } };

export default function RefundPolicy() {
  return (
    <PolicyPage title="Refund policy" updated="29 September 2026">
      <h2>7 days, one click</h2>
      <p>
        If your report doesn&apos;t feel like you, open your report link and tap <strong>Refund</strong> at the bottom of the page within 7 days of
        purchase. After a quick confirmation, the full amount (including the Capsule Wardrobe add-on, if you bought it) goes back to your PayPal account
        or card. No forms and no questions.
      </p>
      <h2>Timing</h2>
      <p>
        We send the refund to PayPal immediately. PayPal usually shows it within minutes; card refunds can take 5–10 business days to appear on your
        statement, depending on your bank.
      </p>
      <h2>After a refund</h2>
      <p>Refunding closes your report link. You can still take the free scan any time.</p>
      <h2>Retake first?</h2>
      <p>Light changes everything. A retake by a window in daylight is free, and it often gives a clearer result.</p>
      <h2>Lost your link, or past 7 days?</h2>
      <p>Email {SUPPORT_EMAIL} with your PayPal receipt and we&apos;ll help.</p>
    </PolicyPage>
  );
}
