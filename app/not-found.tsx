import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export default function NotFound() {
  return (
    <main className="page">
      <SiteHeader />
      <div className="card card-lg center" style={{ marginTop: 24 }}>
        <h1 style={{ fontSize: "1.9rem" }}>Page not found</h1>
        <p className="muted" style={{ marginTop: 10 }}>That page doesn&apos;t exist. Your season is one selfie away, though.</p>
        <Link href="/scan" className="btn btn-primary btn-block" style={{ marginTop: 20 }}>Take the free scan</Link>
      </div>
      <SiteFooter />
    </main>
  );
}
