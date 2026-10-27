import { redirect } from "next/navigation";

export default async function FleetFuelDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/fleet/fuel?edit=${encodeURIComponent(id)}`);
}
