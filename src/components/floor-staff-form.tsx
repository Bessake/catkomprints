"use client";

import { useActionState } from "react";
import {
  createFloorStaffAction,
  type OperatorActionState,
} from "@/app/operator/actions";

const initialState: OperatorActionState = null;

export function FloorStaffForm() {
  const [state, formAction, pending] = useActionState(
    createFloorStaffAction,
    initialState,
  );

  return (
    <form action={formAction} className="form-grid">
      {state?.error && <p className="error-text">{state.error}</p>}
      {state?.success && <div className="success-banner">{state.success}</div>}
      <label>
        Staff name
        <input name="name" required placeholder="e.g. Staff A" />
      </label>
      <button type="submit" className="button" disabled={pending}>
        {pending ? "Adding…" : "Add staff"}
      </button>
    </form>
  );
}
