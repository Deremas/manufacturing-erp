import { redirect } from "next/navigation";

export default async function TruckLoadingConfirmRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/sales/loading/${id}`);
}
