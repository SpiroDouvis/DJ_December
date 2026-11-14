"use client";

import { useActionState } from "react";
import { addPlayer, type FormState } from "@/app/actions";

export function AddPlayerForm({ defaultJoinedOn }: { defaultJoinedOn: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addPlayer, undefined);
  return (
    <form action={action} className="stack">
      <label>
        Name <input name="name" required maxLength={40} />
      </label>
      <label>
        Google email <input name="email" type="email" required />
      </label>
      <label>
        First day they play <input name="joinedOn" type="date" required defaultValue={defaultJoinedOn} />
      </label>
      <button type="submit" disabled={pending}>
        Add player
      </button>
      {state?.error ? <p className="error">{state.error}</p> : null}
      {state?.ok ? <p className="ok">{state.ok}</p> : null}
    </form>
  );
}
