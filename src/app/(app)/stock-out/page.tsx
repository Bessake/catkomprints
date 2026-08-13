import { DeskProductForm } from "@/components/desk-product-form";
import { DeskStockInForm } from "@/components/desk-stock-in-form";
import { OperatorStockOutForm } from "@/components/operator-stock-out-form";
import { ensureDefaultFloorStaff } from "@/lib/ensure-print-materials";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Stock" };

export default async function FrontDeskStockOutPage() {
  await ensureDefaultFloorStaff();
  const [products, staff, categories] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      include: { category: true },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.floorStaff.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  const productOptions = products.map((product) => ({
    id: product.id,
    sku: product.sku,
    name: product.name,
    quantity: product.quantity,
    reorderLevel: product.reorderLevel,
    categoryName: product.category?.name || null,
  }));

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Front desk</p>
          <h1>Stock</h1>
          <p className="muted" style={{ margin: "0.4rem 0 0" }}>
            Record stock in or stock out, and add a product so it appears in
            the dropdowns.
          </p>
        </div>
      </div>

      <div className="detail-layout">
        <section className="panel">
          <h2>Record stock out</h2>
          {products.length === 0 ? (
            <p className="muted">
              No products yet. Add one below, then it will show in this
              dropdown.
            </p>
          ) : (
            <OperatorStockOutForm
              products={productOptions}
              staff={staff.map((member) => ({
                id: member.id,
                name: member.name,
              }))}
            />
          )}
        </section>

        <section className="panel">
          <h2>Record stock in</h2>
          {products.length === 0 ? (
            <p className="muted">
              No products yet. Add one below, then you can record stock in.
            </p>
          ) : (
            <DeskStockInForm products={productOptions} />
          )}
        </section>
      </div>

      <section className="panel" style={{ marginTop: "1.25rem" }}>
        <h2>Add product</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          New products are active immediately and appear in the stock in and
          stock out menus.
        </p>
        <DeskProductForm
          categories={categories.map((category) => ({
            id: category.id,
            name: category.name,
          }))}
        />
      </section>
    </>
  );
}
