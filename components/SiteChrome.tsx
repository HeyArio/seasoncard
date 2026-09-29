import Link from "next/link";
import { LogoMark } from "./Icons";
import { SELLER } from "@/lib/site";

export function SiteHeader({ right }: { right?: React.ReactNode }) {
  return (
    <header className="site-header no-print">
      <Link href="/" className="brand" aria-label="Season Card home">
        <LogoMark />
        Season Card
      </Link>
      {right}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer no-print">
      <p>Full report $9.99 · 7-day refund, one click</p>
      <nav aria-label="Legal">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/refund">Refunds</Link>
        <Link href="/scan">Free scan</Link>
      </nav>
      <p className="xsmall">
        © {new Date().getFullYear()} {SELLER.legalName}, {SELLER.shortAddress}. Style guidance for fun, not medical advice.
      </p>
    </footer>
  );
}
