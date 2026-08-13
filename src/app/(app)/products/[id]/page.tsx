import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteProductAction } from "@/app/actions";
import { ProductForm } from "@/components/product-form";
import { StockMovementForm } from "@/components/stock-movement-form";
import { prisma } from "@/lib/prisma";
import {
  formatCurrency,
  formatDate,
  isLowStock,
  movementTypeLabels,
} from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  return { title: product?.name || "Product" };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        movements: {
          take: 20,
          orderBy: { createdAt: "desc" },
          include: { createdBy: true },
        },
      },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!product) notFound();

  const low = isLowStock(product.quantity, product.reorderLevel);
  const deleteAction = deleteProductAction.bind(null, product.id);

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Product</p>
          <h1>{product.name}</h1>
          <p className="muted" style={{ margin: "0.4rem 0 0" }}>
            {product.category?.name || "Uncategorized"} ·{" "}
            {product.active ? "Active" : "Inactive"}
            {low ? " · Low stock" : ""}
          </p>
        </div>
        <div className="actions">
          <Link href="/products" className="button secondary">
            Back
          </Link>
          <form action={deleteAction}>
            <button type="submit" className="button danger">
              Delete
            </button>
          </form>
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className={`stat-card${low ? " warn" : ""}`}>
          <span className="muted">On hand</span>
          <strong>{product.quantity}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Unit price</span>
          <strong>{formatCurrency(product.unitPrice)}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Cost / reorder</span>
          <strong>
            {formatCurrency(product.costPrice)} / {product.reorderLevel}
          </strong>
        </div>
      </div>

      <div className="detail-layout">
        <section className="panel">
          <h2>Product details</h2>
          <ProductForm categories={categories} product={product} />
        </section>

        <div className="stack">
          <section className="panel">
            <h2>Adjust stock</h2>
            <StockMovementForm
              productId={product.id}
              currentQuantity={product.quantity}
            />
          </section>

          <section className="panel">
            <h2>Recent movements</h2>
            {product.movements.length === 0 ? (
              <p className="muted">No movements yet.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Type</th>
                      <th>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.movements.map((move) => (
                      <tr key={move.id}>
                        <td>
                          {formatDate(move.createdAt)}
                          {move.note ? (
                            <div
                              className="muted"
                              style={{ fontSize: "0.82rem" }}
                            >
                              {move.note}
                            </div>
                          ) : null}
                        </td>
                        <td>
                          <span className={`badge ${move.type}`}>
                            {movementTypeLabels[move.type]}
                          </span>
                        </td>
                        <td>{move.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
