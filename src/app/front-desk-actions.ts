"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { InvoiceStatus, MovementType, SmsKind } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";
import {
  calcInvoiceTotals,
  calcLineTotal,
  formatCurrency,
  formatDateShort,
  normalizePhone,
} from "@/lib/utils";

export type ActionState = { error?: string; success?: string } | null;

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

const clientSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().email().optional(),
  ),
  phone: z.string().trim().max(32).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
});

export async function createClientAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSession();
  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || "",
    notes: formData.get("notes") || "",
  });
  if (!parsed.success) return { error: "Check the client fields and try again." };

  const client = await prisma.client.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ? normalizePhone(parsed.data.phone) : null,
      notes: parsed.data.notes,
    },
  });

  revalidatePath("/clients");
  revalidatePath("/messages");
  redirect(`/clients/${client.id}`);
}

export async function updateClientAction(
  clientId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSession();
  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || "",
    notes: formData.get("notes") || "",
  });
  if (!parsed.success) return { error: "Check the client fields and try again." };

  await prisma.client.update({
    where: { id: clientId },
    data: {
      name: parsed.data.name,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ? normalizePhone(parsed.data.phone) : null,
      notes: parsed.data.notes,
    },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/messages");
  return { success: "Client updated." };
}

async function nextInvoiceNumber() {
  const latest = await prisma.invoice.findFirst({
    orderBy: { createdAt: "desc" },
    select: { number: true },
  });
  const match = latest?.number.match(/INV-(\d+)/);
  const next = match ? Number(match[1]) + 1 : 1;
  return `INV-${String(next).padStart(4, "0")}`;
}

function parseInvoiceLines(formData: FormData) {
  const descriptions = formData.getAll("itemDescription").map(String);
  const productIds = formData.getAll("itemProductId").map(String);
  const quantities = formData.getAll("itemQuantity").map(String);
  const unitPrices = formData.getAll("itemUnitPrice").map(String);

  const lines = descriptions.map((description, index) => ({
    description: description.trim(),
    productId: productIds[index]?.trim() || null,
    quantity: Number(quantities[index]),
    unitPrice: Number(unitPrices[index]),
  }));

  return lines.filter(
    (line) =>
      line.description &&
      Number.isFinite(line.quantity) &&
      line.quantity > 0 &&
      Number.isFinite(line.unitPrice) &&
      line.unitPrice >= 0,
  );
}

async function deductStockForInvoice(
  invoiceId: string,
  userId: string,
) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true },
  });
  if (!invoice || invoice.stockDeducted) return;

  await prisma.$transaction(async (tx) => {
    for (const item of invoice.items) {
      if (!item.productId) continue;
      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });
      if (!product) continue;
      if (product.quantity < item.quantity) {
        throw new Error(
          `Not enough stock for ${product.name}. Available: ${product.quantity}.`,
        );
      }
      await tx.product.update({
        where: { id: product.id },
        data: { quantity: product.quantity - item.quantity },
      });
      await tx.stockMovement.create({
        data: {
          productId: product.id,
          type: MovementType.out,
          quantity: item.quantity,
          note: `Invoice ${invoice.number}`,
          createdById: userId,
        },
      });
    }
    await tx.invoice.update({
      where: { id: invoiceId },
      data: { stockDeducted: true },
    });
  });
}

export async function createInvoiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  const clientId = String(formData.get("clientId") || "");
  const taxRate = Number(formData.get("taxRate") || 0);
  const notes = String(formData.get("notes") || "").trim();
  const dueDateRaw = String(formData.get("dueDate") || "");
  const statusRaw = String(formData.get("status") || "draft");
  const lines = parseInvoiceLines(formData);

  if (!clientId) return { error: "Select a client." };
  if (lines.length === 0) return { error: "Add at least one invoice line." };
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
    return { error: "Tax rate must be between 0 and 100." };
  }

  const status =
    statusRaw === "sent" || statusRaw === "paid"
      ? (statusRaw as InvoiceStatus)
      : InvoiceStatus.draft;

  const totals = calcInvoiceTotals(lines, taxRate);
  const number = await nextInvoiceNumber();

  let invoiceId: string;
  try {
    const invoice = await prisma.invoice.create({
      data: {
        number,
        clientId,
        status,
        taxRate,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        total: totals.total,
        notes,
        dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
        createdById: session.user.id,
        items: {
          create: lines.map((line) => ({
            productId: line.productId,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: calcLineTotal(line.quantity, line.unitPrice),
          })),
        },
      },
    });
    invoiceId = invoice.id;

    if (status === InvoiceStatus.sent || status === InvoiceStatus.paid) {
      await deductStockForInvoice(invoiceId, session.user.id);
    }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not create invoice.",
    };
  }

  revalidatePath("/");
  revalidatePath("/invoices");
  revalidatePath("/products");
  revalidatePath("/movements");
  redirect(`/invoices/${invoiceId}`);
}

