import { redirect } from "next/navigation";
export default async function Route({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; redirect(`/fleet/trips/${id}`); }
