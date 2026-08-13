"use client";

import { useActionState } from "react";
import type { Category, Product } from "@prisma/client";
import {
  createProductAction,
  updateProductAction,
  type ActionState,
} from "@/app/actions";

const initialState: ActionState = null;

export function ProductForm({
  categories,
  product,
}: {
  categories: Category[];
  product?: Product;
}) {
  const action = product
    ? updateProductAction.bind(null, product.id)
    : createProductAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="form-grid">
      {state?.error && <p className="error-text">{state.error}</p>}
      {state?.success && <div className="success-banner">{state.success}</div>}

      <div className="form-grid two">
        <label>
          SKU
          <input
            name="sku"
            required
            defaultValue={product?.sku}
            placeholder="EL-USB-C-01"
          />
        </label>
        <label>
          Name
          <input
            name="name"
            required
            defaultValue={product?.name}
            placeholder="Product name"
          />
        </label>
      </div>

      <label>
        Description
        <textarea
          name="description"
          defaultValue={product?.description}
          placeholder="Optional details"
        />
      </label>

      <div className="form-grid two">
        <label>
          Category
          <select
            name="categoryId"
            defaultValue={product?.categoryId || ""}
          >
            <option value="">Uncategorized</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Reorder level
          <input
            name="reorderLevel"
            type="number"
            min={0}
            required
            defaultValue={product?.reorderLevel ?? 10}
          />
        </label>
      </div>

      <div className="form-grid two">
        <label>
          Unit price (GH₵)
          <input
            name="unitPrice"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={product?.unitPrice ?? 0}
          />
        </label>
        <label>
          Cost price (GH₵)
          <input
            name="costPrice"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={product?.costPrice ?? 0}
          />
        </label>
      </div>

      {!product && (
        <label>
          Initial quantity
          <input
            name="initialQuantity"
            type="number"
            min={0}
            defaultValue={0}
          />
        </label>
      )}

      <label className="checkbox-row">
        <input
          name="active"
          type="checkbox"
          defaultChecked={product?.active ?? true}
        />
        Active product
      </label>

      <div className="actions">
        <button type="submit" className="button" disabled={pending}>
          {pending
            ? "Saving…"
            : product
              ? "Save changes"
              : "Create product"}
        </button>
      </div>
    </form>
  );
}
