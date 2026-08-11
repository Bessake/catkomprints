import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate, movementTypeLabels } from "@/lib/utils";

export const metadata = {
  title: "Movements",
};

export default async function MovementsPage() {
  const movements = await prisma.stockMovement.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: {
      product: true,
      createdBy: true,
      takenBy: true,
    },
  });

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">History</p>
          <h1>Stock movements</h1>
        </div>
      </div>

      <section className="panel">
        {movements.length === 0 ? (
          <p className="muted">No movements recorded yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Taken by</th>
                  <th>Recorded by</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((move) => (
                  <tr key={move.id}>
                    <td>{formatDate(move.createdAt)}</td>
                    <td>
                      <Link href={`/products/${move.productId}`}>
                        {move.product.name}
                      </Link>
                      <div className="muted" style={{ fontSize: "0.85rem" }}>
                        {move.product.sku}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${move.type}`}>
                        {movementTypeLabels[move.type]}
                      </span>
                    </td>
                    <td>{move.quantity}</td>
                    <td>{move.takenBy?.name || "—"}</td>
                    <td>{move.createdBy?.name || "—"}</td>
                    <td>{move.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
