"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type CashOutActionState = { error?: string; success?: string } | null;

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

const cashOutSchema = z.object({
  amount: z.coerce.number().positive(),
  paymentMethod: z.enum(["momo", "cash"]),
  purpose: z.string().trim().min(1).max(500),
  takenDate: z.string().min(1),
  takenTime: z.string().min(1),
});

export async function recordCashOutAction(
  _prev: CashOutActionState,
  formData: FormData,
): Promise<CashOutActionState> {
  const session = await requireSession();

  const parsed = cashOutSchema.safeParse({
    amount: formData.get("amount"),
    paymentMethod: formData.get("paymentMethod"),
    purpose: formData.get("purpose"),
    takenDate: formData.get("takenDate"),
    takenTime: formData.get("takenTime"),
  });

  if (!parsed.success) {
    return {
      error: "Enter the amount, MoMo or cash, and the purpose of the take-out.",
    };
  }

  const takenAt = new Date(
    `${parsed.data.takenDate}T${parsed.data.takenTime}`,
  );
  if (Number.isNaN(takenAt.getTime())) {
    return { error: "Date and time look invalid. Try again." };
  }

  await prisma.cashOut.create({
    data: {
      amount: parsed.data.amount,
      paymentMethod: parsed.data.paymentMethod,
      purpose: parsed.data.purpose,
      takenAt,
      createdById: session.user.id,
    },
  });

  revalidatePath("/cash-out");
  revalidatePath("/");
  return {
    success: `Recorded ${parsed.data.paymentMethod === "momo" ? "MoMo" : "cash"} take-out.`,
  };
}

export async function deleteCashOutAction(cashOutId: string) {
  await requireSession();
  await prisma.cashOut.delete({ where: { id: cashOutId } });
  revalidatePath("/cash-out");
}
