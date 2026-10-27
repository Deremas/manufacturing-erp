export function evaluatePreventiveMaintenanceDue(input: {
  status: string;
  triggerType: string;
  nextDueDate?: string | null;
  nextMeterReading?: number | null;
  currentMeterReading?: number | null;
  leadTimeDays?: number | null;
  now?: Date;
}) {
  if (!["ACTIVE", "DRAFT"].includes(input.status)) return null;
  const now = input.now ?? new Date();
  const calendarLimit = new Date(now);
  calendarLimit.setUTCDate(calendarLimit.getUTCDate() + Math.max(0, Number(input.leadTimeDays ?? 14)));
  const calendarDue = ["CALENDAR", "HYBRID"].includes(input.triggerType)
    && Boolean(input.nextDueDate)
    && new Date(input.nextDueDate as string) <= calendarLimit;
  const meterDue = ["METER", "HYBRID"].includes(input.triggerType)
    && input.nextMeterReading != null
    && input.currentMeterReading != null
    && input.currentMeterReading >= input.nextMeterReading;
  return calendarDue && meterDue ? "CALENDAR + METER" : calendarDue ? "CALENDAR" : meterDue ? "METER" : null;
}
