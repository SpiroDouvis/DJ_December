import { redirect } from "next/navigation";

/** The old Schedule tab became the calendar. */
export default function SchedulePage() {
  redirect("/calendar");
}
