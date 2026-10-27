import { redirect } from "next/navigation";

export default async function TruckLoadingEditRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/sales/loading/${id}/edit`);
}
