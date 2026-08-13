import { redirect } from "next/navigation";
import { deleteFrontDeskUserAction } from "@/app/user-actions";
import { FrontDeskUserForm } from "@/components/front-desk-user-form";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Front desk logins" };

export default async function FrontDeskUsersPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/");

  const users = await prisma.user.findMany({
    where: { role: { in: ["admin", "staff"] } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      _count: { select: { serviceSales: true } },
    },
  });

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Front desk</p>
          <h1>Front desk logins</h1>
          <p className="muted" style={{ margin: "0.4rem 0 0" }}>
            Each person signs in with their own account so services are stamped
            with who recorded them.
          </p>
        </div>
      </div>

      <div className="detail-layout">
        <section className="panel">
          <h2>Accounts</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Services recorded</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const remove = deleteFrontDeskUserAction.bind(null, user.id);
                  return (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className="badge">{user.role}</span>
                      </td>
                      <td>{user._count.serviceSales}</td>
                      <td>
                        {user.role === "staff" ? (
                          <form action={remove}>
                            <button type="submit" className="button danger">
                              Delete
                            </button>
                          </form>
                        ) : (
                          <span className="muted">Admin backup</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <h2>Add front desk person</h2>
          <FrontDeskUserForm />
        </section>
      </div>
    </>
  );
}
