"use server";

import { revalidatePath } from "next/cache";
import { MovementType } from "@prisma/client";
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
  serviceIds: z.array(z.string().min(1)).optional().default([]),
  productIds: z.array(z.string().min(1)).optional().default([]),
  paymentMethod: z.enum(["momo", "cash"]),
  clientName: z.string().trim().max(120).optional().default(""),
  momoName: z.string().trim().max(120).optional().default(""),
  note: z.string().trim().max(500).optional().default(""),
  servedDate: z.string().min(1),
  servedTime: z.string().min(1),
});

function revalidateSalePaths() {
  revalidatePath("/services");
  revalidatePath("/cash-out");
  revalidatePath("/daily-report");
  revalidatePath("/stock-out");
  revalidatePath("/movements");
  revalidatePath("/products");
  revalidatePath("/operator");
  revalidatePath("/");
}

export async function recordServiceSaleAction(
  _prev: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const session = await requireSession();

  const parsed = saleSchema.safeParse({
    serviceIds: formData.getAll("serviceIds").map(String).filter(Boolean),
    productIds: formData.getAll("productIds").map(String).filter(Boolean),
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
        "Select services and/or materials, enter costs, and whether the client paid MoMo or cash.",
    };
  }

  const serviceIds = [...new Set(parsed.data.serviceIds)];
  const productIds = [...new Set(parsed.data.productIds)];
  if (serviceIds.length === 0 && productIds.length === 0) {
    return {
      error: "Select at least one service or one material to record.",
    };
  }

  if (parsed.data.paymentMethod === "momo" && !parsed.data.momoName) {
    return { error: "Enter the MoMo name that appeared on the payment." };
  }

  const servedAt = new Date(
    `${parsed.data.servedDate}T${parsed.data.servedTime}`,
  );
  if (Number.isNaN(servedAt.getTime())) {
    return { error: "Date and time look invalid. Try again." };
  }

  const [catalog, products] = await Promise.all([
    serviceIds.length
      ? prisma.pressService.findMany({
          where: { id: { in: serviceIds }, active: true },
        })
      : Promise.resolve([]),
    productIds.length
      ? prisma.product.findMany({
          where: { id: { in: productIds }, active: true },
        })
      : Promise.resolve([]),
  ]);

  if (catalog.length !== serviceIds.length) {
    return {
      error: "One of those services is not available. Pick again from the list.",
    };
  }
  if (products.length !== productIds.length) {
    return {
      error: "One of those materials is not available. Pick again from the list.",
    };
  }

  const serviceLines: { serviceId: string; name: string; cost: number }[] = [];
  for (const service of catalog) {
    const cost = Number(formData.get(`cost-${service.id}`));
    if (!Number.isFinite(cost) || cost < 0) {
      return { error: `Enter a cost for ${service.name}.` };
    }
    serviceLines.push({ serviceId: service.id, name: service.name, cost });
  }

  const materialLines: {
    productId: string;
    name: string;
    quantity: number;
    cost: number;
  }[] = [];
  for (const product of products) {
    const quantity = Number(formData.get(`qty-${product.id}`));
    const cost = Number(formData.get(`material-cost-${product.id}`));
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { error: `Enter a quantity of 1 or more for ${product.name}.` };
    }
    if (!Number.isFinite(cost) || cost < 0) {
      return { error: `Enter a selling price for ${product.name}.` };
    }
    if (quantity > product.quantity) {
      return {
        error: `${product.name} has only ${product.quantity} on hand.`,
      };
    }
    materialLines.push({
      productId: product.id,
      name: product.name,
      quantity,
      cost,
    });
  }

  const shared = {
    paymentMethod: parsed.data.paymentMethod,
    clientName: parsed.data.clientName,
    momoName:
      parsed.data.paymentMethod === "momo" ? parsed.data.momoName : "",
    note: parsed.data.note,
    servedAt,
    createdById: session.user.id,
  };

  try {
    await prisma.$transaction(async (tx) => {
      for (const line of serviceLines) {
        await tx.serviceSale.create({
          data: {
            serviceId: line.serviceId,
            cost: line.cost,
            quantity: 1,
            ...shared,
          },
        });
      }

      for (const line of materialLines) {
        const product = await tx.product.findUnique({
          where: { id: line.productId },
        });
        if (!product || !product.active) {
          throw new Error("MATERIAL");
        }
        if (line.quantity > product.quantity) {
          throw new Error(`STOCK:${product.name}:${product.quantity}`);
        }

        await tx.product.update({
          where: { id: product.id },
          data: { quantity: product.quantity - line.quantity },
        });
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: MovementType.out,
            quantity: line.quantity,
            note: parsed.data.note || "Sold at front desk",
            createdById: session.user.id,
            createdAt: servedAt,
          },
        });
        await tx.serviceSale.create({
          data: {
            productId: product.id,
            quantity: line.quantity,
            cost: line.cost,
            ...shared,
          },
        });
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("STOCK:")) {
      const [, name, qty] = error.message.split(":");
      return { error: `${name} has only ${qty} on hand.` };
    }
    if (error instanceof Error && error.message === "MATERIAL") {
      return {
        error: "One of those materials is not available. Pick again from the list.",
      };
    }
    throw error;
  }

  revalidateSalePaths();

  const paymentLabel =
    parsed.data.paymentMethod === "momo" ? "MoMo" : "Cash";
  const names = [
    ...serviceLines.map((line) => line.name),
    ...materialLines.map((line) => line.name),
  ];
  if (names.length === 1) {
    return { success: `Recorded ${names[0]} · ${paymentLabel}.` };
  }
  return {
    success: `Recorded ${names.length} items · ${paymentLabel}.`,
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
