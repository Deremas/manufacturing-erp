import { redirect } from "next/navigation";

export default async function TransferViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  redirect(`/inventory/transfers/view/${publicId}`);
}
