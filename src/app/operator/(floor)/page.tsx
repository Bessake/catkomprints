import { OperatorStockOutForm } from "@/components/operator-stock-out-form";
import { ensureDefaultFloorStaff } from "@/lib/ensure-print-materials";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Stock out",
};

export default async function OperatorHomePage() {
  await ensureDefaultFloorStaff();
  const [products, staff] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      include: { category: true },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.floorStaff.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Stock out terminal</p>
          <h1>Record stock out</h1>
          <p className="muted" style={{ margin: "0.4rem 0 0" }}>
            Only active products from the admin Products page appear here.
            Select who is taking materials, then record the stock out.
          </p>
        </div>
      </div>

      <section className="panel operator-panel">
        {products.length === 0 ? (
          <p className="muted">
            No active products yet. Add products in the admin Products page,
            then return here to record stock out.
          </p>
        ) : (
          <OperatorStockOutForm
            products={products.map((product) => ({
              id: product.id,
              sku: product.sku,
              name: product.name,
              quantity: product.quantity,
              reorderLevel: product.reorderLevel,
              categoryName: product.category?.name || null,
            }))}
            staff={staff.map((member) => ({
              id: member.id,
              name: member.name,
            }))}
          />
        )}
      </section>
    </>
  );
}
