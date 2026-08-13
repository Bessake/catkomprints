import { prisma } from "@/lib/prisma";
import { DEFAULT_PRINT_MATERIALS } from "@/lib/print-materials";

export async function ensureDefaultFloorStaff() {
  const count = await prisma.floorStaff.count();
  if (count > 0) return;
  await prisma.floorStaff.createMany({
    data: [{ name: "Wendy" }, { name: "Yayra" }],
  });
}

export async function ensureDefaultPrintMaterials() {
  const count = await prisma.product.count();
  if (count > 0) return;

  const categoryNames = [...new Set(DEFAULT_PRINT_MATERIALS.map((item) => item.category))];
  const categories = await Promise.all(
    categoryNames.map((name) =>
      prisma.category.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );
  const categoryIdByName = new Map(categories.map((category) => [category.name, category.id]));

  await prisma.product.createMany({
    data: DEFAULT_PRINT_MATERIALS.map((item) => ({
      sku: item.sku,
      name: item.name,
      description: item.description,
      quantity: 100,
      reorderLevel: 10,
      unitPrice: 0,
      costPrice: 0,
      categoryId: categoryIdByName.get(item.category),
      active: true,
    })),
  });
}
