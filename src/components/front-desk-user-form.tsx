"use client";

import { useActionState } from "react";
import {
  createFrontDeskUserAction,
  type UserActionState,
} from "@/app/user-actions";

const initialState: UserActionState = null;

export function FrontDeskUserForm() {
  const [state, formAction, pending] = useActionState(
    createFrontDeskUserAction,
    initialState,
  );

  return (
    <form action={formAction} className="form-grid">
      {state?.error && <p className="error-text">{state.error}</p>}
      {state?.success && <div className="success-banner">{state.success}</div>}
      <label>
        Full name
        <input name="name" required placeholder="e.g. Ama Mensah" />
      </label>
      <p className="muted" style={{ margin: 0 }}>
        Login will be firstname.lastname@catkomprints.local with password
        password123.
      </p>
      <button type="submit" className="button" disabled={pending}>
        {pending ? "Creating…" : "Create front desk login"}
      </button>
    </form>
  );
}
