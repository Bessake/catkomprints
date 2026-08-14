import Link from "next/link";
import { PaymentMethod, MovementType } from "@prisma/client";
import { DebtorForm } from "@/components/debtor-form";
import { DebtorTable } from "@/components/debtor-table";
import { DeskStockInForm } from "@/components/desk-stock-in-form";
import { DeskStockInHistory } from "@/components/desk-stock-in-history";
import { PressServiceForm } from "@/components/press-service-form";
import { ServiceListDropdown } from "@/components/service-list-dropdown";
import { ServiceSaleForm } from "@/components/service-sale-form";
import { auth } from "@/lib/auth";
import { DEFAULT_PRESS_SERVICES } from "@/lib/press-services";
import { prisma } from "@/lib/prisma";
import { getAccraDayBounds } from "@/lib/day-report";
import {
  formatCurrency,
  formatDate,
  paymentMethodLabels,
  saleLineLabel,
} from "@/lib/utils";

export const metadata = { title: "Services" };

async function ensureDefaultPressServices() {
  const count = await prisma.pressService.count();
  if (count > 0) return;
  await prisma.pressService.createMany({
    data: DEFAULT_PRESS_SERVICES.map((name) => ({ name })),
  });
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  await ensureDefaultPressServices();
  const session = await auth();
  const recorderName = session?.user?.name || "Unknown";
  const { payment } = await searchParams;
  const paymentFilter =
    payment === "momo" || payment === "cash"
      ? (payment as PaymentMethod)
      : undefined;

  const { start, end } = getAccraDayBounds();
  const todayRange = { gte: start, lte: end };

  const [catalog, sales, todaySales, todayCashOuts, allSales, products, unpaidDebtors, stockIns] =
    await Promise.all([
    prisma.pressService.findMany({
      include: { _count: { select: { sales: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.serviceSale.findMany({
      where: paymentFilter ? { paymentMethod: paymentFilter } : undefined,
      include: { service: true, product: true, createdBy: true },
      orderBy: { servedAt: "desc" },
      take: 100,
    }),
    prisma.serviceSale.findMany({
      where: { servedAt: todayRange },
      select: { cost: true, paymentMethod: true },
    }),
    prisma.cashOut.findMany({
      where: { takenAt: todayRange },
      select: { amount: true, paymentMethod: true },
    }),
    prisma.serviceSale.findMany({
      include: { service: true, product: true, createdBy: true },
      orderBy: { servedAt: "desc" },
    }),
    prisma.product.findMany({
      where: { active: true },
      include: { category: true },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.debtor.findMany({
      where: { paid: false },
      include: { createdBy: true },
      orderBy: { recordedAt: "desc" },
    }),
    prisma.stockMovement.findMany({
      where: { type: MovementType.in },
      include: { product: true, createdBy: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const activeServices = catalog.filter((service) => service.active);
  const todayMomoIn = todaySales
    .filter((sale) => sale.paymentMethod === "momo")
    .reduce((sum, sale) => sum + sale.cost, 0);
  const todayCashIn = todaySales
    .filter((sale) => sale.paymentMethod === "cash")
    .reduce((sum, sale) => sum + sale.cost, 0);
  const todayMomoOut = todayCashOuts
    .filter((row) => row.paymentMethod === "momo")
    .reduce((sum, row) => sum + row.amount, 0);
  const todayCashOut = todayCashOuts
    .filter((row) => row.paymentMethod === "cash")
    .reduce((sum, row) => sum + row.amount, 0);
  const todayMomo = todayMomoIn - todayMomoOut;
  const todayCash = todayCashIn - todayCashOut;
  const todayTotal = todayMomo + todayCash;
  const momoClients = allSales.filter((sale) => sale.paymentMethod === "momo");
  const cashClients = allSales.filter((sale) => sale.paymentMethod === "cash");
  const momoTotal = momoClients.reduce((sum, sale) => sum + sale.cost, 0);
  const cashTotal = cashClients.reduce((sum, sale) => sum + sale.cost, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Front desk</p>
          <h1>Services</h1>
          <p className="muted" style={{ margin: "0.4rem 0 0" }}>
            Record each job, stock coming in, and customers who still owe.
          </p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="muted">Today’s jobs</span>
          <strong>{todaySales.length}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Today’s total</span>
          <strong>{formatCurrency(todayTotal)}</strong>
          <p className="muted" style={{ margin: "0.35rem 0 0" }}>
            After take-outs
          </p>
        </div>
        <div className="stat-card">
          <span className="muted">MoMo today</span>
          <strong>{formatCurrency(todayMomo)}</strong>
          <p className="muted" style={{ margin: "0.35rem 0 0" }}>
            {formatCurrency(todayMomoIn)} in − {formatCurrency(todayMomoOut)} out
          </p>
        </div>
        <div className="stat-card">
          <span className="muted">Cash today</span>
          <strong>{formatCurrency(todayCash)}</strong>
          <p className="muted" style={{ margin: "0.35rem 0 0" }}>
            {formatCurrency(todayCashIn)} in − {formatCurrency(todayCashOut)} out
          </p>
        </div>
      </div>

      <div className="detail-layout">
        <section className="panel">
          <h2>Record a service or material</h2>
          <ServiceSaleForm
            recorderName={recorderName}
            services={activeServices.map((service) => ({
              id: service.id,
              name: service.name,
              defaultCost: service.defaultCost,
            }))}
            products={products.map((product) => ({
              id: product.id,
              name: product.name,
              quantity: product.quantity,
              unitPrice: product.unitPrice,
              categoryName: product.category?.name || null,
            }))}
          />
        </section>

        <section className="panel">
          <h2>Service list</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Open the menu to pick a service. Add any extra press jobs you
            offer.
          </p>
          <ServiceListDropdown
            services={catalog.map((service) => ({
              id: service.id,
              name: service.name,
              active: service.active,
              jobs: service._count.sales,
            }))}
          />
          <h2 style={{ marginTop: "1.5rem" }}>Add service</h2>
          <PressServiceForm />
        </section>
      </div>

      <div className="detail-layout" style={{ marginTop: "1.25rem" }}>
        <section className="panel">
          <h2>Record stock in</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Add materials as they arrive so on-hand quantities stay up to date.
          </p>
          {products.length === 0 ? (
            <p className="muted">
              No products yet. Add one on the Stock page, then record stock in
              here.
            </p>
          ) : (
            <DeskStockInForm
              products={products.map((product) => ({
                id: product.id,
                sku: product.sku,
                name: product.name,
                quantity: product.quantity,
                reorderLevel: product.reorderLevel,
                categoryName: product.category?.name || null,
              }))}
            />
          )}
        </section>

        <section className="panel">
          <h2>Record a debtor</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Use this when a customer takes work and will pay later.
          </p>
          <DebtorForm recorderName={recorderName} />
        </section>
      </div>

      <section className="panel" style={{ marginTop: "1.25rem" }}>
        <h2>Stock in records</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Edit a record if the product, quantity, or note was entered wrongly.
        </p>
        <DeskStockInHistory
          products={products.map((product) => ({
            id: product.id,
            sku: product.sku,
            name: product.name,
            quantity: product.quantity,
            categoryName: product.category?.name || null,
          }))}
          records={stockIns.map((row) => ({
            id: row.id,
            productId: row.productId,
            productName: row.product.name,
            sku: row.product.sku,
            quantity: row.quantity,
            note: row.note,
            recordedBy: row.createdBy?.name || "",
            createdAt: row.createdAt.toISOString(),
          }))}
        />
      </section>

      <section className="panel" style={{ marginTop: "1.25rem" }}>
        <h2>People who still owe</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          See settled names on the{" "}
          <Link href="/debtors">Debtors</Link> page.
        </p>
        <DebtorTable
          debtors={unpaidDebtors}
          emptyText="No outstanding debtors."
        />
      </section>

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
        <h2>Recorded services</h2>
        {sales.length === 0 ? (
          <p className="muted">No services recorded yet.</p>
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
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{formatDate(sale.servedAt)}</td>
                    <td>
                      {saleLineLabel(sale)}
                      {sale.product ? (
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
                    <td>{sale.clientName || "—"}</td>
                    <td>
                      {sale.paymentMethod === "momo"
                        ? sale.momoName || "—"
                        : "—"}
                    </td>
                    <td>{formatCurrency(sale.cost)}</td>
                    <td>
                      <span className={`badge ${sale.paymentMethod}`}>
                        {paymentMethodLabels[sale.paymentMethod]}
                      </span>
                    </td>
                    <td>{sale.createdBy?.name || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="payment-clients-footer">
        <section className="panel">
          <h2>MoMo clients</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            {momoClients.length} payment{momoClients.length === 1 ? "" : "s"} ·{" "}
            {formatCurrency(momoTotal)}
          </p>
          {momoClients.length === 0 ? (
            <p className="muted">No MoMo payments yet.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>MoMo name</th>
                    <th>Client</th>
                    <th>Service</th>
                    <th>Cost</th>
                    <th>Recorded by</th>
                    <th>Date & time</th>
                  </tr>
                </thead>
                <tbody>
                  {momoClients.map((sale) => (
                    <tr key={sale.id}>
                      <td>{sale.momoName || "—"}</td>
                      <td>{sale.clientName || "—"}</td>
                      <td>{saleLineLabel(sale)}</td>
                      <td>{formatCurrency(sale.cost)}</td>
                      <td>{sale.createdBy?.name || "—"}</td>
                      <td>{formatDate(sale.servedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <h2>Cash clients</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            {cashClients.length} payment{cashClients.length === 1 ? "" : "s"} ·{" "}
            {formatCurrency(cashTotal)}
          </p>
          {cashClients.length === 0 ? (
            <p className="muted">No cash payments yet.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Service</th>
                    <th>Cost</th>
                    <th>Recorded by</th>
                    <th>Date & time</th>
                  </tr>
                </thead>
                <tbody>
                  {cashClients.map((sale) => (
                    <tr key={sale.id}>
                      <td>{sale.clientName || "Walk-in"}</td>
                      <td>{saleLineLabel(sale)}</td>
                      <td>{formatCurrency(sale.cost)}</td>
                      <td>{sale.createdBy?.name || "—"}</td>
                      <td>{formatDate(sale.servedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </footer>
    </>
  );
}
