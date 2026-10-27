import { renderIssueDetail } from "@/features/inventory/pages/issue-detail";

export default async function IssueViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  return renderIssueDetail(publicId);
}
