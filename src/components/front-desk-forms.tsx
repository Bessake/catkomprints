"use client";

import { useActionState } from "react";
import {
  sendClientSmsAction,
  updateInvoiceStatusAction,
  type ActionState,
} from "@/app/front-desk-actions";

const initialState: ActionState = null;

const invoiceStatuses = [
  "draft",
  "sent",
  "paid",
  "overdue",
  "cancelled",
] as const;

export function InvoiceStatusForm({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: (typeof invoiceStatuses)[number];
}) {
  const action = updateInvoiceStatusAction.bind(null, invoiceId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="form-grid">
      {state?.error && <p className="error-text">{state.error}</p>}
      {state?.success && <div className="success-banner">{state.success}</div>}
      <label>
        Status
        <select name="status" defaultValue={status}>
          {invoiceStatuses.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="button" disabled={pending}>
        {pending ? "Updating…" : "Update status"}
      </button>
    </form>
  );
}

export function ClientSmsForm({ clientId }: { clientId: string }) {
  const action = sendClientSmsAction.bind(null, clientId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="form-grid">
      {state?.error && <p className="error-text">{state.error}</p>}
      {state?.success && <div className="success-banner">{state.success}</div>}
      <label>
        SMS message
        <textarea name="body" required maxLength={480} />
      </label>
      <button type="submit" className="button" disabled={pending}>
        {pending ? "Sending…" : "Send SMS"}
      </button>
    </form>
  );
}
