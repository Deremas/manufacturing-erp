import { redirectLegacyShift } from "@/app/production/shift-sessions/[id]/_lib/load-session";

export default async function LegacyEditShiftSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await redirectLegacyShift(id, "/edit");
}
