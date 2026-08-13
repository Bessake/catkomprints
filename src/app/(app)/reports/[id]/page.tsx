import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DayActivityLists } from "@/components/day-activity-lists";
import { DaySnapshotCards } from "@/components/day-snapshot-cards";
import { auth } from "@/lib/auth";
import { buildDayActivity, parseDayActivity } from "@/lib/day-report";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateShort } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = await prisma.dailyReport.findUnique({ where: { id } });
  return {
    title: report
      ? `Report ${formatDateShort(report.reportDate)}`
      : "Daily report",
  };
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/daily-report");

  const { id } = await params;
  const report = await prisma.dailyReport.findUnique({
    where: { id },
    include: { submittedBy: true },
  });
  if (!report) notFound();

  const activity =
    parseDayActivity(report.activity) ??
    (await buildDayActivity(report.reportDate));

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Manager</p>
          <h1>{formatDateShort(report.reportDate)}</h1>
          <p className="muted" style={{ margin: "0.4rem 0 0" }}>
            Sent by {report.submittedBy?.name || "front desk"} at{" "}
            {formatDate(report.submittedAt)}.
          </p>
        </div>
        <Link href="/reports" className="button secondary">
          All reports
        </Link>
      </div>

      <DaySnapshotCards snapshot={report} />
      <DayActivityLists activity={activity} />

      <section className="panel" style={{ marginTop: "1.25rem" }}>
        <h2>Notes</h2>
        {report.notes.trim() ? (
          <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{report.notes}</p>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            No notes were added.
          </p>
        )}
      </section>
    </>
  );
}
