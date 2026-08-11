import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppNav } from "@/components/app-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "operator") redirect("/operator");

  return (
    <div className="app-shell">
      <AppNav
        userName={session.user.name || "User"}
        userRole={session.user.role}
      />
      <div className="app-main">{children}</div>
    </div>
  );
}
