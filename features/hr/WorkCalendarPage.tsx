"use client";

import React, { useState } from "react";
import { CalendarDays, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { ActionButtons, FormCard, PageHeader } from "@/components/shared";
import type { Action, Breadcrumb } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import type { HolidayCalendarEntry, HolidayTemplate, WorkCalendarSettings } from "./types";

const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: colors.text.secondary };
const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 44,
  border: `1px solid ${colors.inputBorder}`,
  borderRadius: 12,
  padding: "10px 12px",
  fontSize: 15,
  backgroundColor: colors.surface,
  boxSizing: "border-box",
};

const weekdayOptions = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

function createHolidayEntry(name: string, date: string): HolidayCalendarEntry {
  return {
    id: crypto.randomUUID(),
    name,
    date,
    sourceType: "CUSTOM",
    isActive: true,
  };
}

function createHolidayTemplate(name: string, month: number, day: number): HolidayTemplate {
  return {
    id: crypto.randomUUID(),
    name,
    month,
    day,
    isActive: true,
  };
}

export default function WorkCalendarPage({ settings }: { settings: WorkCalendarSettings }) {
  const router = useRouter();
  const breadcrumbs: Breadcrumb[] = [
    { label: "HR", href: "/hr" },
    { label: "Work Calendar" },
  ];

  const [weekendDays, setWeekendDays] = useState<number[]>(settings.weekendDays ?? [0]);
  const [holidayEntries, setHolidayEntries] = useState<HolidayCalendarEntry[]>(settings.holidayEntries ?? []);
  const [holidayTemplates, setHolidayTemplates] = useState<HolidayTemplate[]>(settings.holidayTemplates ?? []);
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayName, setNewHolidayName] = useState("");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateMonth, setNewTemplateMonth] = useState("1");
  const [newTemplateDay, setNewTemplateDay] = useState("1");
  const [generateYear, setGenerateYear] = useState(String(new Date().getFullYear()));
  const [standardWorkDaysPerMonth, setStandardWorkDaysPerMonth] = useState(String(settings.standardWorkDaysPerMonth ?? 26));
  const [attendanceRequiredForSalary, setAttendanceRequiredForSalary] = useState(settings.attendanceRequiredForSalary ?? true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const toggleWeekend = (day: number) => {
    setWeekendDays((current) => current.includes(day) ? current.filter((entry) => entry !== day) : [...current, day].sort((a, b) => a - b));
  };

  const syncSettings = (next: WorkCalendarSettings) => {
    setWeekendDays(next.weekendDays ?? [0]);
    setStandardWorkDaysPerMonth(String(next.standardWorkDaysPerMonth ?? 26));
    setAttendanceRequiredForSalary(next.attendanceRequiredForSalary ?? true);
    setHolidayEntries(next.holidayEntries ?? []);
    setHolidayTemplates(next.holidayTemplates ?? []);
  };

  const addHoliday = () => {
    const date = newHolidayDate.trim();
    const name = newHolidayName.trim();
    if (!date || !name) return;
    setHolidayEntries((current) => {
      const next = current.filter((entry) => !(entry.date === date && entry.name.toLowerCase() === name.toLowerCase()));
      next.push(createHolidayEntry(name, date));
      return next.sort((left, right) => left.date.localeCompare(right.date) || left.name.localeCompare(right.name));
    });
    setNewHolidayDate("");
    setNewHolidayName("");
  };

  const addTemplate = () => {
    const name = newTemplateName.trim();
    const month = Number(newTemplateMonth);
    const day = Number(newTemplateDay);
    if (!name || !Number.isInteger(month) || !Number.isInteger(day)) return;
    setHolidayTemplates((current) => {
      const next = current.filter((entry) => !(entry.name.toLowerCase() === name.toLowerCase() && entry.month === month && entry.day === day));
      next.push(createHolidayTemplate(name, month, day));
      return next.sort((left, right) => left.month - right.month || left.day - right.day || left.name.localeCompare(right.name));
    });
    setNewTemplateName("");
    setNewTemplateMonth("1");
    setNewTemplateDay("1");
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/hr/work-calendar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          standardWorkDaysPerMonth: Number(standardWorkDaysPerMonth),
          attendanceRequiredForSalary,
          weekendDays,
          holidayDates: holidayEntries.filter((entry) => entry.isActive).map((entry) => entry.date),
          holidayEntries,
          holidayTemplates,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(payload?.error ?? "Failed to update work calendar.");
        return;
      }

      setMessage("Work calendar saved successfully.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const generate = async () => {
    setGenerating(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/hr/work-calendar/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: Number(generateYear) }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string; settings?: WorkCalendarSettings } | null;
      if (!response.ok || !payload?.settings) {
        setError(payload?.error ?? "Failed to generate holiday calendar.");
        return;
      }

      syncSettings(payload.settings);
      setMessage(`Holiday calendar generated for ${generateYear}.`);
      router.refresh();
    } finally {
      setGenerating(false);
    }
  };

  const actions: Action[] = [
    {
      label: "Cancel",
      variant: "secondary",
      icon: <X size={16} />,
      onClick: () => router.push("/hr"),
      disabled: saving || generating,
    },
    {
      label: "Save Work Calendar",
      variant: "primary",
      icon: <Save size={16} />,
      onClick: save,
      loading: saving,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader
        title="Work Calendar"
        subtitle="Manage weekends, named holidays, yearly holiday templates, and attendance-payroll behavior for both shift and non-shift employees."
        breadcrumbs={breadcrumbs}
      />

      {error ? <div style={{ padding: "12px 14px", borderRadius: 12, backgroundColor: colors.danger[50], border: `1px solid ${colors.danger[200]}`, color: colors.danger[700] }}>{error}</div> : null}
      {message ? <div style={{ padding: "12px 14px", borderRadius: 12, backgroundColor: colors.success[50], border: `1px solid ${colors.success[200]}`, color: colors.success[700] }}>{message}</div> : null}

      <div
        style={{
          padding: 18,
          borderRadius: 16,
          border: `1px solid ${colors.primary[200]}`,
          backgroundColor: colors.primary[50],
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, color: colors.primary[700], marginBottom: 6 }}>How payroll uses this</div>
          <div style={{ color: colors.text.secondary, fontSize: 14 }}>
            Normal days, weekends, and holidays from this calendar drive overtime multipliers and salary-day logic centrally.
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 700, color: colors.primary[700], marginBottom: 6 }}>Shift + non-shift attendance</div>
          <div style={{ color: colors.text.secondary, fontSize: 14 }}>
            Shift attendance syncs automatically into the HR daily ledger, while non-shift attendance can be recorded manually from HR Attendance.
          </div>
        </div>
      </div>

      <FormCard title="Working Day Rules" variant="teal-header">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <label style={fieldStyle}>
            <span style={labelStyle}>Standard Work Days / Month</span>
            <input type="number" min="1" step="1" style={inputStyle} value={standardWorkDaysPerMonth} onChange={(event) => setStandardWorkDaysPerMonth(event.target.value)} />
          </label>
          <label style={fieldStyle}>
            <span style={labelStyle}>Attendance Required For Salary</span>
            <select style={inputStyle} value={attendanceRequiredForSalary ? "yes" : "no"} onChange={(event) => setAttendanceRequiredForSalary(event.target.value === "yes")}>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
        </div>
      </FormCard>

      <FormCard title="Weekend Setup" variant="default">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {weekdayOptions.map((day) => {
            const selected = weekendDays.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleWeekend(day.value)}
                style={{
                  borderRadius: 999,
                  border: `1px solid ${selected ? colors.primary[400] : colors.border}`,
                  padding: "10px 14px",
                  backgroundColor: selected ? colors.primary[50] : colors.surface,
                  color: selected ? colors.primary[700] : colors.text.primary,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {day.label}
              </button>
            );
          })}
        </div>
      </FormCard>

      <FormCard title="Holiday Templates & Calendar" variant="default">
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, alignItems: "end" }}>
            <label style={fieldStyle}>
              <span style={labelStyle}>Template Name</span>
              <input type="text" style={inputStyle} value={newTemplateName} onChange={(event) => setNewTemplateName(event.target.value)} placeholder="Example: Labour Day" />
            </label>
            <label style={fieldStyle}>
              <span style={labelStyle}>Month</span>
              <input type="number" min="1" max="12" style={inputStyle} value={newTemplateMonth} onChange={(event) => setNewTemplateMonth(event.target.value)} />
            </label>
            <label style={fieldStyle}>
              <span style={labelStyle}>Day</span>
              <input type="number" min="1" max="31" style={inputStyle} value={newTemplateDay} onChange={(event) => setNewTemplateDay(event.target.value)} />
            </label>
            <button
              type="button"
              onClick={addTemplate}
              style={{
                height: 44,
                borderRadius: 12,
                border: `1px solid ${colors.primary[300]}`,
                backgroundColor: colors.primary[50],
                color: colors.primary[700],
                padding: "0 16px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Plus size={16} />
              Add Template
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {holidayTemplates.length ? holidayTemplates.map((template) => (
              <div
                key={template.id}
                style={{
                  border: `1px solid ${colors.border}`,
                  borderRadius: 14,
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  backgroundColor: colors.surface,
                }}
              >
                <span>
                  <strong>{template.name}</strong>
                  <br />
                  <span style={{ color: colors.text.secondary, fontSize: 13 }}>{String(template.month).padStart(2, "0")}/{String(template.day).padStart(2, "0")}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setHolidayTemplates((current) => current.filter((entry) => entry.id !== template.id))}
                  style={{ border: "none", backgroundColor: "transparent", color: colors.danger[600], cursor: "pointer" }}
                  aria-label={`Remove holiday template ${template.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )) : (
              <div style={{ color: colors.text.secondary, fontSize: 14 }}>No yearly holiday templates configured yet.</div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, alignItems: "end" }}>
            <label style={fieldStyle}>
              <span style={labelStyle}>Generate Year</span>
              <input type="number" min="2000" max="2100" style={inputStyle} value={generateYear} onChange={(event) => setGenerateYear(event.target.value)} />
            </label>
            <button
              type="button"
              onClick={generate}
              style={{
                height: 44,
                borderRadius: 12,
                border: `1px solid ${colors.primary[300]}`,
                backgroundColor: colors.primary[600],
                color: "#fff",
                padding: "0 16px",
                fontWeight: 700,
                cursor: generating ? "wait" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                opacity: generating ? 0.75 : 1,
              }}
            >
              <RefreshCw size={16} />
              {generating ? "Generating..." : "Generate Holidays"}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, alignItems: "end" }}>
            <label style={fieldStyle}>
              <span style={labelStyle}>Holiday Name</span>
              <input type="text" style={inputStyle} value={newHolidayName} onChange={(event) => setNewHolidayName(event.target.value)} placeholder="Example: Ethiopian Christmas" />
            </label>
            <label style={fieldStyle}>
              <span style={labelStyle}>Holiday Date</span>
              <input type="date" style={inputStyle} value={newHolidayDate} onChange={(event) => setNewHolidayDate(event.target.value)} />
            </label>
            <button
              type="button"
              onClick={addHoliday}
              style={{
                height: 44,
                borderRadius: 12,
                border: `1px solid ${colors.primary[300]}`,
                backgroundColor: colors.primary[50],
                color: colors.primary[700],
                padding: "0 16px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Plus size={16} />
              Add Holiday
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {holidayEntries.length ? holidayEntries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  border: `1px solid ${colors.border}`,
                  borderRadius: 14,
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  backgroundColor: colors.surface,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <CalendarDays size={16} color={colors.primary[600]} />
                  <span>
                    <strong>{entry.name}</strong>
                    <br />
                    <span style={{ color: colors.text.secondary, fontSize: 13 }}>{entry.date} • {entry.sourceType}</span>
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setHolidayEntries((current) => current.filter((holiday) => holiday.id !== entry.id))}
                  style={{ border: "none", backgroundColor: "transparent", color: colors.danger[600], cursor: "pointer" }}
                  aria-label={`Remove holiday ${entry.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )) : (
              <div style={{ color: colors.text.secondary, fontSize: 14 }}>
                No named holiday entries configured yet.
              </div>
            )}
          </div>
        </div>
      </FormCard>

      <div style={{ position: "sticky", bottom: 0, zIndex: 10, backgroundColor: "#f8fafc", borderTop: `1px solid ${colors.border}`, padding: "16px 24px", display: "flex", justifyContent: "flex-end" }}>
        <ActionButtons actions={actions} />
      </div>
    </div>
  );
}
