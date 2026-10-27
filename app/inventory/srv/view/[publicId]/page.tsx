import { redirect } from "next/navigation";

export default async function RequisitionViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  redirect(`/inventory/requisitions/view/${publicId}`);
}
