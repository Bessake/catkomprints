"use client";

import { useActionState } from "react";
import {
  createClientAction,
  updateClientAction,
  type ActionState,
} from "@/app/front-desk-actions";
import type { Client } from "@prisma/client";

const initialState: ActionState = null;

export function ClientForm({ client }: { client?: Client }) {
  const action = client
    ? updateClientAction.bind(null, client.id)
    : createClientAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="form-grid">
      {state?.error && <p className="error-text">{state.error}</p>}
      {state?.success && <div className="success-banner">{state.success}</div>}

      <label>
        Name
        <input name="name" required defaultValue={client?.name} />
      </label>
      <div className="form-grid two">
        <label>
          Email
          <input
            name="email"
            type="email"
            defaultValue={client?.email || ""}
          />
        </label>
        <label>
          Phone (SMS)
          <input
            name="phone"
            placeholder="+15551234567"
            defaultValue={client?.phone || ""}
          />
        </label>
      </div>
      <label>
        Notes
        <textarea name="notes" defaultValue={client?.notes} />
      </label>
      <button type="submit" className="button" disabled={pending}>
        {pending ? "Saving…" : client ? "Save client" : "Add client"}
      </button>
    </form>
  );
}
