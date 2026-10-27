"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ActionButtons, EmptyState, FormCard, PageHeader, StatusBadge } from "@/components/shared";
import type { Action, Breadcrumb } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { ArrowLeft, CalendarCheck2, Pencil, UserCog } from "lucide-react";
import { publicEditUrl } from "@/lib/routing/urls";
import type { Employee, EmployeePayrollAssignment } from "./types";

export interface EmployeeDetailPageProps {
  employee?: Employee | null;
  payrollAssignments?: EmployeePayrollAssignment[];
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" });
}

function formatCurrency(value?: number) {
  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
    minimumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

export default function EmployeeDetailPage({ employee, payrollAssignments = [] }: EmployeeDetailPageProps) {
  const router = useRouter();

  if (!employee) {
    return <EmptyState title="Employee not found" message="This employee record only appears when it exists in the HR database." action={{ label: "Back", onClick: () => router.push("/hr/employees") }} />;
  }

  const breadcrumbs: Breadcrumb[] = [
    { label: "HR", href: "/hr" },
    { label: "Employees", href: "/hr/employees" },
    { label: employee.employeeNo },
  ];

  const actions: Action[] = [
    { label: "Back", variant: "secondary", icon: <ArrowLeft size={16} />, onClick: () => router.push("/hr/employees") },
    { label: "Attendance", variant: "secondary", icon: <CalendarCheck2 size={16} />, onClick: () => router.push(`/hr/attendance?employeeId=${employee.id}`) },
    { label: "Payroll Assignments", variant: "secondary", icon: <UserCog size={16} />, onClick: () => router.push(`/hr/payroll-assignments?employeeId=${employee.id}`) },
    { label: "Edit", variant: "primary", icon: <Pencil size={16} />, onClick: () => router.push(publicEditUrl("hr.employee", employee.publicId)) },
  ];

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  };

  const renderField = (label: string, value: React.ReactNode) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", color: colors.text.secondary, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 16, color: colors.text.primary }}>{value || "—"}</span>
    </div>
  );

  const statusVariant =
    employee.status === "ACTIVE"
      ? "active"
      : employee.status === "SUSPENDED"
        ? "pending"
        : "inactive";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        recordKind="hr.employee"
        title={employee.fullName}
        subtitle={`Employee ${employee.employeeNo}`}
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={actions} />}
      />

      <div style={{ padding: 24, borderRadius: 16, border: `1px solid ${colors.primary[200]}`, backgroundColor: colors.primary[50], display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ color: colors.primary[700], fontWeight: 700 }}>{employee.employeeNo}</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: colors.text.primary }}>{employee.fullName}</div>
          <div style={{ color: colors.text.secondary }}>
            {employee.positionTitle || "Position not set"} • {employee.departmentName || "Department not set"} • {employee.locationName || "Location not set"}
          </div>
        </div>
        <StatusBadge status={statusVariant} />
      </div>

      <FormCard title="Personal Information" variant="teal-header">
        <div style={gridStyle}>
          {renderField("Employee No", employee.employeeNo)}
          {renderField("Gender", employee.gender)}
          {renderField("Date of Birth", formatDate(employee.dateOfBirth))}
          {renderField("Phone", employee.phone)}
          {renderField("Email", employee.email)}
          {renderField("Address", employee.address)}
        </div>
      </FormCard>

      <FormCard title="Employment" variant="teal-header">
        <div style={gridStyle}>
          {renderField("Hire Date", formatDate(employee.hireDate))}
          {renderField("Employment Type", employee.employmentType)}
          {renderField("Department", employee.departmentName)}
          {renderField("Location", employee.locationName)}
          {renderField("Position", employee.positionTitle)}
          {renderField("Production Role", employee.productionRole)}
          {renderField("Base Shift", employee.baseShiftCode)}
          {renderField("Manager", employee.managerName)}
          {renderField("Linked User", employee.userName)}
        </div>
      </FormCard>

      <FormCard title="Payroll & Compliance" variant="teal-header">
        <div style={gridStyle}>
          {renderField("Base Salary", formatCurrency(employee.baseSalary))}
          {renderField("Payroll Assignments", payrollAssignments.length ? String(payrollAssignments.length) : "None assigned")}
          {renderField("Bank", employee.bankName)}
          {renderField("Bank Account", employee.bankAccountNumber)}
          {renderField("TIN", employee.tin)}
          {renderField("Pension Number", employee.pensionNumber)}
          {renderField("Medical Certificate Expiry", formatDate(employee.medicalCertificateExpiry))}
        </div>
      </FormCard>

      <FormCard title="Employee Payroll Assignments" variant="teal-header">
        {payrollAssignments.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {payrollAssignments.map((assignment) => (
              <div
                key={assignment.id}
                style={{
                  border: `1px solid ${colors.border}`,
                  borderRadius: 14,
                  padding: "14px 16px",
                  backgroundColor: colors.surface,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: "1 / -1" }}>
                  <strong style={{ color: colors.text.primary }}>{assignment.payrollComponentCode} - {assignment.payrollComponentName}</strong>
                  <span style={{ color: colors.text.secondary, fontSize: 14 }}>{assignment.payrollComponentType} • {assignment.taxable ? "Taxable" : "Non-taxable"}</span>
                </div>
                {renderField("Amount", assignment.amount == null ? "—" : formatCurrency(assignment.amount))}
                {renderField("Rate %", assignment.ratePercent == null ? "—" : `${Number(assignment.ratePercent).toFixed(2)}%`)}
                {renderField("From", formatDate(assignment.effectiveFrom))}
                {renderField("To", formatDate(assignment.effectiveTo))}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, color: colors.text.secondary }}>
            <span>No employee-specific payroll components are assigned yet.</span>
            <div>
              <button
                type="button"
                onClick={() => router.push(`/hr/payroll-assignments?employeeId=${employee.id}`)}
                style={{
                  borderRadius: 12,
                  border: `1px solid ${colors.primary[300]}`,
                  backgroundColor: colors.primary[50],
                  color: colors.primary[700],
                  padding: "10px 14px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Assign payroll components
              </button>
            </div>
          </div>
        )}
      </FormCard>

      <FormCard title="Emergency & Guarantor" variant="teal-header">
        <div style={gridStyle}>
          {renderField("Emergency Contact Name", employee.emergencyContactName)}
          {renderField("Emergency Contact Phone", employee.emergencyContactPhone)}
          {renderField("Guarantor Name", employee.guarantorName)}
          {renderField("Guarantor Phone", employee.guarantorPhone)}
          {renderField("Guarantor Document", employee.guarantorDocumentUrl)}
          {renderField("Created", formatDate(employee.createdAt))}
          {renderField("Updated", formatDate(employee.updatedAt))}
        </div>
      </FormCard>
    </div>
  );
}
