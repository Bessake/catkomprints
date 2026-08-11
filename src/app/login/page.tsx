import { Suspense } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { LoginForm } from "@/components/login-form";

export const metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <div className="login-page">
      <div className="login-stack">
        <div className="login-brand">
          <BrandLogo variant="hero" priority />
        </div>
        <div className="login-card">
          <p className="muted" style={{ textAlign: "center", marginTop: 0 }}>
            Sign in to manage print stock, invoices, and client messages.
          </p>
          <Suspense fallback={<p>Loading…</p>}>
            <LoginForm />
          </Suspense>
          <p className="muted" style={{ marginTop: "1rem", fontSize: "0.9rem" }}>
            Demo: admin@catkomprints.local / password123
          </p>
          <p style={{ marginTop: "1rem", textAlign: "center" }}>
            <Link href="/operator/login">Stock out terminal login →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
