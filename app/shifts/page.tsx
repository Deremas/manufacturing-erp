import { ModuleLandingPage } from "@/components/shared";

export default function ShiftsRoutePage() {
  return (
    <ModuleLandingPage
      title="Shifts"
      subtitle="Production shift monitoring"
      description="Open shift sessions, daily reports, efficiency reporting, and downtime reporting."
      links={[
        { title: "Shift Sessions", href: "/shifts/sessions", icon: "CalendarClock" },
        { title: "Daily Report", href: "/shifts/daily-report", icon: "CalendarClock" },
        { title: "Efficiency Report", href: "/shifts/efficiency", icon: "BarChart3" },
        { title: "Downtime Report", href: "/shifts/downtime", icon: "AlarmClock" },
      ]}
    />
  );
}
