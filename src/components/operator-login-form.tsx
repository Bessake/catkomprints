"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { operatorLoginAction } from "@/app/operator/login/actions";

const initialState = null as { error?: string } | null;

export function OperatorLoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/operator";
  const [state, formAction, pending] = useActionState(
    operatorLoginAction,
    initialState,
  );

  return (
    <form action={formAction} className="form-grid">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <label>
        Email
        <input
          name="email"
          type="email"
          required
          defaultValue="operator@catkomprints.local"
        />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          required
          defaultValue="password123"
        />
      </label>
      {state?.error && <p className="error-text">{state.error}</p>}
      <button type="submit" className="button" disabled={pending}>
        {pending ? "Signing in…" : "Enter floor terminal"}
      </button>
    </form>
  );
}
