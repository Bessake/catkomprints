import { DebtorForm } from "@/components/debtor-form";
import { DebtorTable } from "@/components/debtor-table";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Debtors" };

export default async function DebtorsPage() {
  const session = await auth();
  const recorderName = session?.user?.name || "Unknown";
  const debtors = await prisma.debtor.findMany({
    include: { createdBy: true },
    orderBy: [{ paid: "asc" }, { recordedAt: "desc" }],
  });

  const unpaid = debtors.filter((row) => !row.paid);
  const paid = debtors.filter((row) => row.paid);
  const unpaidTotal = unpaid.reduce((sum, row) => sum + row.amount, 0);
  const paidTotal = paid.reduce((sum, row) => sum + row.amount, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Front desk</p>
          <h1>Debtors</h1>
          <p className="muted" style={{ margin: "0.4rem 0 0" }}>
            Record people who took work on credit, then mark them paid when
            they settle.
          </p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="muted">Still owing</span>
          <strong>{unpaid.length}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Amount outstanding</span>
          <strong>{formatCurrency(unpaidTotal)}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Settled</span>
          <strong>{paid.length}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Amount settled</span>
          <strong>{formatCurrency(paidTotal)}</strong>
        </div>
      </div>

      <section className="panel">
        <h2>Record a debtor</h2>
        <DebtorForm recorderName={recorderName} />
      </section>

      <section className="panel" style={{ marginTop: "1.25rem" }}>
        <h2>Still owing</h2>
        <DebtorTable
          debtors={unpaid}
          emptyText="No outstanding debtors."
        />
      </section>

      <section className="panel" style={{ marginTop: "1.25rem" }}>
        <h2>Settled</h2>
        <DebtorTable debtors={paid} emptyText="No settled debtors yet." />
      </section>
    </>
  );
}
