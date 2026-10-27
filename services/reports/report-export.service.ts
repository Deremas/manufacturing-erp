export function buildReportIndexExportRows(
  groups: Array<{
    title: string;
    reportCount: number;
    links: Array<{ title: string; href: string; description?: string }>;
  }>,
) {
  return groups.flatMap((group) =>
    group.links.map((link) => ({
      module: group.title,
      reportTitle: link.title,
      route: link.href,
      description: link.description ?? "",
      reportCount: group.reportCount,
    })),
  );
}
