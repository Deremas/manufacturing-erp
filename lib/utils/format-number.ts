const NUMBER_LOCALE = "en-KE";

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(minimumFractionDigits: number, maximumFractionDigits: number) {
  const key = `${minimumFractionDigits}-${maximumFractionDigits}`;
  if (!formatterCache.has(key)) {
    formatterCache.set(
      key,
      new Intl.NumberFormat(NUMBER_LOCALE, {
        minimumFractionDigits,
        maximumFractionDigits,
      }),
    );
  }
  return formatterCache.get(key)!;
}

export function parseFormattedNumber(value: string): number {
  const cleaned = value.replace(/,/g, "").trim();
  if (!cleaned || cleaned === "-" || cleaned === ".") return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Format partial user input with thousand separators while typing. */
export function formatNumberDraft(input: string, decimals = 2): string {
  const cleaned = input.replace(/,/g, "").replace(/[^\d.]/g, "");
  if (!cleaned) return "";

  if (decimals === 0) {
    const digits = cleaned.replace(/\./g, "");
    if (!digits) return "";
    return getFormatter(0, 0).format(Number(digits));
  }

  const dotIndex = cleaned.indexOf(".");
  const hasDot = dotIndex !== -1;
  const intDigits = hasDot ? cleaned.slice(0, dotIndex) : cleaned;
  const decDigits = hasDot ? cleaned.slice(dotIndex + 1).replace(/\./g, "").slice(0, decimals) : "";

  const intFormatted =
    intDigits === ""
      ? hasDot
        ? "0"
        : ""
      : getFormatter(0, 0).format(Number(intDigits));

  if (!hasDot) return intFormatted;
  return `${intFormatted}.${decDigits}`;
}

export function getCursorAfterFormattedNumber(
  previousValue: string,
  nextValue: string,
  cursorPosition: number,
): number {
  const digitsBeforeCursor = previousValue.slice(0, cursorPosition).replace(/,/g, "").length;
  if (digitsBeforeCursor <= 0) return 0;

  let digitsSeen = 0;
  for (let index = 0; index < nextValue.length; index += 1) {
    if (nextValue[index] !== ",") {
      digitsSeen += 1;
      if (digitsSeen >= digitsBeforeCursor) {
        return index + 1;
      }
    }
  }

  return nextValue.length;
}

export function formatQuantity(value: unknown, maximumFractionDigits = 0): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "0";
  return getFormatter(0, maximumFractionDigits).format(amount);
}

export function formatDecimal(value: unknown, decimals = 2): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return getFormatter(0, decimals).format(0);
  }
  return getFormatter(0, decimals).format(amount);
}

export function formatMoney(value: unknown, currencyCode?: string): string {
  const amount = Number(value);
  const formatted = getFormatter(2, 2).format(Number.isFinite(amount) ? amount : 0);
  return currencyCode ? `${currencyCode} ${formatted}` : formatted;
}

export function formatNumberDisplay(
  value: unknown,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number },
): string {
  const min = options?.minimumFractionDigits ?? 0;
  const max = options?.maximumFractionDigits ?? min;
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return getFormatter(min, max).format(0);
  }
  return getFormatter(min, max).format(amount);
}
