export const dynamic = "force-dynamic";

import { formatItemOptionLabel, getItemRows } from "@/lib/server/item-data";
import SrvCardPage from "@/features/inventory/srv-card/SrvCardPage";

export default async function SrvCardRoute() {
  const items = await getItemRows();

  return (
    <SrvCardPage
      items={items
        .filter((item) => item.isActive !== false)
        .map((item) => ({
          value: item.id,
          label: formatItemOptionLabel(item),
          group: item.itemTypeName || item.itemType || item.categoryName || "Other",
        }))
        .sort((a, b) => {
          const byGroup = a.group.localeCompare(b.group, undefined, { sensitivity: "base" });
          return byGroup !== 0
            ? byGroup
            : a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
        })}
    />
  );
}
