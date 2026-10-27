"use client";

import { EmptyState } from "@/components/shared";

export default function ReportEmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return <EmptyState title={title} message={message} />;
}
