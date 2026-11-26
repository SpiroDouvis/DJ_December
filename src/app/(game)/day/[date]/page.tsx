import { redirect } from "next/navigation";
import { dayHref } from "@/lib/calendar";
import { isGameDate } from "@/lib/time";

/** Day details now live on the calendar. Old links land there. */
export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  redirect(isGameDate(date) ? dayHref(date) : "/calendar");
}
