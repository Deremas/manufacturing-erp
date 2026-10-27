import { getCurrentUser } from "@/lib/auth/auth";
import { sql } from "@/lib/db";
import {
  getShiftDefinitions,
  listProductionLocations,
  listUsers,
} from "@/services/production/production-shared.service";
import { listProductionMachines } from "@/services/production/machine-assignment.service";

export type ShiftPersonOption = {
  key: string;
  userId: string;
  name: string;
  role: string;
  kind: "Employee" | "User";
};

export async function listShiftPeople(): Promise<ShiftPersonOption[]> {
  const [employees, users] = await Promise.all([
    sql<Array<{ id: string; userId: string | null; firstName: string; middleName: string | null; lastName: string; role: string | null }>>`
      SELECT id, "userId", "firstName", "middleName", "lastName", COALESCE(NULLIF("productionRole", ''), NULLIF("positionTitle", ''), '') AS role
      FROM "Employee"
      WHERE "isArchived" = false AND "isActive" = true
      ORDER BY "firstName" ASC, "lastName" ASC
    `,
    listUsers(),
  ]);
  const linkedUserIds = new Set(employees.map((employee) => employee.userId).filter((id): id is string => Boolean(id)));
  const people: ShiftPersonOption[] = employees.map((employee) => ({
    key: employee.userId || `employee:${employee.id}`,
    userId: employee.userId ?? "",
    name: [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(" "),
    role: employee.role ?? "",
    kind: "Employee",
  }));
  for (const user of users) {
    if (linkedUserIds.has(user.value)) continue;
    people.push({ key: user.value, userId: user.value, name: user.label, role: "", kind: "User" });
  }
  return people.sort((left, right) => left.name.localeCompare(right.name));
}

export async function getShiftReferenceData() {
  const [currentUser, locations, users, people, shiftDefinitions, machines] = await Promise.all([
    getCurrentUser(),
    listProductionLocations(),
    listUsers(),
    listShiftPeople(),
    getShiftDefinitions(),
    listProductionMachines(),
  ]);

  return {
    currentUser,
    locations,
    users,
    people,
    shiftDefinitions,
    machines,
  };
}
