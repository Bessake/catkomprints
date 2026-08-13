import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, formatDateShort } from "@/lib/utils";

export const metadata = { title: "Daily reports" };

export default async function ReportsInboxPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/daily-report");

  const reports = await prisma.dailyReport.findMany({
    include: { submittedBy: true },
    orderBy: { reportDate: "desc" },
  });

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Manager</p>
          <h1>Daily reports</h1>
          <p className="muted" style={{ margin: "0.4rem 0 0" }}>
            End-of-day activity sent by front desk.
          </p>
        </div>
      </div>

      <section className="panel">
        {reports.length === 0 ? (
          <p className="muted">No daily reports have been sent yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>MoMo in</th>
                  <th>Cash in</th>
                  <th>Money out</th>
                  <th>Stock out</th>
                  <th>Stock in</th>
                  <th>Sent by</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <Link href={`/reports/${report.id}`}>
                        {formatDateShort(report.reportDate)}
                      </Link>
                      <div className="muted" style={{ fontSize: "0.85rem" }}>
                        {formatDate(report.submittedAt)}
                      </div>
                    </td>
                    <td>{formatCurrency(report.serviceMomoTotal)}</td>
                    <td>{formatCurrency(report.serviceCashTotal)}</td>
                    <td>
                      {formatCurrency(
                        report.cashOutMomoTotal + report.cashOutCashTotal,
                      )}
                    </td>
                    <td>{report.stockOutUnits}</td>
                    <td>{report.stockInUnits}</td>
                    <td>{report.submittedBy?.name || "—"}</td>
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
