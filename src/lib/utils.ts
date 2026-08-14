import type { InvoiceStatus } from "@prisma/client";

export function formatCurrency(amount: number, currency = "GHS") {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Accra",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(typeof date === "string" ? new Date(date) : date);
}

export function formatDateShort(date: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Accra",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(typeof date === "string" ? new Date(date) : date);
}

export const movementTypeLabels = {
  in: "Stock in",
  out: "Stock out",
  adjust: "Adjustment",
} as const;

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

export const paymentMethodLabels = {
  momo: "MoMo",
  cash: "Cash",
} as const;

export function saleLineLabel(sale: {
  service?: { name: string } | null;
  product?: { name: string } | null;
  quantity?: number | null;
}) {
  if (sale.product) {
    return `${sale.product.name} × ${sale.quantity ?? 1}`;
  }
  return sale.service?.name || "Sale";
}

export function isLowStock(quantity: number, reorderLevel: number) {
  return quantity <= reorderLevel;
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calcLineTotal(quantity: number, unitPrice: number) {
  return roundMoney(quantity * unitPrice);
}

export function calcInvoiceTotals(
  lines: { quantity: number; unitPrice: number }[],
  taxRate: number,
) {
  const subtotal = roundMoney(
    lines.reduce((sum, line) => sum + calcLineTotal(line.quantity, line.unitPrice), 0),
  );
  const taxAmount = roundMoney(subtotal * (taxRate / 100));
  const total = roundMoney(subtotal + taxAmount);
  return { subtotal, taxAmount, total };
}

export function normalizePhone(phone: string) {
  const trimmed = phone.trim();
  if (!trimmed) return "";

  let digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  if (digits.startsWith("+")) return digits;

  // Ghana local numbers: 0244123456 or 244123456 → +233244123456
  if (digits.startsWith("233") && digits.length >= 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) {
    return `+233${digits.slice(1)}`;
  }
  if (digits.length === 9) return `+233${digits}`;

  return digits;
}
