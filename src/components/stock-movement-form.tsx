"use client";

import { useActionState, useState } from "react";
import { recordMovementAction, type ActionState } from "@/app/actions";

const initialState: ActionState = null;

export function StockMovementForm({
  productId,
  currentQuantity,
}: {
  productId: string;
  currentQuantity: number;
}) {
  const action = recordMovementAction.bind(null, productId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [type, setType] = useState<"in" | "out" | "adjust">("in");

  return (
    <form action={formAction} className="form-grid">
      {state?.error && <p className="error-text">{state.error}</p>}
      {state?.success && <div className="success-banner">{state.success}</div>}

      <label>
        Movement type
        <select
          name="type"
          value={type}
          onChange={(event) =>
            setType(event.target.value as "in" | "out" | "adjust")
          }
        >
          <option value="in">Stock in</option>
          <option value="out">Stock out</option>
          <option value="adjust">Adjustment</option>
        </select>
      </label>

      {type === "adjust" ? (
        <label>
          New on-hand quantity
          <input
            name="newQuantity"
            type="number"
            min={0}
            required
            defaultValue={currentQuantity}
          />
        </label>
      ) : (
        <label>
          Quantity
          <input name="quantity" type="number" min={1} required defaultValue={1} />
        </label>
      )}

      {type === "adjust" && (
        <input type="hidden" name="quantity" value={1} />
      )}

      <label>
        Note
        <input name="note" placeholder="Optional reference" />
      </label>

      <button type="submit" className="button" disabled={pending}>
        {pending ? "Updating…" : "Record movement"}
      </button>
    </form>
  );
}
