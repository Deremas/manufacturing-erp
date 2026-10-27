import { redirect } from "next/navigation";

export default async function CreateLoadingFromOrderRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/sales/orders/${id}/convert-loading`);
}
