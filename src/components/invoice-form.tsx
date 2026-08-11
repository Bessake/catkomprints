"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import type { Client, Product } from "@prisma/client";
import { createInvoiceAction, type ActionState } from "@/app/front-desk-actions";
import { calcInvoiceTotals, calcLineTotal, formatCurrency } from "@/lib/utils";

type Line = {
  key: string;
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

const initialState: ActionState = null;

export function InvoiceForm({
  clients,
  products,
}: {
  clients: Client[];
  products: Product[];
}) {
  const [state, formAction, pending] = useActionState(
    createInvoiceAction,
    initialState,
  );
  const [taxRate, setTaxRate] = useState(8);
  const [lines, setLines] = useState<Line[]>([
    {
      key: crypto.randomUUID(),
      productId: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
    },
  ]);

  const totals = useMemo(
    () => calcInvoiceTotals(lines, taxRate),
    [lines, taxRate],
  );

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function applyProduct(key: string, productId: string) {
    const product = products.find((item) => item.id === productId);
    updateLine(key, {
      productId,
      description: product?.name || "",
      unitPrice: product?.unitPrice ?? 0,
    });
  }

  return (
    <form action={formAction} className="form-grid">
      {state?.error && <p className="error-text">{state.error}</p>}

      <div className="form-grid two">
        <label>
          Client
          <select name="clientId" required defaultValue="">
            <option value="" disabled>
              Select client
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Due date
          <input name="dueDate" type="date" />
        </label>
      </div>

      <div className="form-grid two">
        <label>
          Tax rate (%)
          <input
            name="taxRate"
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={taxRate}
            onChange={(event) => setTaxRate(Number(event.target.value) || 0)}
          />
        </label>
        <label>
          Save as
          <select name="status" defaultValue="draft">
            <option value="draft">Draft</option>
            <option value="sent">Sent (deduct stock)</option>
            <option value="paid">Paid (deduct stock)</option>
          </select>
        </label>
      </div>

      <label>
        Notes
        <textarea name="notes" placeholder="Optional invoice notes" />
      </label>

      <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th>Line total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.key}>
                  <td>
                    <select
                      name="itemProductId"
                      value={line.productId}
                      onChange={(event) =>
                        applyProduct(line.key, event.target.value)
                      }
                    >
                      <option value="">Custom line</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({product.sku})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      name="itemDescription"
                      required
                      value={line.description}
                      onChange={(event) =>
                        updateLine(line.key, {
                          description: event.target.value,
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      name="itemQuantity"
                      type="number"
                      min={1}
                      required
                      value={line.quantity}
                      onChange={(event) =>
                        updateLine(line.key, {
                          quantity: Number(event.target.value) || 0,
                        })
                      }
                      style={{ width: "5.5rem" }}
                    />
                  </td>
                  <td>
                    <input
                      name="itemUnitPrice"
                      type="number"
                      min={0}
                      step="0.01"
                      required
                      value={line.unitPrice}
                      onChange={(event) =>
                        updateLine(line.key, {
                          unitPrice: Number(event.target.value) || 0,
                        })
                      }
                      style={{ width: "7rem" }}
                    />
                  </td>
                  <td>
                    {formatCurrency(
                      calcLineTotal(line.quantity, line.unitPrice),
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() =>
                        setLines((current) =>
                          current.length === 1
                            ? current
                            : current.filter((item) => item.key !== line.key),
                        )
                      }
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="actions">
        <button
          type="button"
          className="button secondary"
          onClick={() =>
            setLines((current) => [
              ...current,
              {
                key: crypto.randomUUID(),
                productId: "",
                description: "",
                quantity: 1,
                unitPrice: 0,
              },
            ])
          }
        >
          Add line
        </button>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="stat-card">
          <span className="muted">Subtotal</span>
          <strong>{formatCurrency(totals.subtotal)}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Tax</span>
          <strong>{formatCurrency(totals.taxAmount)}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Total</span>
          <strong>{formatCurrency(totals.total)}</strong>
        </div>
      </div>

      <button type="submit" className="button" disabled={pending}>
        {pending ? "Creating…" : "Create invoice"}
      </button>
    </form>
  );
}
