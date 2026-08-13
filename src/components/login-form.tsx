"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction } from "@/app/login/actions";

const initialState = null as { error?: string } | null;

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="form-grid">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <label>
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      {state?.error && <p className="error-text">{state.error}</p>}
      <button type="submit" className="button" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
