"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  operatorStockOutAction,
  type OperatorActionState,
} from "@/app/operator/actions";
import { isLowStock } from "@/lib/utils";

type ProductOption = {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  reorderLevel: number;
  categoryName: string | null;
};

type StaffOption = {
  id: string;
  name: string;
};

const initialState: OperatorActionState = null;

function formatLocalDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export function OperatorStockOutForm({
  products,
  staff,
}: {
  products: ProductOption[];
  staff: StaffOption[];
}) {
  const sorted = useMemo(() => {
    return [...products].sort((a, b) => {
      const cat = (a.categoryName || "").localeCompare(b.categoryName || "");
      if (cat !== 0) return cat;
      return a.name.localeCompare(b.name);
    });
  }, [products]);

  const [state, formAction, pending] = useActionState(
    operatorStockOutAction,
    initialState,
  );
  const [productId, setProductId] = useState(sorted[0]?.id || "");
  const [takenById, setTakenById] = useState(staff[0]?.id || "");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!sorted.some((product) => product.id === productId)) {
      setProductId(sorted[0]?.id || "");
    }
  }, [sorted, productId]);

  const selected = sorted.find((product) => product.id === productId);
  const dateValue = now.toISOString().slice(0, 10);
  const timeValue = now.toTimeString().slice(0, 8);

  if (staff.length === 0) {
    return (
      <p className="muted">
        No staff names are set up yet. Ask an admin to add staff under Staff
        names, then return here to record stock out.
      </p>
    );
  }

  return (
    <form action={formAction} className="form-grid operator-form">
      {state?.error && <p className="error-text">{state.error}</p>}
      {state?.success && <div className="success-banner">{state.success}</div>}

      <label>
        Staff name
        <select
          name="takenById"
          required
          value={takenById}
          onChange={(event) => setTakenById(event.target.value)}
          className="operator-material-select"
        >
          <option value="" disabled>
            Who is taking the stock?
          </option>
          {staff.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Material type
        <select
          name="productId"
          required
          value={productId}
          onChange={(event) => setProductId(event.target.value)}
          className="operator-material-select"
        >
          <option value="" disabled>
            Select material
          </option>
          {sorted.map((product) => {
            const label = product.categoryName
              ? `${product.categoryName} — ${product.name}`
              : product.name;
            return (
              <option key={product.id} value={product.id}>
                {label} · {product.quantity} on hand
              </option>
            );
          })}
        </select>
      </label>

      {selected ? (
        <div className="operator-selected-stats">
          <div
            className={`stat-card${
              isLowStock(selected.quantity, selected.reorderLevel) ? " warn" : ""
            }`}
          >
            <span className="muted">On hand</span>
            <strong>{selected.quantity}</strong>
          </div>
        </div>
      ) : null}

      <div className="form-grid two">
        <label>
          Quantity
          <input
            name="quantity"
            type="number"
            min={1}
            max={selected?.quantity || undefined}
            required
            defaultValue={1}
            className="operator-qty"
          />
        </label>
        <label>
          Job / note
          <input name="note" placeholder="Optional job # or client" />
        </label>
      </div>

      <div className="form-grid two">
        <label>
          Date
          <input name="stockOutDate" type="date" value={dateValue} readOnly />
        </label>
        <label>
          Time
          <input
            name="stockOutTime"
            type="time"
            step={1}
            value={timeValue}
            readOnly
          />
        </label>
      </div>

      <p className="muted operator-datetime-hint">
        Date and time are filled automatically: {formatLocalDateTime(now)}
      </p>

      <button
        type="submit"
        className="button operator-submit"
        disabled={
          pending ||
          !productId ||
          !takenById ||
          !selected ||
          selected.quantity <= 0
        }
      >
        {pending ? "Recording…" : "Record stock out"}
      </button>
    </form>
  );
}
