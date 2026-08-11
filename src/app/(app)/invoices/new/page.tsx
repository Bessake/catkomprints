import Link from "next/link";
import { InvoiceForm } from "@/components/invoice-form";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "New invoice" };

export default async function NewInvoicePage() {
  const [clients, products] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Billing</p>
          <h1>New invoice</h1>
        </div>
        <Link href="/invoices" className="button secondary">
          Back
        </Link>
      </div>

      {clients.length === 0 ? (
        <section className="panel">
          <p className="muted">
            Add a client first, then create an invoice.{" "}
            <Link href="/clients/new">Add client →</Link>
          </p>
        </section>
      ) : (
        <section className="panel">
          <InvoiceForm clients={clients} products={products} />
        </section>
      )}
    </>
  );
}
