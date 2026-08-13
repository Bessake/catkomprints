import Link from "next/link";
import { signOut } from "@/lib/auth";
import { BrandLogo } from "@/components/brand-logo";

const adminLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/reports", label: "Daily reports" },
  { href: "/services", label: "Services" },
  { href: "/stock-out", label: "Stock" },
  { href: "/cash-out", label: "Cash out" },
  { href: "/products", label: "Products" },
  { href: "/invoices", label: "Invoices" },
  { href: "/clients", label: "Clients" },
  { href: "/messages", label: "Messages" },
  { href: "/movements", label: "Movements" },
  { href: "/staff", label: "Staff names" },
  { href: "/users", label: "Front desk logins" },
  { href: "/categories", label: "Categories" },
  { href: "/operator", label: "Floor terminal" },
];

const staffLinks = [
  { href: "/services", label: "Services" },
  { href: "/stock-out", label: "Stock" },
  { href: "/products", label: "Products" },
  { href: "/cash-out", label: "Cash out" },
  { href: "/daily-report", label: "Daily report" },
];

export function AppNav({
  userName,
  userRole,
}: {
  userName: string;
  userRole: string;
}) {
  const links = userRole === "staff" ? staffLinks : adminLinks;

  return (
    <aside className="app-nav">
      <div className="app-brand">
        <Link href={userRole === "staff" ? "/services" : "/"} className="brand-lockup">
          <BrandLogo variant="nav" priority />
        </Link>
        <p>
          {userName} · {userRole}
        </p>
      </div>
      <nav>
        {links.map((link) => (
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
