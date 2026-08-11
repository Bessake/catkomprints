import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Clients" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() || "";

  const clients = await prisma.client.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query } },
            { email: { contains: query } },
            { phone: { contains: query } },
          ],
        }
      : undefined,
    include: { _count: { select: { invoices: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Front desk</p>
          <h1>Clients</h1>
        </div>
        <Link href="/clients/new" className="button">
          Add client
        </Link>
      </div>

      <div className="filters">
        <form method="get">
          <label>
            Search
            <input name="q" defaultValue={query} placeholder="Name, email, phone" />
          </label>
          <button type="submit" className="button secondary">
            Apply
          </button>
        </form>
      </div>

      <section className="panel">
        {clients.length === 0 ? (
          <p className="muted">No clients yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Invoices</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <Link href={`/clients/${client.id}`}>{client.name}</Link>
                    </td>
                    <td>{client.phone || "—"}</td>
                    <td>{client.email || "—"}</td>
                    <td>{client._count.invoices}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
