"use client";

import { useActionState, useEffect, useState } from "react";
import {
  recordDebtorAction,
  type DebtorActionState,
} from "@/app/debtor-actions";

const initialState: DebtorActionState = null;

function formatLocalDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Accra",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export function DebtorForm({ recorderName }: { recorderName: string }) {
  const [state, formAction, pending] = useActionState(
    recordDebtorAction,
    initialState,
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [note, setNote] = useState("");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (state?.success) {
      setName("");
      setPhone("");
      setAmount("");
      setPurpose("");
      setNote("");
    }
  }, [state]);

  const dateValue = now.toISOString().slice(0, 10);
  const timeValue = now.toTimeString().slice(0, 8);

  return (
    <form action={formAction} className="form-grid">
      {state?.error && <p className="error-text">{state.error}</p>}
      {state?.success && <div className="success-banner">{state.success}</div>}

      <div className="success-banner recording-as">
        Recording as: <strong>{recorderName}</strong>
      </div>

      <div className="form-grid two">
        <label>
          Debtor name
          <input
            name="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Customer name"
          />
        </label>
        <label>
          Phone
          <input
            name="phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Optional"
          />
        </label>
      </div>

      <div className="form-grid two">
        <label>
          Amount owed (GH₵)
          <input
            name="amount"
            type="number"
            min={0.01}
            step="0.01"
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
          />
        </label>
        <label>
          What they owe for
          <input
            name="purpose"
            required
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
            placeholder="e.g. Banner, 50 flyers"
          />
        </label>
      </div>

      <label>
        Note
        <input
          name="note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Optional extra details"
        />
      </label>

      <div className="form-grid two">
        <label>
          Date
          <input name="recordedDate" type="date" value={dateValue} readOnly />
        </label>
        <label>
          Time
          <input
            name="recordedTime"
            type="time"
            step={1}
            value={timeValue}
            readOnly
          />
        </label>
      </div>

      <p className="muted">
        Date and time are filled automatically: {formatLocalDateTime(now)}
      </p>

      <button type="submit" className="button" disabled={pending}>
        {pending ? "Recording…" : "Record debtor"}
      </button>
    </form>
  );
}
