import { redirect } from "next/navigation";

export default async function TransferEditPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  redirect(`/inventory/transfers/edit/${publicId}`);
}
