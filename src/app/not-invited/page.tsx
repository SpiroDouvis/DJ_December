import { signOut } from "@/app/actions";
import { Brand } from "@/components/Brand";
import { CenterCard } from "@/components/CenterCard";
import { Button } from "@/components/ui/button";

export default function NotInvited() {
  return (
    <CenterCard>
      <Brand large />
      <h1 className="text-xl font-semibold">You&apos;re not on the list</h1>
      <p className="text-muted-foreground">Ask the admin to add the Google email you signed in with, then try again.</p>
      <form action={signOut}>
        <Button type="submit" variant="secondary">
          Sign out
        </Button>
      </form>
    </CenterCard>
  );
}
