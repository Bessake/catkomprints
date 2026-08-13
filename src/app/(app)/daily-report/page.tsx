import { redirect } from "next/navigation";
import { DailyReportForm } from "@/components/daily-report-form";
import { DaySnapshotCards } from "@/components/day-snapshot-cards";
import { auth } from "@/lib/auth";
import { buildDaySnapshot } from "@/lib/day-report";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Daily report" };

export default async function DailyReportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const snapshot = await buildDaySnapshot();
  const existing = await prisma.dailyReport.findUnique({
    where: { reportDate: snapshot.reportDate },
    include: { submittedBy: true },
  });

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Front desk</p>
          <h1>Daily report</h1>
          <p className="muted" style={{ margin: "0.4rem 0 0" }}>
            Review today’s cash, MoMo, stock in, stock out, and cash out, then
            send it to the manager.
          </p>
        </div>
      </div>

      {existing ? (
        <div className="success-banner">
          Today’s report was sent by {existing.submittedBy?.name || "front desk"}{" "}
          at {formatDate(existing.submittedAt)}. Sending again updates it.
        </div>
      ) : (
        <p className="muted" style={{ marginTop: 0 }}>
          Report date: {snapshot.label} (Africa/Accra). Not sent yet.
        </p>
      )}

      <DaySnapshotCards snapshot={snapshot} />

      <section className="panel" style={{ marginTop: "1.25rem" }}>
        <h2>{existing ? "Update and resend" : "Send to manager"}</h2>
        <DailyReportForm
          recorderName={session.user.name || "Front desk"}
          alreadySent={Boolean(existing)}
          defaultNotes={existing?.notes || ""}
        />
      </section>
    </>
  );
}
