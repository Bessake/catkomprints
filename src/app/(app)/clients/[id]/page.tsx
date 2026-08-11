import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientForm } from "@/components/client-form";
import { ClientSmsForm } from "@/components/front-desk-forms";
import { prisma } from "@/lib/prisma";
import {
  formatCurrency,
  formatDate,
  invoiceStatusLabels,
} from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await prisma.client.findUnique({ where: { id } });
  return { title: client?.name || "Client" };
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      invoices: { orderBy: { createdAt: "desc" }, take: 20 },
      messages: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!client) notFound();

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Front desk</p>
          <h1>{client.name}</h1>
        </div>
        <div className="actions">
          <Link href="/clients" className="button secondary">
            Back
          </Link>
          <Link href="/invoices/new" className="button">
            New invoice
          </Link>
        </div>
      </div>

      <div className="detail-layout">
        <section className="panel">
          <h2>Client details</h2>
          <ClientForm client={client} />
        </section>

        <div className="stack">
          <section className="panel">
            <h2>Send SMS</h2>
            {client.phone ? (
              <ClientSmsForm clientId={client.id} />
            ) : (
              <p className="muted">Add a phone number to send SMS.</p>
            )}
          </section>

          <section className="panel">
            <h2>Invoices</h2>
            {client.invoices.length === 0 ? (
              <p className="muted">No invoices yet.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Number</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td>
                          <Link href={`/invoices/${invoice.id}`}>
                            {invoice.number}
                          </Link>
                        </td>
                        <td>{formatCurrency(invoice.total)}</td>
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

          <section className="panel">
            <h2>Recent SMS</h2>
            {client.messages.length === 0 ? (
              <p className="muted">No messages yet.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Status</th>
                      <th>Body</th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.messages.map((message) => (
                      <tr key={message.id}>
                        <td>{formatDate(message.createdAt)}</td>
                        <td>
                          <span className={`badge ${message.status}`}>
                            {message.status}
                          </span>
                        </td>
                        <td>{message.body}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
