import { PaymentMethod } from "@prisma/client";
import {
  deleteCashOutAction,
} from "@/app/cash-out-actions";
import { CashOutForm } from "@/components/cash-out-form";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  formatCurrency,
  formatDate,
  paymentMethodLabels,
} from "@/lib/utils";

export const metadata = { title: "Cash out" };

export default async function CashOutPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const session = await auth();
  const recorderName = session?.user?.name || "Unknown";
  const { payment } = await searchParams;
  const paymentFilter =
    payment === "momo" || payment === "cash"
      ? (payment as PaymentMethod)
      : undefined;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [entries, todayEntries] = await Promise.all([
    prisma.cashOut.findMany({
      where: paymentFilter ? { paymentMethod: paymentFilter } : undefined,
      include: { createdBy: true },
      orderBy: { takenAt: "desc" },
      take: 200,
    }),
    prisma.cashOut.findMany({
      where: { takenAt: { gte: startOfToday } },
      select: { amount: true, paymentMethod: true },
    }),
  ]);

  const todayTotal = todayEntries.reduce((sum, row) => sum + row.amount, 0);
  const todayMomo = todayEntries
    .filter((row) => row.paymentMethod === "momo")
    .reduce((sum, row) => sum + row.amount, 0);
  const todayCash = todayEntries
    .filter((row) => row.paymentMethod === "cash")
    .reduce((sum, row) => sum + row.amount, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Front desk</p>
          <h1>Cash / MoMo out</h1>
          <p className="muted" style={{ margin: "0.4rem 0 0" }}>
            Record money taken out of the till, whether cash or MoMo, and why.
          </p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="muted">Today’s take-outs</span>
          <strong>{todayEntries.length}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Today’s total</span>
          <strong>{formatCurrency(todayTotal)}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">MoMo out today</span>
          <strong>{formatCurrency(todayMomo)}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Cash out today</span>
          <strong>{formatCurrency(todayCash)}</strong>
        </div>
      </div>

      <div className="detail-layout">
        <section className="panel">
          <h2>Record take-out</h2>
          <CashOutForm recorderName={recorderName} />
        </section>

        <section className="panel">
          <h2>How to use</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Use this when cash or MoMo leaves the front desk for purchases,
            errands, or other payments. Enter the amount, choose Cash or MoMo,
            and write the purpose clearly.
          </p>
        </section>
      </div>

      <div className="filters">
        <form method="get">
          <label>
            Payment
            <select name="payment" defaultValue={payment || ""}>
              <option value="">All</option>
              <option value="momo">MoMo</option>
              <option value="cash">Cash</option>
            </select>
          </label>
          <button type="submit" className="button secondary">
            Apply
          </button>
        </form>
      </div>

      <section className="panel">
        <h2>Take-out log</h2>
        {entries.length === 0 ? (
          <p className="muted">No cash or MoMo take-outs recorded yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date & time</th>
                  <th>Amount</th>
                  <th>Taken as</th>
                  <th>Purpose</th>
                  <th>Recorded by</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const remove = deleteCashOutAction.bind(null, entry.id);
                  return (
                    <tr key={entry.id}>
                      <td>{formatDate(entry.takenAt)}</td>
                      <td>{formatCurrency(entry.amount)}</td>
                      <td>
                        <span className={`badge ${entry.paymentMethod}`}>
                          {paymentMethodLabels[entry.paymentMethod]}
                        </span>
                      </td>
                      <td>{entry.purpose}</td>
                      <td>{entry.createdBy?.name || "—"}</td>
                      <td>
                        <form action={remove}>
                          <button type="submit" className="button danger">
                            Delete
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
