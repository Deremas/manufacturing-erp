import { redirect } from "next/navigation";

export default function LegacyStartShiftPage() {
  redirect("/production/shift-sessions/create");
}
