import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { BrandLogo } from "@/components/brand-logo";

export default async function OperatorFloorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/operator/login");

  if (
    session.user.role !== "operator" &&
    session.user.role !== "admin" &&
    session.user.role !== "staff"
  ) {
    redirect("/operator/login");
  }

  return (
    <div className="operator-shell">
      <header className="operator-header">
        <div className="operator-header-inner">
          <Link href="/operator" className="operator-brand">
            <BrandLogo variant="header" priority />
            <div>
              <p className="eyebrow">Catkom Prints</p>
              <strong>Stock out terminal</strong>
            </div>
          </Link>
          <div className="operator-header-actions">
            {session.user.role === "operator" ? null : (
              <span className="muted">
                {session.user.name} · {session.user.role}
              </span>
            )}
            {session.user.role !== "operator" ? (
              <Link href="/" className="button secondary">
                Admin
              </Link>
            ) : null}
            <Link href="/operator" className="button secondary">
              Stock out
            </Link>
            <Link href="/operator/history" className="button secondary">
              History
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/operator/login" });
              }}
            >
              <button type="submit" className="button secondary">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="operator-main">{children}</main>
    </div>
  );
}
