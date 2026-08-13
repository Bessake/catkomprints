import { PaymentMethod } from "@prisma/client";
import { togglePressServiceAction } from "@/app/service-actions";
import { PressServiceForm } from "@/components/press-service-form";
import { ServiceSaleForm } from "@/components/service-sale-form";
import { auth } from "@/lib/auth";
import { DEFAULT_PRESS_SERVICES } from "@/lib/press-services";
import { prisma } from "@/lib/prisma";
import {
  formatCurrency,
  formatDate,
  paymentMethodLabels,
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

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [catalog, sales, todaySales, allSales] = await Promise.all([
    prisma.pressService.findMany({
      include: { _count: { select: { sales: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.serviceSale.findMany({
      where: paymentFilter ? { paymentMethod: paymentFilter } : undefined,
      include: { service: true, createdBy: true },
      orderBy: { servedAt: "desc" },
      take: 100,
    }),
    prisma.serviceSale.findMany({
      where: { servedAt: { gte: startOfToday } },
      select: { cost: true, paymentMethod: true },
    }),
    prisma.serviceSale.findMany({
      include: { service: true, createdBy: true },
      orderBy: { servedAt: "desc" },
    }),
  ]);

  const activeServices = catalog.filter((service) => service.active);
  const todayTotal = todaySales.reduce((sum, sale) => sum + sale.cost, 0);
  const todayMomo = todaySales
    .filter((sale) => sale.paymentMethod === "momo")
    .reduce((sum, sale) => sum + sale.cost, 0);
  const todayCash = todaySales
    .filter((sale) => sale.paymentMethod === "cash")
    .reduce((sum, sale) => sum + sale.cost, 0);
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
            Record each job, the cost in cedis, and whether the client paid
            MoMo or cash.
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
        </div>
        <div className="stat-card">
          <span className="muted">MoMo today</span>
          <strong>{formatCurrency(todayMomo)}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Cash today</span>
          <strong>{formatCurrency(todayCash)}</strong>
        </div>
      </div>

      <div className="detail-layout">
        <section className="panel">
          <h2>Record a service</h2>
          <ServiceSaleForm
            recorderName={recorderName}
            services={activeServices.map((service) => ({
              id: service.id,
              name: service.name,
              defaultCost: service.defaultCost,
            }))}
          />
        </section>

        <section className="panel">
          <h2>Service list</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            These names appear in the dropdown. Add any extra press jobs you
            offer.
          </p>
          {catalog.length === 0 ? (
            <p className="muted">No services yet.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Jobs</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {catalog.map((service) => {
                    const toggle = togglePressServiceAction.bind(
                      null,
                      service.id,
                    );
                    return (
                      <tr key={service.id}>
                        <td>
                          {service.name}
                          {!service.active ? (
                            <div className="muted" style={{ fontSize: "0.85rem" }}>
                              Hidden from dropdown
                            </div>
                          ) : null}
                        </td>
                        <td>{service._count.sales}</td>
                        <td>
                          <form action={toggle}>
                            <button type="submit" className="button secondary">
                              {service.active ? "Hide" : "Show"}
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
          <h2 style={{ marginTop: "1.5rem" }}>Add service</h2>
          <PressServiceForm />
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
                      {sale.service.name}
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
                      <td>{sale.service.name}</td>
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
                      <td>{sale.service.name}</td>
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
