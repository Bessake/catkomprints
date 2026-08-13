"use client";

import { useActionState } from "react";
import {
  sendDailyReportAction,
  type ReportActionState,
} from "@/app/report-actions";

const initialState: ReportActionState = null;

export function DailyReportForm({
  recorderName,
  alreadySent,
  defaultNotes,
}: {
  recorderName: string;
  alreadySent: boolean;
  defaultNotes: string;
}) {
  const [state, formAction, pending] = useActionState(
    sendDailyReportAction,
    initialState,
  );

  return (
    <form action={formAction} className="form-grid">
      {state?.error && <p className="error-text">{state.error}</p>}
      {state?.success && <div className="success-banner">{state.success}</div>}

      <div className="success-banner recording-as">
        Sending as: <strong>{recorderName}</strong>
      </div>

      <label>
        Notes for the manager (optional)
        <textarea
          name="notes"
          defaultValue={defaultNotes}
          maxLength={2000}
          rows={4}
          placeholder="Anything the manager should know: leftover jobs, issues, stock that ran out…"
        />
      </label>

      <button type="submit" className="button" disabled={pending}>
        {pending
          ? "Sending…"
          : alreadySent
            ? "Update today’s report"
            : "Send today’s report"}
      </button>
    </form>
  );
}
