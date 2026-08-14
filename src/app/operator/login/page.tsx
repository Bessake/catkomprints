import Link from "next/link";
import { Suspense } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { DeveloperCredit } from "@/components/developer-credit";
import { OperatorLoginForm } from "@/components/operator-login-form";

export const metadata = {
  title: "Stock out login",
};

export default function OperatorLoginPage() {
  return (
    <div className="login-page">
      <div className="login-stack">
        <div className="login-brand">
          <BrandLogo variant="hero" priority />
        </div>
        <div className="login-card">
          <p className="eyebrow" style={{ textAlign: "center" }}>
            Stock out terminal
          </p>
          <p className="muted" style={{ textAlign: "center" }}>
            Sign in to record material stock outs. Changes sync to admin
            inventory instantly.
          </p>
          <Suspense fallback={<p>Loading…</p>}>
            <OperatorLoginForm />
          </Suspense>
          <p style={{ marginTop: "1rem", textAlign: "center" }}>
            <Link href="/login">Admin / office login →</Link>
          </p>
        </div>
        <DeveloperCredit />
      </div>
    </div>
  );
}
