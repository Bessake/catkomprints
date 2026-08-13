"use server";

import { revalidatePath } from "next/cache";
import { MovementType } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type OperatorActionState = {
  error?: string;
  success?: string;
} | null;

async function requireFloorAccess() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (
    session.user.role !== "operator" &&
    session.user.role !== "admin" &&
    session.user.role !== "staff"
  ) {
    throw new Error("Unauthorized");
  }
  return session;
}

async function requireAdminAccess() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "admin" && session.user.role !== "staff") {
    throw new Error("Unauthorized");
  }
  return session;
}

const stockOutSchema = z.object({
  productId: z.string().min(1),
  takenById: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  note: z.string().trim().max(300).optional().default(""),
  stockOutDate: z.string().optional(),
  stockOutTime: z.string().optional(),
});

export async function operatorStockOutAction(
  _prev: OperatorActionState,
  formData: FormData,
): Promise<OperatorActionState> {
  const session = await requireFloorAccess();

  const parsed = stockOutSchema.safeParse({
    productId: formData.get("productId"),
    takenById: formData.get("takenById"),
    quantity: formData.get("quantity"),
    note: formData.get("note") || "",
    stockOutDate: formData.get("stockOutDate") || undefined,
    stockOutTime: formData.get("stockOutTime") || undefined,
  });

  if (!parsed.success) {
    return {
      error: "Select material, staff name, and a valid quantity.",
    };
  }

  const [product, staffMember] = await Promise.all([
    prisma.product.findUnique({ where: { id: parsed.data.productId } }),
    prisma.floorStaff.findUnique({ where: { id: parsed.data.takenById } }),
  ]);

  if (!product || !product.active) {
    return { error: "Material not found or inactive." };
  }

  if (!staffMember || !staffMember.active) {
    return { error: "Select a valid staff member." };
  }

  if (parsed.data.quantity > product.quantity) {
    return {
      error: `Not enough stock. On hand: ${product.quantity}.`,
    };
  }

  const stampedAt =
    parsed.data.stockOutDate && parsed.data.stockOutTime
      ? new Date(`${parsed.data.stockOutDate}T${parsed.data.stockOutTime}`)
      : new Date();
  const occurredAt = Number.isNaN(stampedAt.getTime()) ? new Date() : stampedAt;

  const stampLabel = new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(occurredAt);

  const baseNote =
    parsed.data.note || `Stock out recorded on floor terminal`;
  const note = `${baseNote} · Taken by ${staffMember.name} · ${stampLabel}`;

  await prisma.$transaction([
    prisma.product.update({
      where: { id: product.id },
      data: { quantity: product.quantity - parsed.data.quantity },
    }),
    prisma.stockMovement.create({
      data: {
        productId: product.id,
        type: MovementType.out,
        quantity: parsed.data.quantity,
        note,
        takenById: staffMember.id,
        createdById: session.user.id,
        createdAt: occurredAt,
      },
    }),
  ]);

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath(`/products/${product.id}`);
  revalidatePath("/movements");
  revalidatePath("/operator");
  revalidatePath("/operator/history");
  revalidatePath("/stock-out");
  revalidatePath("/staff");
  revalidatePath("/daily-report");

  return {
    success: `Recorded ${parsed.data.quantity} × ${product.name} taken by ${staffMember.name} at ${stampLabel}.`,
  };
}

export async function createFloorStaffAction(
  _prev: OperatorActionState,
  formData: FormData,
): Promise<OperatorActionState> {
  await requireAdminAccess();
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Staff name is required." };

  try {
    await prisma.floorStaff.create({ data: { name } });
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return { error: "That staff name already exists." };
    }
    throw error;
  }

  revalidatePath("/staff");
  revalidatePath("/operator");
  return { success: "Staff member added." };
}

export async function toggleFloorStaffAction(staffId: string) {
  await requireAdminAccess();
  const staff = await prisma.floorStaff.findUnique({ where: { id: staffId } });
  if (!staff) return;
  await prisma.floorStaff.update({
    where: { id: staffId },
    data: { active: !staff.active },
  });
  revalidatePath("/staff");
  revalidatePath("/operator");
}

export async function deleteFloorStaffAction(staffId: string) {
  await requireAdminAccess();
  await prisma.floorStaff.delete({ where: { id: staffId } });
  revalidatePath("/staff");
  revalidatePath("/operator");
  revalidatePath("/movements");
}
