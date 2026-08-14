"use client";

import { useActionState, useEffect, useState } from "react";
import {
  updateDeskStockInAction,
  type ActionState,
} from "@/app/actions";
import { formatDate } from "@/lib/utils";

type ProductOption = {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  categoryName: string | null;
};

export type StockInRecord = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  note: string;
  recordedBy: string;
  createdAt: string;
};

const initialState: ActionState = null;

function StockInEditForm({
  record,
  products,
  onCancel,
}: {
  record: StockInRecord;
  products: ProductOption[];
  onCancel: () => void;
}) {
  const action = updateDeskStockInAction.bind(null, record.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const options = products.some((product) => product.id === record.productId)
    ? products
    : [
        {
          id: record.productId,
          sku: record.sku,
          name: record.productName,
          quantity: 0,
          categoryName: null,
        },
        ...products,
      ];

  useEffect(() => {
    if (state?.success) onCancel();
  }, [state, onCancel]);

  return (
    <form action={formAction} className="form-grid">
      {state?.error && <p className="error-text">{state.error}</p>}
      {state?.success && <div className="success-banner">{state.success}</div>}

      <label>
        Product
        <select
          name="productId"
          required
          defaultValue={record.productId}
          className="dropdown-select"
        >
          {options.map((product) => {
            const label = product.categoryName
              ? `${product.categoryName} — ${product.name}`
              : product.name;
            return (
              <option key={product.id} value={product.id}>
                {label}
              </option>
            );
          })}
        </select>
      </label>

      <div className="form-grid two">
        <label>
          Quantity in
          <input
            name="quantity"
            type="number"
            min={1}
            required
            defaultValue={record.quantity}
          />
        </label>
        <label>
          Note
          <input name="note" defaultValue={record.note} />
        </label>
      </div>

      <div className="actions">
        <button type="submit" className="button" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function DeskStockInHistory({
  records,
  products,
}: {
  records: StockInRecord[];
  products: ProductOption[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (records.length === 0) {
    return <p className="muted">No stock in recorded yet.</p>;
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Date & time</th>
            <th>Product</th>
            <th>Qty</th>
            <th>Note</th>
            <th>Recorded by</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const editing = editingId === record.id;
            return (
              <tr key={record.id}>
                {editing ? (
                  <td colSpan={6}>
                    <StockInEditForm
                      record={record}
                      products={products}
                      onCancel={() => setEditingId(null)}
                    />
                  </td>
                ) : (
                  <>
                    <td>{formatDate(record.createdAt)}</td>
                    <td>
                      {record.productName}
                      <div className="muted" style={{ fontSize: "0.85rem" }}>
                        {record.sku}
                      </div>
                    </td>
                    <td>{record.quantity}</td>
                    <td>{record.note || "—"}</td>
                    <td>{record.recordedBy || "—"}</td>
                    <td>
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => setEditingId(record.id)}
                      >
                        Edit
                      </button>
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
