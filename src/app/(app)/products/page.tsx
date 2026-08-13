import Link from "next/link";
import { deleteProductAction } from "@/app/actions";
import { ensureDefaultPrintMaterials } from "@/lib/ensure-print-materials";
import { prisma } from "@/lib/prisma";
import { formatCurrency, isLowStock } from "@/lib/utils";

export const metadata = {
  title: "Products",
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  await ensureDefaultPrintMaterials();
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const filter = params.filter || "all";

  const products = await prisma.product.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { name: { contains: q } },
                { sku: { contains: q } },
              ],
            }
          : {},
        filter === "active" ? { active: true } : {},
        filter === "inactive" ? { active: false } : {},
      ],
    },
    include: { category: true },
    orderBy: { name: "asc" },
  });

  const visible =
    filter === "low"
      ? products.filter((p) => isLowStock(p.quantity, p.reorderLevel))
      : products;

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1>Products</h1>
        </div>
        <Link href="/products/new" className="button">
          Add product
        </Link>
      </div>

      <div className="filters">
        <form method="get">
          <label>
            Search
            <input
              name="q"
              defaultValue={q}
              placeholder="Name or SKU"
            />
          </label>
          <label>
            Filter
            <select name="filter" defaultValue={filter}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="low">Low stock</option>
            </select>
          </label>
          <button type="submit" className="button secondary">
            Apply
          </button>
        </form>
      </div>

      <section className="panel">
        {visible.length === 0 ? (
          <p className="muted">No products match this view.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Qty</th>
                  <th>Unit price (GH₵)</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((product) => {
                  const low = isLowStock(product.quantity, product.reorderLevel);
                  const remove = deleteProductAction.bind(null, product.id);
                  return (
                    <tr key={product.id}>
                      <td>
                        <Link href={`/products/${product.id}`}>
                          {product.name}
                        </Link>
                        <div className="muted" style={{ fontSize: "0.85rem" }}>
                          {product.sku}
                        </div>
                      </td>
                      <td>{product.category?.name || "—"}</td>
                      <td>
                        <span
                          className={`badge ${
                            product.quantity === 0
                              ? "out"
                              : low
                                ? "low"
                                : ""
                          }`}
                        >
                          {product.quantity}
                        </span>
                      </td>
                      <td>{formatCurrency(product.unitPrice)}</td>
                      <td>
                        {product.active ? (
                          <span className="badge">Active</span>
                        ) : (
                          <span className="badge inactive">Inactive</span>
                        )}
                      </td>
                      <td>
                        <form action={remove}>
                          <button type="submit" className="button danger">
                            Delete
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
