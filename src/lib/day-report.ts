import { MovementType, PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { saleLineLabel } from "@/lib/utils";

export type DaySnapshot = {
  reportDate: Date;
  label: string;
  start: Date;
  end: Date;
  serviceCount: number;
  serviceMomoCount: number;
  serviceCashCount: number;
  serviceMomoTotal: number;
  serviceCashTotal: number;
  cashOutCount: number;
  cashOutMomoCount: number;
  cashOutCashCount: number;
  cashOutMomoTotal: number;
  cashOutCashTotal: number;
  stockOutCount: number;
  stockOutUnits: number;
  stockInCount: number;
  stockInUnits: number;
};

export type DayActivityService = {
  at: string;
  service: string;
  client: string;
  momoName: string;
  cost: number;
  payment: "momo" | "cash";
  recordedBy: string;
  note: string;
  kind?: "service" | "material";
};

export type DayActivityCashOut = {
  at: string;
  amount: number;
  payment: "momo" | "cash";
  purpose: string;
  momoName: string;
  recordedBy: string;
};

export type DayActivityStock = {
  at: string;
  product: string;
  sku: string;
  quantity: number;
  takenBy: string;
  recordedBy: string;
  note: string;
};

export type DayActivityDebtor = {
  at: string;
  name: string;
  phone: string;
  amount: number;
  purpose: string;
  note: string;
  paid: boolean;
  recordedBy: string;
};

export type DayActivity = {
  services: DayActivityService[];
  cashOuts: DayActivityCashOut[];
  stockOuts: DayActivityStock[];
  stockIns: DayActivityStock[];
  debtors: DayActivityDebtor[];
};

function accraDateParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Accra",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    throw new Error("Could not resolve Accra date.");
  }
  return { year, month, day, label: `${year}-${month}-${day}` };
}

export function getAccraDayBounds(now = new Date()) {
  const { year, month, day, label } = accraDateParts(now);
  // Ghana is UTC+0 year-round.
  const start = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  const end = new Date(`${year}-${month}-${day}T23:59:59.999Z`);
  const reportDate = start;
  return { start, end, reportDate, label };
}

export async function buildDaySnapshot(now = new Date()): Promise<DaySnapshot> {
  const { start, end, reportDate, label } = getAccraDayBounds(now);
  const range = { gte: start, lte: end };

  const [sales, cashOuts, stockOuts, stockIns] = await Promise.all([
    prisma.serviceSale.findMany({
      where: { servedAt: range },
      select: { cost: true, paymentMethod: true },
    }),
    prisma.cashOut.findMany({
      where: { takenAt: range },
      select: { amount: true, paymentMethod: true },
    }),
    prisma.stockMovement.findMany({
      where: { createdAt: range, type: MovementType.out },
      select: { quantity: true },
    }),
    prisma.stockMovement.findMany({
      where: { createdAt: range, type: MovementType.in },
      select: { quantity: true },
    }),
  ]);

  const momoSales = sales.filter((row) => row.paymentMethod === PaymentMethod.momo);
  const cashSales = sales.filter((row) => row.paymentMethod === PaymentMethod.cash);
  const momoOut = cashOuts.filter((row) => row.paymentMethod === PaymentMethod.momo);
  const cashOut = cashOuts.filter((row) => row.paymentMethod === PaymentMethod.cash);

  return {
    reportDate,
    label,
    start,
    end,
    serviceCount: sales.length,
    serviceMomoCount: momoSales.length,
    serviceCashCount: cashSales.length,
    serviceMomoTotal: momoSales.reduce((sum, row) => sum + row.cost, 0),
    serviceCashTotal: cashSales.reduce((sum, row) => sum + row.cost, 0),
    cashOutCount: cashOuts.length,
    cashOutMomoCount: momoOut.length,
    cashOutCashCount: cashOut.length,
    cashOutMomoTotal: momoOut.reduce((sum, row) => sum + row.amount, 0),
    cashOutCashTotal: cashOut.reduce((sum, row) => sum + row.amount, 0),
    stockOutCount: stockOuts.length,
    stockOutUnits: stockOuts.reduce((sum, row) => sum + row.quantity, 0),
    stockInCount: stockIns.length,
    stockInUnits: stockIns.reduce((sum, row) => sum + row.quantity, 0),
  };
}

export function netMomoOnHand(
  snapshot: Pick<DaySnapshot, "serviceMomoTotal" | "cashOutMomoTotal">,
) {
  return snapshot.serviceMomoTotal - snapshot.cashOutMomoTotal;
}

export function netCashOnHand(
  snapshot: Pick<DaySnapshot, "serviceCashTotal" | "cashOutCashTotal">,
) {
  return snapshot.serviceCashTotal - snapshot.cashOutCashTotal;
}

