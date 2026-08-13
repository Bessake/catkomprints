import { formatCurrency } from "@/lib/utils";
import {
  netCashOnHand,
  netMomoOnHand,
  type DaySnapshot,
} from "@/lib/day-report";

export function DaySnapshotCards({
  snapshot,
}: {
  snapshot: Pick<
    DaySnapshot,
    | "serviceCount"
    | "serviceMomoCount"
    | "serviceCashCount"
    | "serviceMomoTotal"
    | "serviceCashTotal"
    | "cashOutCount"
    | "cashOutMomoCount"
    | "cashOutCashCount"
    | "cashOutMomoTotal"
    | "cashOutCashTotal"
    | "stockOutCount"
    | "stockOutUnits"
    | "stockInCount"
    | "stockInUnits"
  >;
}) {
  const momoOnHand = netMomoOnHand(snapshot);
  const cashOnHand = netCashOnHand(snapshot);
  const onHand = momoOnHand + cashOnHand;
  const moneyOut = snapshot.cashOutMomoTotal + snapshot.cashOutCashTotal;

  return (
    <>
      <div className="stat-grid">
        <div className="stat-card">
          <span className="muted">Services today</span>
          <strong>{snapshot.serviceCount}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">MoMo on hand</span>
          <strong>{formatCurrency(momoOnHand)}</strong>
          <p className="muted" style={{ margin: "0.35rem 0 0" }}>
            {formatCurrency(snapshot.serviceMomoTotal)} in −{" "}
            {formatCurrency(snapshot.cashOutMomoTotal)} out
          </p>
        </div>
        <div className="stat-card">
          <span className="muted">Cash on hand</span>
          <strong>{formatCurrency(cashOnHand)}</strong>
          <p className="muted" style={{ margin: "0.35rem 0 0" }}>
            {formatCurrency(snapshot.serviceCashTotal)} in −{" "}
            {formatCurrency(snapshot.cashOutCashTotal)} out
          </p>
        </div>
        <div className="stat-card">
          <span className="muted">Total on hand</span>
          <strong>{formatCurrency(onHand)}</strong>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="muted">MoMo out</span>
          <strong>{formatCurrency(snapshot.cashOutMomoTotal)}</strong>
          <p className="muted" style={{ margin: "0.35rem 0 0" }}>
            {snapshot.cashOutMomoCount} take-out
            {snapshot.cashOutMomoCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="stat-card">
          <span className="muted">Cash out</span>
          <strong>{formatCurrency(snapshot.cashOutCashTotal)}</strong>
          <p className="muted" style={{ margin: "0.35rem 0 0" }}>
            {snapshot.cashOutCashCount} take-out
            {snapshot.cashOutCashCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="stat-card">
          <span className="muted">Total out</span>
          <strong>{formatCurrency(moneyOut)}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Take-outs</span>
          <strong>{snapshot.cashOutCount}</strong>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="muted">Stock out</span>
          <strong>{snapshot.stockOutUnits}</strong>
          <p className="muted" style={{ margin: "0.35rem 0 0" }}>
            {snapshot.stockOutCount} record
            {snapshot.stockOutCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="stat-card">
          <span className="muted">Stock in</span>
          <strong>{snapshot.stockInUnits}</strong>
          <p className="muted" style={{ margin: "0.35rem 0 0" }}>
            {snapshot.stockInCount} record
            {snapshot.stockInCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>
    </>
  );
}
