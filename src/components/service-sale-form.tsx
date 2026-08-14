"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [costs, setCosts] = useState<Record<string, string>>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "cash" | "">("");
  const [momoName, setMomoName] = useState("");
  const [now, setNow] = useState(() => new Date());
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (state?.success) {
      setSelectedIds([]);
      setCosts({});
      setMenuOpen(false);
      setPaymentMethod("");
      setMomoName("");
    }
  }, [state]);

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointer(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, [menuOpen]);

  const selected = useMemo(
    () => services.filter((service) => selectedIds.includes(service.id)),
    [services, selectedIds],
  );

  const dateValue = now.toISOString().slice(0, 10);
  const timeValue = now.toTimeString().slice(0, 8);
  const summary =
    selected.length === 0
      ? "Select one or more services"
      : selected.length === 1
        ? selected[0].name
        : `${selected.length} services selected`;

  function toggleService(service: ServiceOption) {
    setSelectedIds((current) => {
      if (current.includes(service.id)) {
        setCosts((prev) => {
          const next = { ...prev };
          delete next[service.id];
          return next;
        });
        return current.filter((id) => id !== service.id);
      }
      if (service.defaultCost > 0) {
        setCosts((prev) => ({
          ...prev,
          [service.id]:
            prev[service.id] || String(service.defaultCost),
        }));
      }
      return [...current, service.id];
    });
  }

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

      <div className="multi-select" ref={menuRef}>
        <span>Services</span>
        <button
          type="button"
          className="dropdown-select multi-select-toggle"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {summary}
        </button>
        {menuOpen ? (
          <div className="multi-select-menu">
            {services.map((service) => {
              const checked = selectedIds.includes(service.id);
              return (
                <label key={service.id} className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleService(service)}
                  />
                  {service.name}
                </label>
              );
            })}
          </div>
        ) : null}
      </div>

      {selected.map((service) => (
        <input
          key={`id-${service.id}`}
          type="hidden"
          name="serviceIds"
          value={service.id}
        />
      ))}

      {selected.length > 0 ? (
        <div className="form-grid">
          {selected.map((service) => (
            <label key={service.id}>
              Cost for {service.name} (GH₵)
              <input
                name={`cost-${service.id}`}
                type="number"
                min={0}
                step="0.01"
                required
                value={costs[service.id] || ""}
                onChange={(event) =>
                  setCosts((prev) => ({
                    ...prev,
                    [service.id]: event.target.value,
                  }))
                }
                placeholder="0.00"
              />
            </label>
          ))}
        </div>
      ) : (
        <p className="muted" style={{ margin: 0 }}>
          Tick every job this client is taking, then enter a cost for each.
        </p>
      )}

      <label>
        Client name
        <input name="clientName" placeholder="Optional" />
      </label>

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

      <button
        type="submit"
        className="button"
        disabled={pending || selectedIds.length === 0}
      >
        {pending
          ? "Recording…"
          : selectedIds.length > 1
            ? `Record ${selectedIds.length} services`
            : "Record service"}
      </button>
    </form>
  );
}
