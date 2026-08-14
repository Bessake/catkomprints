import {
  markDebtorPaidAction,
  markDebtorUnpaidAction,
} from "@/app/debtor-actions";
import { formatCurrency, formatDate } from "@/lib/utils";

type DebtorRow = {
  id: string;
  name: string;
  phone: string;
  amount: number;
  purpose: string;
  note: string;
  paid: boolean;
  paidAt: Date | null;
  recordedAt: Date;
  createdBy: { name: string } | null;
};

export function DebtorTable({
  debtors,
  emptyText,
}: {
  debtors: DebtorRow[];
  emptyText: string;
}) {
  if (debtors.length === 0) {
    return <p className="muted">{emptyText}</p>;
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Date & time</th>
            <th>Name</th>
            <th>Phone</th>
            <th>Amount</th>
            <th>For</th>
            <th>Recorded by</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {debtors.map((debtor) => {
            const markPaid = markDebtorPaidAction.bind(null, debtor.id);
            const markUnpaid = markDebtorUnpaidAction.bind(null, debtor.id);
            return (
              <tr key={debtor.id}>
                <td>{formatDate(debtor.recordedAt)}</td>
                <td>
                  {debtor.name}
                  {debtor.note ? (
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {debtor.note}
                    </div>
                  ) : null}
                </td>
                <td>{debtor.phone || "—"}</td>
                <td>{formatCurrency(debtor.amount)}</td>
                <td>{debtor.purpose}</td>
                <td>{debtor.createdBy?.name || "—"}</td>
                <td>
                  <span className={`badge ${debtor.paid ? "paid" : "overdue"}`}>
                    {debtor.paid ? "Paid" : "Owes"}
                  </span>
                  {debtor.paid && debtor.paidAt ? (
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {formatDate(debtor.paidAt)}
                    </div>
                  ) : null}
                </td>
                <td>
                  {debtor.paid ? (
                    <form action={markUnpaid}>
                      <button type="submit" className="button secondary">
                        Mark unpaid
                      </button>
                    </form>
                  ) : (
                    <form action={markPaid}>
                      <button type="submit" className="button">
                        Mark paid
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
