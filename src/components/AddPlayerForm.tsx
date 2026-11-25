"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";
import { addPlayer, type FormState } from "@/app/actions";
import { FormMessage } from "./FormMessage";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function AddPlayerForm({ defaultJoinedOn }: { defaultJoinedOn: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addPlayer, undefined);
  return (
    <form action={action} className="grid max-w-md gap-4">
      <Label>
        Name <Input name="name" required maxLength={40} />
      </Label>
      <Label>
        Google email <Input name="email" type="email" required />
      </Label>
      <Label>
        First day they play <Input name="joinedOn" type="date" required defaultValue={defaultJoinedOn} />
      </Label>
      <Button type="submit" disabled={pending} className="justify-self-start">
        <UserPlus />
        Add player
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
