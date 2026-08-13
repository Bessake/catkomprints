import Link from "next/link";
import { signOut } from "@/lib/auth";
import { BrandLogo } from "@/components/brand-logo";

const links: { href: string; label: string; adminOnly?: boolean }[] = [
  { href: "/", label: "Dashboard" },
  { href: "/services", label: "Services" },
  { href: "/products", label: "Products" },
  { href: "/invoices", label: "Invoices" },
  { href: "/clients", label: "Clients" },
  { href: "/messages", label: "Messages" },
  { href: "/movements", label: "Movements" },
  { href: "/staff", label: "Staff names" },
  { href: "/users", label: "Front desk logins", adminOnly: true },
  { href: "/categories", label: "Categories" },
  { href: "/operator", label: "Stock out" },
];

export function AppNav({
  userName,
  userRole,
}: {
  userName: string;
  userRole: string;
}) {
  return (
    <aside className="app-nav">
      <div className="app-brand">
        <Link href="/" className="brand-lockup">
          <BrandLogo variant="nav" priority />
        </Link>
        <p>
          {userName} · {userRole}
        </p>
      </div>
      <nav>
        {links
          .filter((link) => !link.adminOnly || userRole === "admin")
          .map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
      </nav>
      <div className="app-nav-footer">
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit" className="link-button">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
