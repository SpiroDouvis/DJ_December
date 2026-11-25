"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { addTheme, type FormState } from "@/app/actions";
import { FormMessage } from "./FormMessage";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function AddThemeForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(addTheme, undefined);
  return (
    <form action={action} className="flex flex-wrap gap-2">
      <Input
        name="text"
        required
        maxLength={80}
        placeholder="New theme, e.g. Songs about food"
        aria-label="Theme"
        className="flex-[1_1_260px]"
      />
      <Button type="submit" disabled={pending}>
        <Plus />
        Add theme
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
