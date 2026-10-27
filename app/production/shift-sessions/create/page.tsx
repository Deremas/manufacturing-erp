import { getShiftReferenceData } from "@/app/shifts/_lib/reference-data";
import { ShiftSessionEditor } from "@/features/shift/document-pages";

export default async function CreateShiftSessionPage() {
  const referenceData = await getShiftReferenceData();
  const factory = referenceData.locations.find((location) => location.label.trim().toLowerCase() === "factory")
    ?? referenceData.locations[0];

  return (
    <ShiftSessionEditor
      title="New Shift"
      subtitle="Open a factory shift with the production date, factory location, shift, and assigned staff."
      breadcrumbs={[
        { label: "Production", href: "/production" },
        { label: "Shift Sessions", href: "/production/shift-sessions" },
        { label: "New Shift" },
      ]}
      apiBasePath="/api/shifts/sessions"
      cancelHref="/production/shift-sessions"
      successHref="/production/shift-sessions"
      people={referenceData.people}
      locations={referenceData.locations}
      shifts={referenceData.shiftDefinitions}
      initialValue={{
        productionDate: new Date().toISOString().slice(0, 10),
        shiftCode: referenceData.shiftDefinitions[0]?.code ?? "",
        locationId: factory?.value ?? "",
        remarks: "",
        attendance: [{ userId: "", displayName: "", role: "", present: true, remarks: "" }],
      }}
    />
  );
}
