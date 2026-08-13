"use client";

import { useActionState } from "react";
import {
  createDeskProductAction,
  type ActionState,
} from "@/app/actions";

const initialState: ActionState = null;

export function DeskProductForm({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    createDeskProductAction,
    initialState,
  );

  return (
    <form action={formAction} className="form-grid">
      {state?.error && <p className="error-text">{state.error}</p>}
      {state?.success && <div className="success-banner">{state.success}</div>}

      <label>
        Product name
        <input name="name" required placeholder="e.g. A4 bond paper" />
      </label>

      <div className="form-grid two">
        <label>
          Quantity on hand
          <input
            name="initialQuantity"
            type="number"
            min={0}
            defaultValue={0}
          />
        </label>
        <label>
          Category
          <select name="categoryId" defaultValue="">
            <option value="">Uncategorized</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        SKU (optional)
        <input name="sku" placeholder="Leave blank to generate" />
      </label>

      <div className="actions">
        <button type="submit" className="button" disabled={pending}>
          {pending ? "Adding…" : "Add product"}
        </button>
      </div>
    </form>
  );
}
