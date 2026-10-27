import { redirect } from "next/navigation";

export default async function FleetTripEditRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/fleet/trips?edit=${encodeURIComponent(id)}`);
}
