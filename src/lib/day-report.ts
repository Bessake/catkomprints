import { MovementType, PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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
