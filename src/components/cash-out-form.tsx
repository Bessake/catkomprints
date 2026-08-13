"use client";

import { useActionState, useEffect, useState } from "react";
import {
  recordCashOutAction,
  type CashOutActionState,
} from "@/app/cash-out-actions";

const initialState: CashOutActionState = null;

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

export function CashOutForm({ recorderName }: { recorderName: string }) {
  const [state, formAction, pending] = useActionState(
    recordCashOutAction,
    initialState,
  );
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "cash" | "">("");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [momoName, setMomoName] = useState("");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (state?.success) {
      setPaymentMethod("");
      setAmount("");
      setPurpose("");
      setMomoName("");
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
          Amount taken out (GH₵)
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
        <fieldset className="payment-fieldset">
          <legend>Taken as</legend>
          <label className="checkbox-row">
            <input
              type="radio"
              name="paymentMethod"
              value="momo"
              required
              checked={paymentMethod === "momo"}
              onChange={() => setPaymentMethod("momo")}
            />
            MoMo
          </label>
          <label className="checkbox-row">
            <input
              type="radio"
              name="paymentMethod"
              value="cash"
              required
              checked={paymentMethod === "cash"}
              onChange={() => {
                setPaymentMethod("cash");
                setMomoName("");
              }}
            />
            Cash
          </label>
        </fieldset>
      </div>

      {paymentMethod === "momo" ? (
        <label>
          MoMo name
          <input
            name="momoName"
            required
            value={momoName}
            onChange={(event) => setMomoName(event.target.value)}
            placeholder="Name on the MoMo take-out"
          />
        </label>
      ) : null}

      <label>
        Purpose of cash / MoMo out
        <textarea
          name="purpose"
          required
          value={purpose}
          onChange={(event) => setPurpose(event.target.value)}
          placeholder="e.g. Buy A4 paper, fuel for delivery, pay courier"
          rows={3}
        />
      </label>

      <div className="form-grid two">
        <label>
          Date
          <input name="takenDate" type="date" value={dateValue} readOnly />
        </label>
        <label>
          Time
          <input
            name="takenTime"
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

      <button
        type="submit"
        className="button"
        disabled={
          pending ||
          !paymentMethod ||
          !amount ||
          !purpose.trim() ||
          (paymentMethod === "momo" && !momoName.trim())
        }
      >
        {pending ? "Recording…" : "Record take-out"}
      </button>
    </form>
  );
}
