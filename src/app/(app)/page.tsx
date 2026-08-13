import Link from "next/link";
import { InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAccraDayBounds } from "@/lib/day-report";
import {
  formatCurrency,
  formatDate,
  isLowStock,
  movementTypeLabels,
} from "@/lib/utils";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const { reportDate } = getAccraDayBounds();
  const [productCount, lowStock, recentMovements, products, unpaidCount, todayReport] =
    await Promise.all([
      prisma.product.count({ where: { active: true } }),
      prisma.product.findMany({
        where: { active: true },
        orderBy: { quantity: "asc" },
      }),
      prisma.stockMovement.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          product: true,
          createdBy: true,
        },
      }),
      prisma.product.findMany({
        where: { active: true },
        select: { quantity: true, unitPrice: true, costPrice: true },
      }),
      prisma.invoice.count({
        where: { status: { in: [InvoiceStatus.sent, InvoiceStatus.overdue] } },
      }),
      prisma.dailyReport.findUnique({
        where: { reportDate },
        include: { submittedBy: true },
      }),
    ]);

  const lowStockItems = lowStock.filter((p) =>
    isLowStock(p.quantity, p.reorderLevel),
  );
  const unitsOnHand = products.reduce((sum, p) => sum + p.quantity, 0);
  const inventoryValue = products.reduce(
    (sum, p) => sum + p.quantity * p.costPrice,
    0,
  );

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Catkom Prints</p>
          <h1>Dashboard</h1>
        </div>
        <div className="actions">
          <Link href="/reports" className="button secondary">
            Daily reports
          </Link>
          <Link href="/services" className="button secondary">
            Record service
          </Link>
          <Link href="/invoices/new" className="button secondary">
            New invoice
          </Link>
          <Link href="/products/new" className="button">
            Add product
          </Link>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="muted">Active products</span>
          <strong>{productCount}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Units on hand</span>
          <strong>{unitsOnHand}</strong>
        </div>
        <div className={`stat-card${lowStockItems.length ? " warn" : ""}`}>
          <span className="muted">Low stock</span>
          <strong>{lowStockItems.length}</strong>
        </div>
        <div className={`stat-card${unpaidCount ? " warn" : ""}`}>
          <span className="muted">Unpaid invoices</span>
          <strong>{unpaidCount}</strong>
        </div>
      </div>

      <div className={`success-banner${todayReport ? "" : " recording-as"}`} style={{ marginBottom: "1.25rem" }}>
        {todayReport ? (
          <>
            Today’s front desk report was sent by{" "}
            {todayReport.submittedBy?.name || "front desk"} at{" "}
            {formatDate(todayReport.submittedAt)}.{" "}
            <Link href={`/reports/${todayReport.id}`}>Open report →</Link>
          </>
        ) : (
          <>
            Today’s front desk report has not been sent yet.{" "}
            <Link href="/reports">View reports →</Link>
          </>
        )}
      </div>

      <p className="muted" style={{ marginTop: "-0.5rem", marginBottom: "1.25rem" }}>
        Inventory cost value: {formatCurrency(inventoryValue)}.{" "}
        <Link href="/messages">Send payment reminders →</Link>
      </p>

      <div className="detail-layout">
        <section className="panel">
          <h2>Low stock alerts</h2>
          {lowStockItems.length === 0 ? (
            <p className="muted">All products are above reorder level.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Reorder at</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.slice(0, 8).map((product) => (
                    <tr key={product.id}>
                      <td>
                        <Link href={`/products/${product.id}`}>
                          {product.name}
                        </Link>
                        <div className="muted" style={{ fontSize: "0.85rem" }}>
                          {product.sku}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${product.quantity === 0 ? "out" : "low"}`}
                        >
                          {product.quantity}
                        </span>
                      </td>
                      <td>{product.reorderLevel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <h2>Recent movements</h2>
          {recentMovements.length === 0 ? (
            <p className="muted">No stock movements yet.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Product</th>
                    <th>Type</th>
                    <th>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMovements.map((move) => (
                    <tr key={move.id}>
                      <td>{formatDate(move.createdAt)}</td>
                      <td>
                        <Link href={`/products/${move.productId}`}>
                          {move.product.name}
                        </Link>
                      </td>
                      <td>
                        <span className={`badge ${move.type}`}>
                          {movementTypeLabels[move.type]}
                        </span>
                      </td>
                      <td>{move.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p style={{ marginTop: "1rem" }}>
            <Link href="/movements">View all movements →</Link>
          </p>
        </section>
      </div>
    </>
  );
}
