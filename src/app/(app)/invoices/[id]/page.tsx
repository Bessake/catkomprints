import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { InvoiceStatusForm } from "@/components/front-desk-forms";
import { prisma } from "@/lib/prisma";
import {
  formatCurrency,
  formatDate,
  formatDateShort,
  invoiceStatusLabels,
} from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  return { title: invoice?.number || "Invoice" };
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      items: { include: { product: true } },
      createdBy: true,
      messages: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!invoice) notFound();

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">{invoice.number}</p>
          <h1>Invoice</h1>
          <p className="muted" style={{ margin: "0.35rem 0 0" }}>
            {invoice.client.name} · {invoiceStatusLabels[invoice.status]}
            {invoice.dueDate
              ? ` · Due ${formatDateShort(invoice.dueDate)}`
              : ""}
          </p>
        </div>
        <div className="actions">
          <Link href="/invoices" className="button secondary">
            Back
          </Link>
          <Link href={`/clients/${invoice.clientId}`} className="button secondary">
            View client
          </Link>
        </div>
      </div>

      <section className="panel" style={{ marginBottom: "1rem" }}>
        <div className="invoice-brand">
          <BrandLogo variant="invoice" />
          <div>
            <h2 style={{ margin: 0 }}>Catkom Prints</h2>
            <p className="muted" style={{ margin: "0.25rem 0 0", fontStyle: "italic" }}>
              Print Your Style
            </p>
          </div>
        </div>
      </section>

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="stat-card">
          <span className="muted">Subtotal</span>
          <strong>{formatCurrency(invoice.subtotal)}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Tax ({invoice.taxRate}%)</span>
          <strong>{formatCurrency(invoice.taxAmount)}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Total</span>
          <strong>{formatCurrency(invoice.total)}</strong>
        </div>
      </div>

      <div className="detail-layout">
        <section className="panel">
          <h2>Line items</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Line total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.description}
                      {item.product ? (
                        <div className="muted" style={{ fontSize: "0.82rem" }}>
                          {item.product.sku}
                        </div>
                      ) : null}
                    </td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.unitPrice)}</td>
                    <td>{formatCurrency(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {invoice.notes ? (
            <p className="muted" style={{ marginTop: "1rem" }}>
              {invoice.notes}
            </p>
          ) : null}
          <p className="muted" style={{ marginTop: "1rem", fontSize: "0.9rem" }}>
            Created {formatDate(invoice.createdAt)}
            {invoice.createdBy ? ` by ${invoice.createdBy.name}` : ""}
            {invoice.stockDeducted ? " · Stock deducted" : ""}
          </p>
        </section>

        <div className="stack">
          <section className="panel">
            <h2>Update status</h2>
            <InvoiceStatusForm invoiceId={invoice.id} status={invoice.status} />
          </section>

          <section className="panel">
            <h2>Payment SMS</h2>
            <p className="muted">
              Send reminders from the{" "}
              <Link href="/messages">Messages</Link> desk for unpaid invoices.
            </p>
            {invoice.messages.length > 0 ? (
              <div className="admin-table-wrap" style={{ marginTop: "0.75rem" }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.messages.map((message) => (
                      <tr key={message.id}>
                        <td>{formatDate(message.createdAt)}</td>
                        <td>
                          <span className={`badge ${message.status}`}>
                            {message.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </>
  );
}
