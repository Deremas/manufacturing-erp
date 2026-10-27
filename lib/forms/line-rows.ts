/** Keep the first line and empty it. Later lines are removed. */
export function blankOrRemoveRow<T>(rows: T[], index: number, blank: T): T[] {
  if (rows.length <= 1) return [blank];
  if (index === 0) return rows.map((row, rowIndex) => (rowIndex === 0 ? blank : row));
  return rows.filter((_, rowIndex) => rowIndex !== index);
}
