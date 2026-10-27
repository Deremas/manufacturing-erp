import { redirect } from "next/navigation";

export default function LegacyShiftSessionsPage() {
  redirect("/production/shift-sessions");
}
