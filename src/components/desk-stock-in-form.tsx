"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  recordDeskStockInAction,
  type ActionState,
} from "@/app/actions";
import { isLowStock } from "@/lib/utils";

type ProductOption = {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  reorderLevel: number;
  categoryName: string | null;
};

const initialState: ActionState = null;

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

export function DeskStockInForm({ products }: { products: ProductOption[] }) {
  const sorted = useMemo(() => {
    return [...products].sort((a, b) => {
      const cat = (a.categoryName || "").localeCompare(b.categoryName || "");
      if (cat !== 0) return cat;
      return a.name.localeCompare(b.name);
    });
  }, [products]);

  const [state, formAction, pending] = useActionState(
    recordDeskStockInAction,
    initialState,
  );
  const [productId, setProductId] = useState(sorted[0]?.id || "");
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

  return (
    <form action={formAction} className="form-grid">
      {state?.error && <p className="error-text">{state.error}</p>}
      {state?.success && <div className="success-banner">{state.success}</div>}

      <label>
        Product
        <select
          name="productId"
          required
          value={productId}
          onChange={(event) => setProductId(event.target.value)}
        >
          <option value="" disabled>
            Select product
          </option>
          {sorted.map((product) => {
            const label = product.categoryName
              ? `${product.categoryName} — ${product.name} (${product.sku})`
              : `${product.name} (${product.sku})`;
            return (
              <option key={product.id} value={product.id}>
                {label} · {product.quantity} on hand
              </option>
            );
          })}
        </select>
      </label>

      {selected ? (
        <div
          className={`stat-card${
            isLowStock(selected.quantity, selected.reorderLevel) ? " warn" : ""
          }`}
        >
          <span className="muted">On hand</span>
          <strong>{selected.quantity}</strong>
        </div>
      ) : null}

      <div className="form-grid two">
        <label>
          Quantity in
          <input name="quantity" type="number" min={1} required defaultValue={1} />
        </label>
        <label>
          Note
          <input name="note" placeholder="Optional supplier or job" />
        </label>
      </div>

      <div className="form-grid two">
        <label>
          Date
          <input name="stockInDate" type="date" value={dateValue} readOnly />
        </label>
        <label>
          Time
          <input
            name="stockInTime"
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
        disabled={pending || !productId}
      >
        {pending ? "Recording…" : "Record stock in"}
      </button>
    </form>
  );
}
