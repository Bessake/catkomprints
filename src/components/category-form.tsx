"use client";

import { useActionState } from "react";
import { createCategoryAction, type ActionState } from "@/app/actions";

const initialState: ActionState = null;

export function CategoryForm() {
  const [state, formAction, pending] = useActionState(
    createCategoryAction,
    initialState,
  );

  return (
    <form action={formAction} className="form-grid">
      {state?.error && <p className="error-text">{state.error}</p>}
      {state?.success && <div className="success-banner">{state.success}</div>}
      <label>
        Category name
        <input name="name" required placeholder="e.g. Electronics" />
      </label>
      <button type="submit" className="button" disabled={pending}>
        {pending ? "Adding…" : "Add category"}
      </button>
    </form>
  );
}
