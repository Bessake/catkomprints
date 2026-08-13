"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ServiceActionState = { error?: string; success?: string } | null;

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

const saleSchema = z.object({
  serviceId: z.string().min(1),
  cost: z.coerce.number().min(0),
  paymentMethod: z.enum(["momo", "cash"]),
  clientName: z.string().trim().max(120).optional().default(""),
  momoName: z.string().trim().max(120).optional().default(""),
  note: z.string().trim().max(500).optional().default(""),
  servedDate: z.string().min(1),
  servedTime: z.string().min(1),
});

export async function recordServiceSaleAction(
  _prev: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const session = await requireSession();

  const parsed = saleSchema.safeParse({
    serviceId: formData.get("serviceId"),
    cost: formData.get("cost"),
    paymentMethod: formData.get("paymentMethod"),
    clientName: formData.get("clientName") || "",
    momoName: formData.get("momoName") || "",
    note: formData.get("note") || "",
    servedDate: formData.get("servedDate"),
    servedTime: formData.get("servedTime"),
  });

  if (!parsed.success) {
    return { error: "Select a service, cost, and whether the client paid MoMo or cash." };
  }

  if (parsed.data.paymentMethod === "momo" && !parsed.data.momoName) {
    return { error: "Enter the MoMo name that appeared on the payment." };
  }

  const servedAt = new Date(`${parsed.data.servedDate}T${parsed.data.servedTime}`);
  if (Number.isNaN(servedAt.getTime())) {
    return { error: "Date and time look invalid. Try again." };
  }

  const service = await prisma.pressService.findFirst({
    where: { id: parsed.data.serviceId, active: true },
  });
  if (!service) {
    return { error: "That service is not available. Pick another from the list." };
  }

  await prisma.serviceSale.create({
    data: {
      serviceId: service.id,
      cost: parsed.data.cost,
      paymentMethod: parsed.data.paymentMethod,
      clientName: parsed.data.clientName,
      momoName:
        parsed.data.paymentMethod === "momo" ? parsed.data.momoName : "",
      note: parsed.data.note,
      servedAt,
      createdById: session.user.id,
    },
  });

  revalidatePath("/services");
  revalidatePath("/cash-out");
  revalidatePath("/daily-report");
  revalidatePath("/");
  return {
    success: `Recorded ${service.name} · ${parsed.data.paymentMethod === "momo" ? "MoMo" : "Cash"}.`,
  };
}

const serviceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  defaultCost: z.coerce.number().min(0).optional().default(0),
});

export async function createPressServiceAction(
  _prev: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  await requireSession();

  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    defaultCost: formData.get("defaultCost") || 0,
  });
  if (!parsed.success) {
    return { error: "Enter a service name." };
  }

  try {
    await prisma.pressService.create({
      data: {
        name: parsed.data.name,
        defaultCost: parsed.data.defaultCost,
      },
    });
  } catch {
    return { error: "That service name is already on the list." };
  }

  revalidatePath("/services");
  return { success: `Added ${parsed.data.name} to the dropdown.` };
}

export async function togglePressServiceAction(serviceId: string) {
  await requireSession();
  const service = await prisma.pressService.findUnique({
    where: { id: serviceId },
  });
  if (!service) return;

  await prisma.pressService.update({
    where: { id: serviceId },
    data: { active: !service.active },
  });
  revalidatePath("/services");
}
