type ItemDisplayShape = {
  itemCode?: string | null;
  itemName?: string | null;
  itemType?: string | null;
  itemTypeCode?: string | null;
  itemTypeName?: string | null;
};

const LEGACY_ITEM_CODE_PATTERN = /^([A-Z]+)-(\d{10,})-([A-F0-9]{4,})$/i;

function resolveItemTypeCode(item: ItemDisplayShape) {
  return String(item.itemTypeCode ?? item.itemType ?? "").trim().toUpperCase();
}

function resolveItemPrefix(item: ItemDisplayShape, leadingCode?: string) {
  const itemTypeCode = resolveItemTypeCode(item);
  const itemTypeName = String(item.itemTypeName ?? "").trim().toUpperCase();
  const leading = String(leadingCode ?? "").trim().toUpperCase();

  if (
    leading === "RAW" ||
    itemTypeCode === "RAW" ||
    itemTypeCode === "RM" ||
    itemTypeName.includes("RAW")
  ) {
    return "RM";
  }
  if (
    leading === "PACK" ||
    itemTypeCode === "PACK" ||
    itemTypeCode === "PK" ||
    itemTypeName.includes("PACK")
  ) {
    return "PK";
  }
  if (leading === "FG" || itemTypeCode === "FG" || itemTypeName.includes("FINISHED")) {
    return "FG";
  }
  if (itemTypeCode === "CN" || itemTypeCode === "CONS" || itemTypeName.includes("CONSUMABLE")) {
    return "CN";
  }
  if (itemTypeCode === "SP" || itemTypeCode === "SPARE" || itemTypeName.includes("SPARE")) {
    return "SP";
  }
  if (itemTypeCode === "AS" || itemTypeCode === "ASSET" || itemTypeName.includes("ASSET")) {
    return "AS";
  }
  if (itemTypeCode === "SV" || itemTypeCode === "SERVICE" || itemTypeName.includes("SERVICE")) {
    return "SV";
  }

  return leading || "ITM";
}

export function getCleanItemName(itemName: string, itemCode?: string) {
  const name = String(itemName ?? "").trim();
  const code = String(itemCode ?? "").trim();
  if (!name) return "";

  const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let cleaned = name;

  if (code) {
    cleaned = cleaned
      .replace(new RegExp(`\\s*${escapedCode}\\s*$`, "i"), "")
      .trim();
    cleaned = cleaned
      .replace(new RegExp(`^${escapedCode}\\s*-\\s*`, "i"), "")
      .trim();
  }

  return cleaned || name;
}

export function getDisplayItemCode(item: ItemDisplayShape) {
  const itemCode = String(item.itemCode ?? "").trim();
  if (!itemCode) return "";

  const legacyMatch = itemCode.match(LEGACY_ITEM_CODE_PATTERN);
  if (legacyMatch) {
    const prefix = resolveItemPrefix(item, legacyMatch[1]);
    const numericPart = legacyMatch[2];
    const sequence = Number(numericPart.slice(-4));
    const normalized = Number.isFinite(sequence) && sequence > 0
      ? sequence
      : Number(numericPart.slice(-3));
    const seqText = normalized >= 100
      ? String(normalized)
      : String(normalized).padStart(2, "0");
    return `${prefix}-${seqText}`;
  }

  return itemCode;
}

export function isPlaceholderItem(itemName: string, itemCode: string) {
  const name = String(itemName ?? "");
  const code = String(itemCode ?? "");
  return (
    /test/i.test(name) ||
    /^TEST[-_]/i.test(code) ||
    /^FG-T/i.test(code) ||
    /^RAW-T/i.test(code) ||
    /^Inventory Test Item/i.test(name) ||
    /^Finished Good FG-/i.test(name) ||
    /^Raw Material RAW-/i.test(name) ||
    /^Pricing Test/i.test(name) ||
    /^FG-\d{10,}/i.test(code) ||
    /^RAW-\d{10,}/i.test(code)
  );
}

export function formatItemOptionLabel(item: ItemDisplayShape) {
  const itemCode = getDisplayItemCode(item);
  const cleanName = getCleanItemName(String(item.itemName ?? ""), itemCode);
  if (itemCode && cleanName) {
    return `${itemCode} - ${cleanName}`;
  }
  return cleanName || String(item.itemName ?? "").trim() || itemCode;
}

export function isLegacyGeneratedItemCode(itemCode: string) {
  return LEGACY_ITEM_CODE_PATTERN.test(String(itemCode ?? "").trim());
}
