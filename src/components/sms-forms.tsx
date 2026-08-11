"use client";

import { useActionState } from "react";
import {
  broadcastSmsAction,
  sendPaymentRemindersAction,
  type ActionState,
} from "@/app/front-desk-actions";
import type { Invoice, Client } from "@prisma/client";
import { formatCurrency, formatDateShort, invoiceStatusLabels } from "@/lib/utils";

const initialState: ActionState = null;

export function BroadcastForm() {
  const [state, formAction, pending] = useActionState(
    broadcastSmsAction,
    initialState,
  );

  return (
    <form action={formAction} className="form-grid">
      {state?.error && <p className="error-text">{state.error}</p>}
      {state?.success && <div className="success-banner">{state.success}</div>}
      <label>
        Audience
        <select name="audience" defaultValue="with_phone">
          <option value="with_phone">All clients with a phone number</option>
        </select>
      </label>
      <label>
        Message
        <textarea
          name="body"
          required
          maxLength={480}
          placeholder="Store hours update, promo, or general notice…"
        />
      </label>
      <button type="submit" className="button" disabled={pending}>
        {pending ? "Sending…" : "Broadcast SMS"}
      </button>
    </form>
  );
}

export function PaymentReminderForm({
  invoices,
}: {
  invoices: (Invoice & { client: Client })[];
}) {
  const [state, formAction, pending] = useActionState(
    sendPaymentRemindersAction,
    initialState,
  );

  if (invoices.length === 0) {
    return (
      <p className="muted">
        No sent/overdue invoices with client phone numbers right now.
      </p>
    );
  }

  return (
    <form action={formAction} className="form-grid">
      {state?.error && <p className="error-text">{state.error}</p>}
      {state?.success && <div className="success-banner">{state.success}</div>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th />
              <th>Invoice</th>
              <th>Client</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>
                  <input
                    type="checkbox"
                    name="invoiceId"
                    value={invoice.id}
                    defaultChecked
                  />
                </td>
                <td>
                  {invoice.number}
                  {invoice.dueDate ? (
                    <div className="muted" style={{ fontSize: "0.82rem" }}>
                      Due {formatDateShort(invoice.dueDate)}
                    </div>
                  ) : null}
                </td>
                <td>
                  {invoice.client.name}
                  <div className="muted" style={{ fontSize: "0.82rem" }}>
                    {invoice.client.phone}
                  </div>
                </td>
                <td>{formatCurrency(invoice.total)}</td>
                <td>
                  <span className={`badge ${invoice.status}`}>
                    {invoiceStatusLabels[invoice.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <label>
        Custom note (optional)
        <textarea
          name="note"
          maxLength={480}
          placeholder="Leave blank to use the default payment reminder text"
        />
      </label>

      <button type="submit" className="button" disabled={pending}>
        {pending ? "Sending…" : "Send payment reminders"}
      </button>
    </form>
  );
}
