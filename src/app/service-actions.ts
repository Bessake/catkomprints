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
  serviceIds: z.array(z.string().min(1)).min(1),
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
    serviceIds: formData.getAll("serviceIds").map(String),
    paymentMethod: formData.get("paymentMethod"),
    clientName: formData.get("clientName") || "",
    momoName: formData.get("momoName") || "",
    note: formData.get("note") || "",
    servedDate: formData.get("servedDate"),
    servedTime: formData.get("servedTime"),
  });

  if (!parsed.success) {
    return {
      error:
        "Select one or more services, a cost for each, and whether the client paid MoMo or cash.",
    };
  }

  if (parsed.data.paymentMethod === "momo" && !parsed.data.momoName) {
    return { error: "Enter the MoMo name that appeared on the payment." };
  }

  const servedAt = new Date(`${parsed.data.servedDate}T${parsed.data.servedTime}`);
  if (Number.isNaN(servedAt.getTime())) {
    return { error: "Date and time look invalid. Try again." };
  }

  const uniqueIds = [...new Set(parsed.data.serviceIds)];
  const catalog = await prisma.pressService.findMany({
    where: { id: { in: uniqueIds }, active: true },
  });
  if (catalog.length !== uniqueIds.length) {
    return {
      error: "One of those services is not available. Pick again from the list.",
    };
  }

  const lines: { serviceId: string; name: string; cost: number }[] = [];
  for (const service of catalog) {
    const cost = Number(formData.get(`cost-${service.id}`));
    if (!Number.isFinite(cost) || cost < 0) {
      return { error: `Enter a cost for ${service.name}.` };
    }
    lines.push({ serviceId: service.id, name: service.name, cost });
  }

  await prisma.serviceSale.createMany({
    data: lines.map((line) => ({
      serviceId: line.serviceId,
      cost: line.cost,
      paymentMethod: parsed.data.paymentMethod,
      clientName: parsed.data.clientName,
      momoName:
        parsed.data.paymentMethod === "momo" ? parsed.data.momoName : "",
      note: parsed.data.note,
      servedAt,
      createdById: session.user.id,
    })),
  });

  revalidatePath("/services");
  revalidatePath("/cash-out");
  revalidatePath("/daily-report");
  revalidatePath("/");

  const paymentLabel =
    parsed.data.paymentMethod === "momo" ? "MoMo" : "Cash";
  if (lines.length === 1) {
    return { success: `Recorded ${lines[0].name} · ${paymentLabel}.` };
  }
  return {
    success: `Recorded ${lines.length} services · ${paymentLabel}.`,
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