export type DailySalesPoint = {
  label: string;
  display: string;
  total: number;
  momo: number;
  cash: number;
  jobs: number;
};

export async function buildDailySalesSeries(
  days = 14,
): Promise<DailySalesPoint[]> {
  const dayCount = Math.max(2, Math.min(days, 60));
  const { start: todayStart, label: todayLabel } = getAccraDayBounds();
  const rangeStart = new Date(todayStart);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - (dayCount - 1));
  const rangeEnd = new Date(`${todayLabel}T23:59:59.999Z`);

  const sales = await prisma.serviceSale.findMany({
    where: { servedAt: { gte: rangeStart, lte: rangeEnd } },
    select: { cost: true, paymentMethod: true, servedAt: true },
  });

  const byDay = new Map<
    string,
    { total: number; momo: number; cash: number; jobs: number }
  >();
  for (let i = 0; i < dayCount; i += 1) {
    const day = new Date(rangeStart);
    day.setUTCDate(rangeStart.getUTCDate() + i);
    byDay.set(day.toISOString().slice(0, 10), {
      total: 0,
      momo: 0,
      cash: 0,
      jobs: 0,
    });
  }

  for (const sale of sales) {
    const key = sale.servedAt.toISOString().slice(0, 10);
    const bucket = byDay.get(key);
    if (!bucket) continue;
    bucket.total += sale.cost;
    bucket.jobs += 1;
    if (sale.paymentMethod === PaymentMethod.momo) {
      bucket.momo += sale.cost;
    } else {
      bucket.cash += sale.cost;
    }
  }

  return [...byDay.entries()].map(([label, values]) => ({
    label,
    display: new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "Africa/Accra",
    }).format(new Date(`${label}T12:00:00.000Z`)),
    ...values,
  }));
}

function mapStockRow(row: {
  createdAt: Date;
  quantity: number;
  note: string;
  product: { name: string; sku: string };
  takenBy: { name: string } | null;
  createdBy: { name: string } | null;
}): DayActivityStock {
  return {
    at: row.createdAt.toISOString(),
    product: row.product.name,
    sku: row.product.sku,
    quantity: row.quantity,
    takenBy: row.takenBy?.name || "",
    recordedBy: row.createdBy?.name || "",
    note: row.note,
  };
}

export async function buildDayActivity(now = new Date()): Promise<DayActivity> {
  const { start, end } = getAccraDayBounds(now);
  const range = { gte: start, lte: end };

  const [sales, cashOuts, stockOuts, stockIns, debtors] = await Promise.all([
    prisma.serviceSale.findMany({
      where: { servedAt: range },
      include: { service: true, product: true, createdBy: true },
      orderBy: { servedAt: "asc" },
    }),
    prisma.cashOut.findMany({
      where: { takenAt: range },
      include: { createdBy: true },
      orderBy: { takenAt: "asc" },
    }),
    prisma.stockMovement.findMany({
      where: { createdAt: range, type: MovementType.out },
      include: { product: true, takenBy: true, createdBy: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.stockMovement.findMany({
      where: { createdAt: range, type: MovementType.in },
      include: { product: true, takenBy: true, createdBy: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.debtor.findMany({
      where: { recordedAt: range },
      include: { createdBy: true },
      orderBy: { recordedAt: "asc" },
    }),
  ]);

  return {
    services: sales.map((sale) => ({
      at: sale.servedAt.toISOString(),
      service: saleLineLabel(sale),
      client: sale.clientName,
      momoName: sale.momoName,
      cost: sale.cost,
      payment: sale.paymentMethod,
      recordedBy: sale.createdBy?.name || "",
      note: sale.note,
      kind: sale.productId ? "material" : "service",
    })),
    cashOuts: cashOuts.map((entry) => ({
      at: entry.takenAt.toISOString(),
      amount: entry.amount,
      payment: entry.paymentMethod,
      purpose: entry.purpose,
      momoName: entry.momoName,
      recordedBy: entry.createdBy?.name || "",
    })),
    stockOuts: stockOuts.map(mapStockRow),
    stockIns: stockIns.map(mapStockRow),
    debtors: debtors.map((row) => ({
      at: row.recordedAt.toISOString(),
      name: row.name,
      phone: row.phone,
      amount: row.amount,
      purpose: row.purpose,
      note: row.note,
      paid: row.paid,
      recordedBy: row.createdBy?.name || "",
    })),
  };
}

export function parseDayActivity(value: unknown): DayActivity | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (
    !Array.isArray(record.services) ||
    !Array.isArray(record.cashOuts) ||
    !Array.isArray(record.stockOuts) ||
    !Array.isArray(record.stockIns)
  ) {
    return null;
  }
  return {
    ...(value as DayActivity),
    debtors: Array.isArray(record.debtors)
      ? (record.debtors as DayActivity["debtors"])
      : [],
  };
}
