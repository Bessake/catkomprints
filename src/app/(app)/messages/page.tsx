import { InvoiceStatus } from "@prisma/client";
import { BroadcastForm, PaymentReminderForm } from "@/components/sms-forms";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const [unpaidInvoices, recentMessages, twilioReady] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        status: { in: [InvoiceStatus.sent, InvoiceStatus.overdue] },
        client: { phone: { not: null } },
      },
      include: { client: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.smsMessage.findMany({
      take: 30,
      orderBy: { createdAt: "desc" },
      include: { client: true, invoice: true },
    }),
    Promise.resolve(
      Boolean(
        process.env.TWILIO_ACCOUNT_SID &&
          process.env.TWILIO_AUTH_TOKEN &&
          process.env.TWILIO_FROM_NUMBER,
      ),
    ),
  ]);

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Front desk</p>
          <h1>Messages</h1>
        </div>
      </div>

      <div className="success-banner" style={{ marginBottom: "1.25rem" }}>
        {twilioReady
          ? "Twilio is configured — SMS will send live."
          : "SMS is in demo mode (messages are logged, not delivered). Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER to .env for live SMS."}
      </div>

      <div className="detail-layout">
        <section className="panel">
          <h2>Broadcast to clients</h2>
          <BroadcastForm />
        </section>

        <section className="panel">
          <h2>Payment reminders</h2>
          <PaymentReminderForm invoices={unpaidInvoices} />
        </section>
      </div>

      <section className="panel" style={{ marginTop: "1rem" }}>
        <h2>Message log</h2>
        {recentMessages.length === 0 ? (
          <p className="muted">No SMS sent yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Kind</th>
                  <th>To</th>
                  <th>Status</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {recentMessages.map((message) => (
                  <tr key={message.id}>
                    <td>{formatDate(message.createdAt)}</td>
                    <td>
                      <span className="badge">{message.kind}</span>
                    </td>
                    <td>
                      {message.client?.name || message.toPhone}
                      {message.invoice ? (
                        <div className="muted" style={{ fontSize: "0.82rem" }}>
                          {message.invoice.number}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <span className={`badge ${message.status}`}>
                        {message.status}
                      </span>
                    </td>
                    <td>{message.body}</td>
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
