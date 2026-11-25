import type { FormState } from "@/app/actions";

export function FormMessage({ state }: { state: FormState }) {
  if (state?.error) return <p className="basis-full text-sm text-destructive">{state.error}</p>;
  if (state?.ok) return <p className="basis-full text-sm text-success">{state.ok}</p>;
  return null;
}
