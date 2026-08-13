"use client";

import { useActionState } from "react";
import {
  createPressServiceAction,
  type ServiceActionState,
} from "@/app/service-actions";

const initialState: ServiceActionState = null;

export function PressServiceForm() {
  const [state, formAction, pending] = useActionState(
    createPressServiceAction,
    initialState,
  );

  return (
    <form action={formAction} className="form-grid">
      {state?.error && <p className="error-text">{state.error}</p>}
      {state?.success && <div className="success-banner">{state.success}</div>}
      <label>
        Service name
        <input name="name" required placeholder="e.g. A3 colour print" />
      </label>
      <label>
        Default cost (GH₵)
        <input
          name="defaultCost"
          type="number"
          min={0}
          step="0.01"
          defaultValue={0}
        />
      </label>
      <button type="submit" className="button" disabled={pending}>
        {pending ? "Adding…" : "Add to dropdown"}
      </button>
    </form>
  );
}
