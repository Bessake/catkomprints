import { formatCurrency, formatDate, paymentMethodLabels } from "@/lib/utils";
import type { DayActivity } from "@/lib/day-report";

function StockTable({
  rows,
  emptyText,
}: {
  rows: DayActivity["stockOuts"];
  emptyText: string;
}) {
  if (rows.length === 0) {
    return <p className="muted">{emptyText}</p>;
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Date & time</th>
            <th>Product</th>
            <th>Qty</th>
            <th>Taken by</th>
            <th>Recorded by</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.at}-${row.sku}-${index}`}>
              <td>{formatDate(row.at)}</td>
              <td>
                {row.product}
                <div className="muted" style={{ fontSize: "0.85rem" }}>
                  {row.sku}
                </div>
              </td>
              <td>{row.quantity}</td>
              <td>{row.takenBy || "—"}</td>
              <td>{row.recordedBy || "—"}</td>
              <td>{row.note || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DayActivityLists({ activity }: { activity: DayActivity }) {
  return (
    <>
      <section className="panel" style={{ marginTop: "1.25rem" }}>
        <h2>Materials taken out</h2>
        <StockTable
          rows={activity.stockOuts}
          emptyText="No materials were taken out."
        />
      </section>

      <section className="panel" style={{ marginTop: "1.25rem" }}>
        <h2>Stock in</h2>
        <StockTable
          rows={activity.stockIns}
          emptyText="No stock was added."
        />
      </section>

      <section className="panel" style={{ marginTop: "1.25rem" }}>
        <h2>Services</h2>
        {activity.services.length === 0 ? (
          <p className="muted">No services were recorded.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date & time</th>
                  <th>Service</th>
                  <th>Client</th>
                  <th>MoMo name</th>
                  <th>Cost</th>
                  <th>Payment</th>
                  <th>Recorded by</th>
                </tr>
              </thead>
              <tbody>
                {activity.services.map((sale, index) => (
                  <tr key={`${sale.at}-${sale.service}-${index}`}>
                    <td>{formatDate(sale.at)}</td>
                    <td>
                      {sale.service}
                      {sale.kind === "material" ? (
                        <div className="muted" style={{ fontSize: "0.85rem" }}>
                          Material · stock deducted
                        </div>
                      ) : null}
                      {sale.note ? (
                        <div className="muted" style={{ fontSize: "0.85rem" }}>
                          {sale.note}
                        </div>
                      ) : null}
                    </td>
                    <td>{sale.client || "—"}</td>
                    <td>
                      {sale.payment === "momo" ? sale.momoName || "—" : "—"}
                    </td>
                    <td>{formatCurrency(sale.cost)}</td>
                    <td>
                      <span className={`badge ${sale.payment}`}>
                        {paymentMethodLabels[sale.payment]}
                      </span>
                    </td>
                    <td>{sale.recordedBy || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel" style={{ marginTop: "1.25rem" }}>
        <h2>Cash / MoMo take-outs</h2>
        {activity.cashOuts.length === 0 ? (
          <p className="muted">No cash or MoMo take-outs were recorded.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date & time</th>
                  <th>Amount</th>
                  <th>Taken as</th>
                  <th>MoMo name</th>
                  <th>Purpose</th>
                  <th>Recorded by</th>
                </tr>
              </thead>
              <tbody>
                {activity.cashOuts.map((entry, index) => (
                  <tr key={`${entry.at}-${entry.amount}-${index}`}>
                    <td>{formatDate(entry.at)}</td>
                    <td>{formatCurrency(entry.amount)}</td>
                    <td>
                      <span className={`badge ${entry.payment}`}>
                        {paymentMethodLabels[entry.payment]}
                      </span>
                    </td>
                    <td>
                      {entry.payment === "momo" ? entry.momoName || "—" : "—"}
                    </td>
                    <td>{entry.purpose}</td>
                    <td>{entry.recordedBy || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel" style={{ marginTop: "1.25rem" }}>
        <h2>Debtors</h2>
        {(activity.debtors ?? []).length === 0 ? (
          <p className="muted">No debtors were recorded.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date & time</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Amount</th>
                  <th>For</th>
                  <th>Status</th>
                  <th>Recorded by</th>
                </tr>
              </thead>
              <tbody>
                {(activity.debtors ?? []).map((row, index) => (
                  <tr key={`${row.at}-${row.name}-${index}`}>
                    <td>{formatDate(row.at)}</td>
                    <td>
                      {row.name}
                      {row.note ? (
                        <div className="muted" style={{ fontSize: "0.85rem" }}>
                          {row.note}
                        </div>
                      ) : null}
                    </td>
                    <td>{row.phone || "—"}</td>
                    <td>{formatCurrency(row.amount)}</td>
                    <td>{row.purpose}</td>
                    <td>
                      <span className={`badge ${row.paid ? "paid" : "overdue"}`}>
                        {row.paid ? "Paid" : "Owes"}
                      </span>
                    </td>
                    <td>{row.recordedBy || "—"}</td>
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