export async function updateInvoiceStatusAction(
  invoiceId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  const status = String(formData.get("status") || "") as InvoiceStatus;
  if (!Object.values(InvoiceStatus).includes(status)) {
    return { error: "Invalid status." };
  }

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return { error: "Invoice not found." };

  try {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status },
    });

    if (
      (status === InvoiceStatus.sent || status === InvoiceStatus.paid) &&
      !invoice.stockDeducted
    ) {
      await deductStockForInvoice(invoiceId, session.user.id);
    }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not update invoice.",
    };
  }

  revalidatePath("/");
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/products");
  revalidatePath("/movements");
  return { success: "Invoice status updated." };
}

export async function broadcastSmsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  const body = String(formData.get("body") || "").trim();
  const audience = String(formData.get("audience") || "all");

  if (!body) return { error: "Message body is required." };
  if (body.length > 480) return { error: "Keep SMS under 480 characters." };

  const clients = await prisma.client.findMany({
    where:
      audience === "with_phone"
        ? { phone: { not: null } }
        : {},
  });

  const recipients = clients.filter((c) => c.phone);
  if (recipients.length === 0) {
    return { error: "No clients with phone numbers to message." };
  }

  let sent = 0;
  let failed = 0;

  for (const client of recipients) {
    const result = await sendSms({ to: client.phone!, body });
    await prisma.smsMessage.create({
      data: {
        clientId: client.id,
        kind: SmsKind.broadcast,
        toPhone: client.phone!,
        body,
        status: result.status,
        providerId: result.providerId,
        error: result.error,
        createdById: session.user.id,
      },
    });
    if (result.status === "failed") failed += 1;
    else sent += 1;
  }

  revalidatePath("/messages");
  return {
    success: `Broadcast finished: ${sent} delivered/simulated, ${failed} failed.`,
  };
}

export async function sendPaymentRemindersAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  const customNote = String(formData.get("note") || "").trim();
  const invoiceIds = formData.getAll("invoiceId").map(String).filter(Boolean);

  const invoices = await prisma.invoice.findMany({
    where: {
      id: invoiceIds.length ? { in: invoiceIds } : undefined,
      status: { in: [InvoiceStatus.sent, InvoiceStatus.overdue] },
    },
    include: { client: true },
  });

  const due = invoices.filter((invoice) => invoice.client.phone);
  if (due.length === 0) {
    return {
      error:
        "No unpaid invoices with client phone numbers were selected/found.",
    };
  }

  let sent = 0;
  let failed = 0;

  for (const invoice of due) {
    const dueText = invoice.dueDate
      ? ` Due ${formatDateShort(invoice.dueDate)}.`
      : "";
    const body =
      customNote ||
      `Hi ${invoice.client.name}, reminder: invoice ${invoice.number} for ${formatCurrency(invoice.total)} is unpaid.${dueText} Please arrange payment. — Catkom Prints`;

    const result = await sendSms({ to: invoice.client.phone!, body });
    await prisma.smsMessage.create({
      data: {
        clientId: invoice.clientId,
        invoiceId: invoice.id,
        kind: SmsKind.reminder,
        toPhone: invoice.client.phone!,
        body,
        status: result.status,
        providerId: result.providerId,
        error: result.error,
        createdById: session.user.id,
      },
    });
    if (result.status === "failed") failed += 1;
    else sent += 1;
  }

  revalidatePath("/messages");
  revalidatePath("/invoices");
  return {
    success: `Reminders finished: ${sent} delivered/simulated, ${failed} failed.`,
  };
}

export async function sendClientSmsAction(
  clientId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  const body = String(formData.get("body") || "").trim();
  if (!body) return { error: "Message body is required." };

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client?.phone) return { error: "Client has no phone number." };

  const result = await sendSms({ to: client.phone, body });
  await prisma.smsMessage.create({
    data: {
      clientId,
      kind: SmsKind.custom,
      toPhone: client.phone,
      body,
      status: result.status,
      providerId: result.providerId,
      error: result.error,
      createdById: session.user.id,
    },
  });

  revalidatePath("/messages");
  revalidatePath(`/clients/${clientId}`);
  if (result.status === "failed") {
    return { error: result.error || "SMS failed to send." };
  }
  return {
    success:
      result.status === "simulated"
        ? "SMS simulated (configure Twilio for live delivery)."
        : "SMS sent.",
  };
}
