import Link from "next/link";
import { MovementType, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata = {
  title: "Stock out history",
};

export default async function OperatorHistoryPage() {
  const movements = await prisma.stockMovement.findMany({
    where: {
      type: MovementType.out,
      OR: [
        { takenById: { not: null } },
        { createdBy: { role: Role.operator } },
        { note: { contains: "Stock out recorded on floor" } },
        { note: { contains: "Taken by" } },
      ],
    },
    include: {
      product: true,
      createdBy: true,
      takenBy: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Stock out terminal</p>
          <h1>Recent stock outs</h1>
        </div>
        <Link href="/operator" className="button">
          New stock out
        </Link>
      </div>

      <section className="panel">
        {movements.length === 0 ? (
          <p className="muted">No stock outs recorded yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Material</th>
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
                      {move.product.name}
                      <div className="muted" style={{ fontSize: "0.85rem" }}>
                        {move.product.sku}
                      </div>
                    </td>
                    <td>
                      <span className="badge out">{move.quantity}</span>
                    </td>
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
