"use client";

import { useActionState } from "react";
import { addTheme, type FormState } from "@/app/actions";

export function AddThemeForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(addTheme, undefined);
  return (
    <form action={action} className="submit">
      <input name="text" required maxLength={80} placeholder="New theme, e.g. Songs about food" aria-label="Theme" />
      <button type="submit" disabled={pending}>
        Add theme
      </button>
      {state?.error ? <p className="error">{state.error}</p> : null}
      {state?.ok ? <p className="ok">{state.ok}</p> : null}
    </form>
  );
}
