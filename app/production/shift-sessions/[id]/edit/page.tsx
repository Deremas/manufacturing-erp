import { getShiftReferenceData } from "@/app/shifts/_lib/reference-data";
import { ShiftSessionEditor } from "@/features/shift/document-pages";
import { loadShift, shiftPublicPath } from "@/app/production/shift-sessions/[id]/_lib/load-session";

export default async function EditShiftSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [referenceData, session] = await Promise.all([
    getShiftReferenceData(),
    loadShift(id, "/edit"),
  ]);

  return (
    <ShiftSessionEditor
      title="Edit Shift Session"
      subtitle="Update the active shift header and the people assigned to manage it."
      breadcrumbs={[
        { label: "Production", href: "/production" },
        { label: "Shift Sessions", href: "/production/shift-sessions" },
        { label: session.sessionNo, href: shiftPublicPath(session.publicId) },
        { label: "Edit" },
      ]}
      apiBasePath={`/api/shifts/sessions/${session.id}`}
      apiMethod="PUT"
      submitLabel="Save Changes"
      cancelHref={shiftPublicPath(session.publicId)}
      successHref="/production/shift-sessions"
      people={referenceData.people}
      locations={referenceData.locations}
      shifts={referenceData.shiftDefinitions}
      initialValue={{
        productionDate: session.productionDate.slice(0, 10),
        shiftCode: session.shiftCode,
        locationId: session.locationId,
        remarks: session.remarks ?? "",
        attendance: session.attendance.length
          ? session.attendance.map((row) => ({
              userId: row.userId ?? "",
              displayName: row.userName,
              role: row.role ?? "",
              present: row.present,
              remarks: row.remarks ?? "",
            }))
          : [{ userId: "", displayName: "", role: "", present: true, remarks: "" }],
      }}
    />
  );
}
