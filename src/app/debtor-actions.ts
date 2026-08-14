"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type DebtorActionState = { error?: string; success?: string } | null;

async function requireDeskSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "staff" && session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return session;
}

const debtorSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40).optional().default(""),
  amount: z.coerce.number().positive(),
  purpose: z.string().trim().min(1).max(500),
  note: z.string().trim().max(500).optional().default(""),
  recordedDate: z.string().min(1),
  recordedTime: z.string().min(1),
});

function revalidateDebtorPages() {
  revalidatePath("/services");
  revalidatePath("/debtors");
  revalidatePath("/daily-report");
  revalidatePath("/");
}

export async function recordDebtorAction(
  _prev: DebtorActionState,
  formData: FormData,
): Promise<DebtorActionState> {
  const session = await requireDeskSession();

  const parsed = debtorSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || "",
    amount: formData.get("amount"),
    purpose: formData.get("purpose"),
    note: formData.get("note") || "",
    recordedDate: formData.get("recordedDate"),
    recordedTime: formData.get("recordedTime"),
  });

  if (!parsed.success) {
    return {
      error: "Enter the debtor’s name, amount owed, and what it is for.",
    };
  }

  const recordedAt = new Date(
    `${parsed.data.recordedDate}T${parsed.data.recordedTime}`,
  );
  if (Number.isNaN(recordedAt.getTime())) {
    return { error: "Date and time look invalid. Try again." };
  }

  await prisma.debtor.create({
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      amount: parsed.data.amount,
      purpose: parsed.data.purpose,
      note: parsed.data.note,
      recordedAt,
      createdById: session.user.id,
    },
  });

  revalidateDebtorPages();
  return { success: `Recorded ${parsed.data.name} as a debtor.` };
}

export async function markDebtorPaidAction(debtorId: string) {
  await requireDeskSession();
  await prisma.debtor.update({
    where: { id: debtorId },
    data: { paid: true, paidAt: new Date() },
  });
  revalidateDebtorPages();
}

export async function markDebtorUnpaidAction(debtorId: string) {
  await requireDeskSession();
  await prisma.debtor.update({
    where: { id: debtorId },
    data: { paid: false, paidAt: null },
  });
  revalidateDebtorPages();
}
