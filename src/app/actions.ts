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
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().default(""),
  reorderLevel: z.coerce.number().int().min(0),
  unitPrice: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0),
  categoryId: z.string().optional(),
  active: z.coerce.boolean().optional().default(true),
});

export type ActionState = { error?: string; success?: string } | null;

function skuFromName(name: string) {
  const slug = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 20);
  const suffix = Date.now().toString(36).toUpperCase().slice(-6);
  return `${slug || "ITEM"}-${suffix}`;
}

export async function createProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  const parsed = productSchema.safeParse({
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
          sku: skuFromName(parsed.data.name),
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
      return { error: "Could not add that product. Try again." };
    }
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/movements");
  revalidatePath("/stock-out");
  revalidatePath("/operator");
  redirect(`/products/${productId}`);
}

const deskProductSchema = z.object({
  name: z.string().trim().min(1).max(120),
  categoryId: z.string().optional(),
  initialQuantity: z.coerce.number().int().min(0).optional().default(0),
});

export async function createDeskProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  const parsed = deskProductSchema.safeParse({
    name: formData.get("name"),
    categoryId: formData.get("categoryId") || undefined,
    initialQuantity: formData.get("initialQuantity") || 0,
  });

  if (!parsed.success) {
    return { error: "Enter a product name and a quantity of 0 or more." };
  }

  const sku = skuFromName(parsed.data.name);
  const categoryId =
    parsed.data.categoryId && parsed.data.categoryId !== ""
      ? parsed.data.categoryId
      : null;
  const initialQty = parsed.data.initialQuantity;

  try {
    await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          sku,
          name: parsed.data.name,
          quantity: initialQty,
          reorderLevel: 10,
          unitPrice: 0,
          costPrice: 0,
          categoryId,
          active: true,
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
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return { error: "Could not add that product. Try again." };
    }
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/movements");
  revalidatePath("/stock-out");
  revalidatePath("/operator");
  revalidatePath("/daily-report");
  return {
    success: `${parsed.data.name} is now in the product list.`,
  };
}

const deskStockInSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  note: z.string().trim().max(500).optional().default(""),
  stockInDate: z.string().optional(),
  stockInTime: z.string().optional(),
});

export async function recordDeskStockInAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  const parsed = deskStockInSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
    note: formData.get("note") || "",
    stockInDate: formData.get("stockInDate") || undefined,
    stockInTime: formData.get("stockInTime") || undefined,
  });

  if (!parsed.success) {
    return { error: "Select a product and a quantity of 1 or more." };
  }

  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
  });
  if (!product || !product.active) {
    return { error: "That product is not available. Pick another from the list." };
  }

  const stampedAt =
    parsed.data.stockInDate && parsed.data.stockInTime
      ? new Date(`${parsed.data.stockInDate}T${parsed.data.stockInTime}`)
      : new Date();
  const occurredAt = Number.isNaN(stampedAt.getTime()) ? new Date() : stampedAt;

  await prisma.$transaction([
    prisma.product.update({
      where: { id: product.id },
      data: { quantity: product.quantity + parsed.data.quantity },
    }),
    prisma.stockMovement.create({
      data: {
        productId: product.id,
        type: MovementType.in,
        quantity: parsed.data.quantity,
        note: parsed.data.note || "Stock in recorded at front desk",
        createdById: session.user.id,
        createdAt: occurredAt,
      },
    }),
  ]);

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath(`/products/${product.id}`);
  revalidatePath("/movements");
  revalidatePath("/stock-out");
  revalidatePath("/operator");
  revalidatePath("/daily-report");
  return {
    success: `Recorded ${parsed.data.quantity} × ${product.name} into stock.`,
  };
}

export async function updateProductAction(
  productId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSession();

  const parsed = productSchema.safeParse({
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
  revalidatePath("/stock-out");
  revalidatePath("/operator");
  return { success: "Product updated." };
}

export async function deleteProductAction(productId: string) {
  await requireSession();
  await prisma.product.delete({ where: { id: productId } });
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/movements");
  revalidatePath("/stock-out");
  revalidatePath("/operator");
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
  revalidatePath("/stock-out");
  revalidatePath("/operator");
  revalidatePath("/daily-report");
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
  revalidatePath("/stock-out");
  return { success: "Category added." };
}

export async function deleteCategoryAction(categoryId: string) {
  await requireSession();
  await prisma.category.delete({ where: { id: categoryId } });
  revalidatePath("/categories");
  revalidatePath("/products");
  revalidatePath("/stock-out");
  redirect("/categories");
}
