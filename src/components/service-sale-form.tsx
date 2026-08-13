"use client";

import { useActionState, useEffect, useState } from "react";
import {
  recordServiceSaleAction,
  type ServiceActionState,
} from "@/app/service-actions";

type ServiceOption = {
  id: string;
  name: string;
  defaultCost: number;
};

const initialState: ServiceActionState = null;

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

export function ServiceSaleForm({
  services,
  recorderName,
}: {
  services: ServiceOption[];
  recorderName: string;
}) {
  const [state, formAction, pending] = useActionState(
    recordServiceSaleAction,
    initialState,
  );
  const [serviceId, setServiceId] = useState("");
  const [cost, setCost] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "cash" | "">("");
  const [momoName, setMomoName] = useState("");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (state?.success) {
      setServiceId("");
      setCost("");
      setPaymentMethod("");
      setMomoName("");
    }
  }, [state]);

  const dateValue = now.toISOString().slice(0, 10);
  const timeValue = now.toTimeString().slice(0, 8);

  if (services.length === 0) {
    return (
      <p className="muted">
        No services are active yet. Add one in the list on the right, then
        record jobs here.
      </p>
    );
  }

  return (
    <form action={formAction} className="form-grid">
      {state?.error && <p className="error-text">{state.error}</p>}
      {state?.success && <div className="success-banner">{state.success}</div>}

      <div className="success-banner recording-as">
        Recording as: <strong>{recorderName}</strong>
      </div>

      <label>
        Service
        <select
          name="serviceId"
          required
          value={serviceId}
          onChange={(event) => {
            const nextId = event.target.value;
            setServiceId(nextId);
            const selected = services.find((service) => service.id === nextId);
            if (selected && selected.defaultCost > 0) {
              setCost(String(selected.defaultCost));
            }
          }}
        >
          <option value="" disabled>
            Select a printing service
          </option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
      </label>

      <div className="form-grid two">
        <label>
          Cost (GH₵)
          <input
            name="cost"
            type="number"
            min={0}
            step="0.01"
            required
            value={cost}
            onChange={(event) => setCost(event.target.value)}
            placeholder="0.00"
          />
        </label>
        <label>
          Client name
          <input name="clientName" placeholder="Optional" />
        </label>
      </div>

      <fieldset className="payment-fieldset">
        <legend>How did the client pay?</legend>
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

      {paymentMethod === "momo" ? (
        <label>
          MoMo name
          <input
            name="momoName"
            required
            value={momoName}
            onChange={(event) => setMomoName(event.target.value)}
            placeholder="Name on the MoMo payment"
          />
        </label>
      ) : null}

      <label>
        Note
        <input name="note" placeholder="Optional job details" />
      </label>

      <div className="form-grid two">
        <label>
          Date
          <input name="servedDate" type="date" value={dateValue} readOnly />
        </label>
        <label>
          Time
          <input
            name="servedTime"
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

      <button type="submit" className="button" disabled={pending || !serviceId}>
        {pending ? "Recording…" : "Record service"}
      </button>
    </form>
  );
}
