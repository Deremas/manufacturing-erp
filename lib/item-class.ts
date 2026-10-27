export type ItemClass = "RAW" | "PACK" | "FG" | "CONS" | "SPARE" | "SERVICE" | "OTHER";

type ItemClassShape = {
  itemCode?: string | null;
  itemType?: string | null;
  itemTypeCode?: string | null;
  itemTypeName?: string | null;
  categoryName?: string | null;
};

function text(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

export function getItemClass(item: ItemClassShape): ItemClass {
  const type = text(item.itemTypeCode || item.itemType);
  const typeName = text(item.itemTypeName);
  const category = text(item.categoryName);
  const code = text(item.itemCode);
  const haystack = `${type} ${typeName} ${category}`;

  if (
    type === "FG" ||
    type === "FINISHED" ||
    type === "FINISHED_GOOD" ||
    typeName.includes("FINISHED") ||
    category === "FG" ||
    category.includes("FINISHED") ||
    code.startsWith("FG-")
  ) {
    return "FG";
  }

  if (
    type === "PACK" ||
    type === "PK" ||
    type === "PM" ||
    haystack.includes("PACK") ||
    code.startsWith("PACK-") ||
    code.startsWith("PK-")
  ) {
    return "PACK";
  }

  if (
    type === "CONS" ||
    type === "CN" ||
    type === "CONSUMABLE" ||
    haystack.includes("CONSUMABLE") ||
    code.startsWith("CONS-") ||
    code.startsWith("CN-")
  ) {
    return "CONS";
  }

  if (
    type === "SPARE" ||
    type === "SP" ||
    haystack.includes("SPARE") ||
    code.startsWith("SPARE-") ||
    code.startsWith("SP-")
  ) {
    return "SPARE";
  }

  if (
    type === "SERVICE" ||
    type === "SV" ||
    haystack.includes("SERVICE") ||
    code.startsWith("SV-")
  ) {
    return "SERVICE";
  }

  if (
    type === "RAW" ||
    type === "RM" ||
    haystack.includes("RAW") ||
    code.startsWith("RM-") ||
    code.startsWith("RAW-")
  ) {
    return "RAW";
  }

  return "OTHER";
}

export function isPurchasableItem(item: ItemClassShape) {
  const itemClass = getItemClass(item);
  return itemClass === "RAW" || itemClass === "PACK" || itemClass === "CONS" || itemClass === "SPARE" || itemClass === "SERVICE";
}

export function isFinishedGoodItem(item: ItemClassShape) {
  return getItemClass(item) === "FG";
}

export function itemTypeUsageHint(itemTypeCode: string) {
  switch (String(itemTypeCode ?? "").trim().toUpperCase()) {
    case "RAW":
    case "RM":
      return "Shown on Purchase Requisitions and Purchase Orders.";
    case "PACK":
    case "PK":
    case "PM":
      return "Packaging is purchased. Shown on Purchase Requisitions and Purchase Orders.";
    case "CONS":
    case "CN":
      return "Consumables are purchased. Shown on Purchase Requisitions and Purchase Orders.";
    case "SPARE":
    case "SP":
      return "Spare parts are purchased. Shown on Purchase Requisitions and Purchase Orders.";
    case "FG":
      return "Finished goods are produced and sold. Shown on Sales and Production, not Purchase.";
    case "SERVICE":
    case "SV":
      return "Shown on Purchase when buying a service.";
    default:
      return "Item type controls where this item can be selected.";
  }
}
