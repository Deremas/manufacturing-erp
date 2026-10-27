import { redirect } from "next/navigation";

export default async function LegacyShiftView({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  redirect(`/production/shift-sessions/${publicId}`);
}
