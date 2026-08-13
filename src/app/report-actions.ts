"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { buildDaySnapshot } from "@/lib/day-report";
import { prisma } from "@/lib/prisma";

export type ReportActionState = { error?: string; success?: string } | null;

async function requireDeskSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "staff" && session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return session;
}

const notesSchema = z.object({
  notes: z.string().trim().max(2000).optional().default(""),
});

export async function sendDailyReportAction(
  _prev: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  const session = await requireDeskSession();
  const parsed = notesSchema.safeParse({
    notes: formData.get("notes") || "",
  });
  if (!parsed.success) {
    return { error: "Notes are too long. Keep them under 2000 characters." };
  }

  const snapshot = await buildDaySnapshot();
  const data = {
    serviceCount: snapshot.serviceCount,
    serviceMomoCount: snapshot.serviceMomoCount,
    serviceCashCount: snapshot.serviceCashCount,
    serviceMomoTotal: snapshot.serviceMomoTotal,
    serviceCashTotal: snapshot.serviceCashTotal,
    cashOutCount: snapshot.cashOutCount,
    cashOutMomoCount: snapshot.cashOutMomoCount,
    cashOutCashCount: snapshot.cashOutCashCount,
    cashOutMomoTotal: snapshot.cashOutMomoTotal,
    cashOutCashTotal: snapshot.cashOutCashTotal,
    stockOutCount: snapshot.stockOutCount,
    stockOutUnits: snapshot.stockOutUnits,
    stockInCount: snapshot.stockInCount,
    stockInUnits: snapshot.stockInUnits,
    notes: parsed.data.notes,
    submittedById: session.user.id,
    submittedAt: new Date(),
  };

  await prisma.dailyReport.upsert({
    where: { reportDate: snapshot.reportDate },
    create: {
      reportDate: snapshot.reportDate,
      ...data,
    },
    update: data,
  });

  revalidatePath("/daily-report");
  revalidatePath("/reports");
  revalidatePath("/");
  return {
    success: `Today’s report (${snapshot.label}) was sent to the manager.`,
  };
}
