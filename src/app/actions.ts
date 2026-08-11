"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { MovementType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

const productSchema = z.object({
  sku: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().default(""),
  reorderLevel: z.coerce.number().int().min(0),
  unitPrice: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0),
  categoryId: z.string().optional(),
  active: z.coerce.boolean().optional().default(true),
});

export type ActionState = { error?: string; success?: string } | null;

export async function createProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  const parsed = productSchema.safeParse({
    sku: formData.get("sku"),
    name: formData.get("name"),
    description: formData.get("description") || "",
    reorderLevel: formData.get("reorderLevel"),
    unitPrice: formData.get("unitPrice"),
    costPrice: formData.get("costPrice"),
    categoryId: formData.get("categoryId") || undefined,
    active: formData.get("active") === "on",
  });

  if (!parsed.success) {
    return { error: "Check the product fields and try again." };
  }

  const initialQty = Number(formData.get("initialQuantity") || 0);
  if (!Number.isInteger(initialQty) || initialQty < 0) {
    return { error: "Initial quantity must be a non-negative whole number." };
  }

  const categoryId =
    parsed.data.categoryId && parsed.data.categoryId !== ""
      ? parsed.data.categoryId
      : null;

  let productId: string;
  try {
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          sku: parsed.data.sku.toUpperCase(),
          name: parsed.data.name,
          description: parsed.data.description,
          reorderLevel: parsed.data.reorderLevel,
          unitPrice: parsed.data.unitPrice,
          costPrice: parsed.data.costPrice,
          categoryId,
          active: parsed.data.active,
          quantity: initialQty,
        },
      });

      if (initialQty > 0) {
        await tx.stockMovement.create({
          data: {
            productId: created.id,
            type: MovementType.in,
            quantity: initialQty,
            note: "Initial stock",
            createdById: session.user.id,
          },
        });
      }

      return created;
    });
    productId = product.id;
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return { error: "A product with that SKU already exists." };
    }
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/movements");
  redirect(`/products/${productId}`);
}

export async function updateProductAction(
  productId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSession();

  const parsed = productSchema.safeParse({
    sku: formData.get("sku"),
    name: formData.get("name"),
    description: formData.get("description") || "",
    reorderLevel: formData.get("reorderLevel"),
    unitPrice: formData.get("unitPrice"),
    costPrice: formData.get("costPrice"),
    categoryId: formData.get("categoryId") || undefined,
    active: formData.get("active") === "on",
  });

  if (!parsed.success) {
    return { error: "Check the product fields and try again." };
  }

  const categoryId =
    parsed.data.categoryId && parsed.data.categoryId !== ""
      ? parsed.data.categoryId
      : null;

  try {
    await prisma.product.update({
      where: { id: productId },
      data: {
        sku: parsed.data.sku.toUpperCase(),
        name: parsed.data.name,
        description: parsed.data.description,
        reorderLevel: parsed.data.reorderLevel,
        unitPrice: parsed.data.unitPrice,
        costPrice: parsed.data.costPrice,
        categoryId,
        active: parsed.data.active,
      },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return { error: "A product with that SKU already exists." };
    }
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  return { success: "Product updated." };
}

export async function deleteProductAction(productId: string) {
  await requireSession();
  await prisma.product.delete({ where: { id: productId } });
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/movements");
  redirect("/products");
}

const movementSchema = z.object({
  type: z.enum(["in", "out", "adjust"]),
  quantity: z.coerce.number().int().positive(),
  note: z.string().trim().max(500).optional().default(""),
  newQuantity: z.coerce.number().int().min(0).optional(),
});

export async function recordMovementAction(
  productId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  const parsed = movementSchema.safeParse({
    type: formData.get("type"),
    quantity: formData.get("quantity"),
    note: formData.get("note") || "",
    newQuantity: formData.get("newQuantity") || undefined,
  });

  if (!parsed.success) {
    return { error: "Enter a valid movement quantity." };
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return { error: "Product not found." };

  let nextQty = product.quantity;
  let movementQty = parsed.data.quantity;
  const type = parsed.data.type as MovementType;

  if (type === MovementType.in) {
    nextQty = product.quantity + parsed.data.quantity;
  } else if (type === MovementType.out) {
    if (parsed.data.quantity > product.quantity) {
      return { error: "Cannot remove more stock than is available." };
    }
    nextQty = product.quantity - parsed.data.quantity;
  } else {
    if (parsed.data.newQuantity === undefined || Number.isNaN(parsed.data.newQuantity)) {
      return { error: "Set the new on-hand quantity for an adjustment." };
    }
    nextQty = parsed.data.newQuantity;
    movementQty = Math.abs(nextQty - product.quantity);
    if (movementQty === 0) {
      return { error: "New quantity is the same as current stock." };
    }
  }

  await prisma.$transaction([
    prisma.product.update({
      where: { id: productId },
      data: { quantity: nextQty },
    }),
    prisma.stockMovement.create({
      data: {
        productId,
        type,
        quantity: movementQty,
        note:
          type === MovementType.adjust
            ? `${parsed.data.note || "Stock count"} (set to ${nextQty})`
            : parsed.data.note,
        createdById: session.user.id,
      },
    }),
  ]);

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  revalidatePath("/movements");
  return { success: "Stock updated." };
}

export async function createCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSession();
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Category name is required." };

  try {
    await prisma.category.create({ data: { name } });
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return { error: "That category already exists." };
    }
    throw error;
  }

  revalidatePath("/categories");
  revalidatePath("/products");
  return { success: "Category added." };
}

export async function deleteCategoryAction(categoryId: string) {
  await requireSession();
  await prisma.category.delete({ where: { id: categoryId } });
  revalidatePath("/categories");
  revalidatePath("/products");
  redirect("/categories");
}
