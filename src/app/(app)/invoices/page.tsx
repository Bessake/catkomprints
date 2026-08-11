import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  formatCurrency,
  formatDateShort,
  invoiceStatusLabels,
} from "@/lib/utils";

export const metadata = { title: "Invoices" };

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const invoices = await prisma.invoice.findMany({
    where: status ? { status: status as never } : undefined,
    include: { client: true, items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Billing</p>
          <h1>Invoices</h1>
        </div>
        <Link href="/invoices/new" className="button">
          New invoice
        </Link>
      </div>

      <div className="filters">
        <form method="get">
          <label>
            Status
            <select name="status" defaultValue={status || ""}>
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <button type="submit" className="button secondary">
            Apply
          </button>
        </form>
      </div>

      <section className="panel">
        {invoices.length === 0 ? (
          <p className="muted">No invoices yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Client</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <Link href={`/invoices/${invoice.id}`}>
                        {invoice.number}
                      </Link>
                    </td>
                    <td>{invoice.client.name}</td>
                    <td>{invoice.items.length}</td>
                    <td>{formatCurrency(invoice.total)}</td>
                    <td>
                      {invoice.dueDate
                        ? formatDateShort(invoice.dueDate)
                        : "—"}
                    </td>
                    <td>
                      <span className={`badge ${invoice.status}`}>
                        {invoiceStatusLabels[invoice.status]}
                      </span>
                    </td>
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
