"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ActionButtons,
  DataTable,
  EmptyState,
  FilterCard,
  MetricCard,
  PageHeader,
  StatusBadge,
} from "@/components/shared";
import type { Action, Breadcrumb, Column, FilterField, TableAction } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { Eye, Pencil, UserPlus, Users, UserCheck, UserCog, Building2 } from "lucide-react";
import { publicEditUrl, publicViewUrl } from "@/lib/routing/urls";
import type { Employee } from "./types";

export interface EmployeesListPageProps {
  initialData?: Employee[];
}

export default function EmployeesListPage({ initialData = [] }: EmployeesListPageProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<Record<string, string>>({});

  const breadcrumbs: Breadcrumb[] = [
    { label: "HR", href: "/hr" },
    { label: "Employees" },
  ];

  const filteredData = useMemo(() => {
    const search = (filters.search ?? "").trim().toLowerCase();
    const status = (filters.status ?? "").trim();
    const department = (filters.department ?? "").trim();
    const location = (filters.location ?? "").trim();

    return initialData.filter((employee) => {
      if (status && employee.status !== status) return false;
      if (department && employee.departmentName !== department) return false;
      if (location && employee.locationName !== location) return false;
      if (!search) return true;

      return [
        employee.employeeNo,
        employee.fullName,
        employee.phone,
        employee.email,
        employee.departmentName,
        employee.locationName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  }, [filters, initialData]);

  const filterFields: FilterField[] = [
    {
      type: "text",
      key: "search",
      label: "Search",
      placeholder: "Search by employee no, name, phone, or email...",
    },
    {
      type: "select",
      key: "department",
      label: "Department",
      placeholder: "All Departments",
      options: Array.from(new Set(initialData.map((item) => item.departmentName).filter(Boolean))).map((value) => ({
        label: String(value),
        value: String(value),
      })),
    },
    {
      type: "select",
      key: "location",
      label: "Location",
      placeholder: "All Locations",
      options: Array.from(new Set(initialData.map((item) => item.locationName).filter(Boolean))).map((value) => ({
        label: String(value),
        value: String(value),
      })),
    },
    {
      type: "select",
      key: "status",
      label: "Status",
      placeholder: "All Statuses",
      options: [
        { label: "Active", value: "ACTIVE" },
        { label: "Inactive", value: "INACTIVE" },
        { label: "Suspended", value: "SUSPENDED" },
        { label: "Terminated", value: "TERMINATED" },
      ],
    },
  ];

  const columns: Column<Employee>[] = [
    { key: "employeeNo", label: "Employee No", sortable: true },
    { key: "fullName", label: "Employee", sortable: true },
    { key: "departmentName", label: "Department", sortable: true, render: (value) => value || "—" },
    { key: "locationName", label: "Location", sortable: true, render: (value) => value || "—" },
    { key: "positionTitle", label: "Position", sortable: true, render: (value) => value || "—" },
    {
      key: "baseSalary",
      label: "Base Salary",
      sortable: true,
      render: (value) =>
        new Intl.NumberFormat("en-ET", {
          style: "currency",
          currency: "ETB",
          minimumFractionDigits: 2,
        }).format(Number(value ?? 0)),
    },
    {
      key: "status",
      label: "Status",
      render: (value) => {
        const status = String(value ?? "INACTIVE").toLowerCase();
        return <StatusBadge status={status === "active" ? "active" : status === "suspended" ? "pending" : "inactive"} />;
      },
    },
  ];

  const tableActions: TableAction[] = [
    {
      label: "View employee",
      icon: <Eye size={16} />,
      onClick: (record) => router.push(publicViewUrl("hr.employee", (record as Employee).publicId)),
    },
    {
      label: "Edit employee",
      icon: <Pencil size={16} />,
      onClick: (record) => router.push(publicEditUrl("hr.employee", (record as Employee).publicId)),
    },
  ];

  const pageActions: Action[] = [
    {
      label: "Create Employee",
      variant: "primary",
      icon: <UserPlus size={16} />,
      onClick: () => router.push("/hr/employees/create"),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title="Employees"
        subtitle="Manage employee master records, assignment, payroll identity, and compliance data from the live HR database."
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <MetricCard label="Total Employees" value={initialData.length} icon={<Users size={18} />} color={colors.primary[600]} borderColor={colors.primary[400]} />
        <MetricCard label="Active" value={initialData.filter((employee) => employee.status === "ACTIVE").length} icon={<UserCheck size={18} />} color={colors.success[600]} borderColor={colors.success[400]} />
        <MetricCard label="Production Linked" value={initialData.filter((employee) => employee.productionRole).length} icon={<UserCog size={18} />} color={colors.warning[700]} borderColor={colors.warning[400]} />
        <MetricCard label="Locations Covered" value={new Set(initialData.map((employee) => employee.locationId).filter(Boolean)).size} icon={<Building2 size={18} />} color={colors.primary[700]} borderColor={colors.primary[300]} />
      </div>

      <FilterCard title="Filter Employees" fields={filterFields} onFilter={setFilters} onReset={() => setFilters({})} />

      <DataTable
        columns={columns}
        data={filteredData}
        actions={tableActions}
        emptyState={
          <EmptyState
            icon={<Users size={32} />}
            title="No employees found"
            message="Employee records will appear here once they are saved to the HR database."
            action={{ label: "Create Employee", onClick: () => router.push("/hr/employees/create") }}
          />
        }
        recordCount={filteredData.length}
      />
    </div>
  );
}
