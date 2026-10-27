"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionButtons, FormCard, PageHeader } from "@/components/shared";
import type { Action, Breadcrumb } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { Save, UserRoundPlus, X } from "lucide-react";
import type { Employee, OptionItem } from "./types";
import { publicViewUrlFromPayload } from "@/lib/routing/urls";

export interface EmployeeFormPageProps {
  initialData?: Employee | null;
  departments?: OptionItem[];
  locations?: OptionItem[];
  banks?: OptionItem[];
  users?: OptionItem[];
  shiftDefinitions?: OptionItem[];
  nextEmployeeNo?: string;
  submitEndpoint: string;
  successHref: string;
  isEdit?: boolean;
}

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: colors.text.secondary,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 48,
  border: `1px solid ${colors.inputBorder}`,
  borderRadius: 12,
  padding: "10px 12px",
  fontSize: 15,
  backgroundColor: colors.surface,
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 92,
  height: "auto",
  resize: "vertical",
};

function normalizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default function EmployeeFormPage({
  initialData,
  departments = [],
  locations = [],
  banks = [],
  users = [],
  shiftDefinitions = [],
  nextEmployeeNo,
  submitEndpoint,
  successHref,
  isEdit = false,
}: EmployeeFormPageProps) {
  const router = useRouter();
  const [employeeNo, setEmployeeNo] = useState(initialData?.employeeNo ?? nextEmployeeNo ?? "");
  const [firstName, setFirstName] = useState(initialData?.firstName ?? "");
  const [middleName, setMiddleName] = useState(initialData?.middleName ?? "");
  const [lastName, setLastName] = useState(initialData?.lastName ?? "");
  const [gender, setGender] = useState(initialData?.gender ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(initialData?.dateOfBirth?.slice(0, 10) ?? "");
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [address, setAddress] = useState(initialData?.address ?? "");
  const [hireDate, setHireDate] = useState(initialData?.hireDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [employmentType, setEmploymentType] = useState(initialData?.employmentType ?? "");
  const [departmentId, setDepartmentId] = useState(initialData?.departmentId ?? "");
  const [locationId, setLocationId] = useState(initialData?.locationId ?? "");
  const [positionTitle, setPositionTitle] = useState(initialData?.positionTitle ?? "");
  const [productionRole, setProductionRole] = useState(initialData?.productionRole ?? "");
  const [baseShiftCode, setBaseShiftCode] = useState(initialData?.baseShiftCode ?? "");
  const [managerId, setManagerId] = useState(initialData?.managerId ?? "");
  const [bankId, setBankId] = useState(initialData?.bankId ?? "");
  const [bankAccountNumber, setBankAccountNumber] = useState(initialData?.bankAccountNumber ?? "");
  const [tin, setTin] = useState(initialData?.tin ?? "");
  const [pensionNumber, setPensionNumber] = useState(initialData?.pensionNumber ?? "");
  const [baseSalary, setBaseSalary] = useState(String(initialData?.baseSalary ?? 0));
  const [status, setStatus] = useState(initialData?.status ?? "ACTIVE");
  const [userId, setUserId] = useState(initialData?.userId ?? "");
  const [emergencyContactName, setEmergencyContactName] = useState(initialData?.emergencyContactName ?? "");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(initialData?.emergencyContactPhone ?? "");
  const [guarantorName, setGuarantorName] = useState(initialData?.guarantorName ?? "");
  const [guarantorPhone, setGuarantorPhone] = useState(initialData?.guarantorPhone ?? "");
  const [guarantorDocumentUrl, setGuarantorDocumentUrl] = useState(initialData?.guarantorDocumentUrl ?? "");
  const [medicalCertificateExpiry, setMedicalCertificateExpiry] = useState(initialData?.medicalCertificateExpiry?.slice(0, 10) ?? "");
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const breadcrumbs: Breadcrumb[] = useMemo(
    () => [
      { label: "HR", href: "/hr" },
      { label: "Employees", href: "/hr/employees" },
      { label: isEdit ? "Edit Employee" : "Create Employee" },
    ],
    [isEdit],
  );

  const rowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  };

  const submit = async () => {
    setError("");
    if (!employeeNo.trim() || !firstName.trim() || !lastName.trim() || !hireDate) {
      setError("Employee number, first name, last name, and hire date are required.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(submitEndpoint, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeNo: employeeNo.trim(),
          firstName: firstName.trim(),
          middleName: normalizeOptional(middleName),
          lastName: lastName.trim(),
          gender: normalizeOptional(gender),
          dateOfBirth: normalizeOptional(dateOfBirth),
          phone: normalizeOptional(phone),
          email: normalizeOptional(email),
          address: normalizeOptional(address),
          hireDate,
          employmentType: normalizeOptional(employmentType),
          departmentId: normalizeOptional(departmentId),
          locationId: normalizeOptional(locationId),
          positionTitle: normalizeOptional(positionTitle),
          productionRole: normalizeOptional(productionRole),
          baseShiftCode: normalizeOptional(baseShiftCode),
          managerId: normalizeOptional(managerId),
          bankId: normalizeOptional(bankId),
          bankAccountNumber: normalizeOptional(bankAccountNumber),
          tin: normalizeOptional(tin),
          pensionNumber: normalizeOptional(pensionNumber),
          baseSalary: Number(baseSalary || 0),
          status,
          userId: normalizeOptional(userId),
          emergencyContactName: normalizeOptional(emergencyContactName),
          emergencyContactPhone: normalizeOptional(emergencyContactPhone),
          guarantorName: normalizeOptional(guarantorName),
          guarantorPhone: normalizeOptional(guarantorPhone),
          guarantorDocumentUrl: normalizeOptional(guarantorDocumentUrl),
          medicalCertificateExpiry: normalizeOptional(medicalCertificateExpiry),
          isActive,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; publicId?: number }
        | null;
      if (!response.ok) {
        setError(payload?.error ?? "Failed to save employee.");
        return;
      }

      router.push(publicViewUrlFromPayload("hr.employee", payload, successHref));
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const footerActions: Action[] = [
    {
      label: "Cancel",
      variant: "secondary",
      icon: <X size={16} />,
      onClick: () => router.push("/hr/employees"),
      disabled: saving,
    },
    {
      label: isEdit ? "Update Employee" : "Save Employee",
      variant: "primary",
      icon: <Save size={16} />,
      onClick: submit,
      loading: saving,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title={isEdit ? "Edit Employee" : "Create Employee"}
        subtitle="Capture employee identity, assignment, payroll identity, and emergency/compliance information from the live HR module."
        breadcrumbs={breadcrumbs}
      />

      {error ? (
        <div style={{ padding: "12px 14px", borderRadius: 12, border: `1px solid ${colors.danger[200]}`, backgroundColor: colors.danger[50], color: colors.danger[700] }}>
          {error}
        </div>
      ) : null}

      <FormCard title="Personal Information" variant="teal-header" icon={<UserRoundPlus size={18} />}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={rowStyle}>
            <div style={fieldStyle}><label style={labelStyle}>Employee No *</label><input style={inputStyle} value={employeeNo} onChange={(event) => setEmployeeNo(event.target.value.toUpperCase())} /></div>
            <div style={fieldStyle}><label style={labelStyle}>First Name *</label><input style={inputStyle} value={firstName} onChange={(event) => setFirstName(event.target.value)} /></div>
            <div style={fieldStyle}><label style={labelStyle}>Middle Name</label><input style={inputStyle} value={middleName} onChange={(event) => setMiddleName(event.target.value)} /></div>
            <div style={fieldStyle}><label style={labelStyle}>Last Name *</label><input style={inputStyle} value={lastName} onChange={(event) => setLastName(event.target.value)} /></div>
          </div>
          <div style={rowStyle}>
            <div style={fieldStyle}><label style={labelStyle}>Gender</label><select style={inputStyle} value={gender} onChange={(event) => setGender(event.target.value)}><option value="">Select ...</option><option value="MALE">Male</option><option value="FEMALE">Female</option></select></div>
            <div style={fieldStyle}><label style={labelStyle}>Date of Birth</label><input style={inputStyle} type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} /></div>
            <div style={fieldStyle}><label style={labelStyle}>Phone</label><input style={inputStyle} value={phone} onChange={(event) => setPhone(event.target.value)} /></div>
            <div style={fieldStyle}><label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Address</label>
            <textarea style={textareaStyle} value={address} onChange={(event) => setAddress(event.target.value)} />
          </div>
        </div>
      </FormCard>

      <FormCard title="Employment & Assignment" variant="teal-header">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={rowStyle}>
            <div style={fieldStyle}><label style={labelStyle}>Hire Date *</label><input style={inputStyle} type="date" value={hireDate} onChange={(event) => setHireDate(event.target.value)} /></div>
            <div style={fieldStyle}><label style={labelStyle}>Employment Type</label><input style={inputStyle} value={employmentType} onChange={(event) => setEmploymentType(event.target.value)} placeholder="Permanent, Contract, Temporary..." /></div>
            <div style={fieldStyle}><label style={labelStyle}>Department</label><select style={inputStyle} value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}><option value="">Select ...</option>{departments.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
            <div style={fieldStyle}><label style={labelStyle}>Location</label><select style={inputStyle} value={locationId} onChange={(event) => setLocationId(event.target.value)}><option value="">Select ...</option>{locations.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
          </div>
          <div style={rowStyle}>
            <div style={fieldStyle}><label style={labelStyle}>Position Title</label><input style={inputStyle} value={positionTitle} onChange={(event) => setPositionTitle(event.target.value)} /></div>
            <div style={fieldStyle}><label style={labelStyle}>Production Role</label><input style={inputStyle} value={productionRole} onChange={(event) => setProductionRole(event.target.value)} /></div>
            <div style={fieldStyle}><label style={labelStyle}>Base Shift</label><select style={inputStyle} value={baseShiftCode} onChange={(event) => setBaseShiftCode(event.target.value)}><option value="">Select ...</option>{shiftDefinitions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
            <div style={fieldStyle}><label style={labelStyle}>Manager</label><select style={inputStyle} value={managerId} onChange={(event) => setManagerId(event.target.value)}><option value="">Select ...</option>{users.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
          </div>
          <div style={rowStyle}>
            <div style={fieldStyle}><label style={labelStyle}>Status</label><select style={inputStyle} value={status} onChange={(event) => setStatus(event.target.value)}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="SUSPENDED">Suspended</option><option value="TERMINATED">Terminated</option></select></div>
            <div style={fieldStyle}><label style={labelStyle}>Linked User Account</label><select style={inputStyle} value={userId} onChange={(event) => setUserId(event.target.value)}><option value="">Select ...</option>{users.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
            <div style={{ ...fieldStyle, justifyContent: "end" }}><label style={labelStyle}>Record Active</label><label style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48 }}><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} /> {isActive ? "Active" : "Inactive"}</label></div>
          </div>
        </div>
      </FormCard>

      <FormCard title="Payroll & Compliance" variant="teal-header">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={rowStyle}>
            <div style={fieldStyle}><label style={labelStyle}>Base Salary (ETB)</label><input style={inputStyle} type="number" min={0} value={baseSalary} onChange={(event) => setBaseSalary(event.target.value)} /></div>
            <div style={fieldStyle}><label style={labelStyle}>Bank</label><select style={inputStyle} value={bankId} onChange={(event) => setBankId(event.target.value)}><option value="">Select ...</option>{banks.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
            <div style={fieldStyle}><label style={labelStyle}>Bank Account Number</label><input style={inputStyle} value={bankAccountNumber} onChange={(event) => setBankAccountNumber(event.target.value)} /></div>
            <div style={fieldStyle}><label style={labelStyle}>TIN</label><input style={inputStyle} value={tin} onChange={(event) => setTin(event.target.value)} /></div>
          </div>
          <div style={rowStyle}>
            <div style={fieldStyle}><label style={labelStyle}>Pension Number</label><input style={inputStyle} value={pensionNumber} onChange={(event) => setPensionNumber(event.target.value)} /></div>
            <div style={fieldStyle}><label style={labelStyle}>Medical Certificate Expiry</label><input style={inputStyle} type="date" value={medicalCertificateExpiry} onChange={(event) => setMedicalCertificateExpiry(event.target.value)} /></div>
          </div>
        </div>
      </FormCard>

      <FormCard title="Emergency & Guarantor" variant="teal-header">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={rowStyle}>
            <div style={fieldStyle}><label style={labelStyle}>Emergency Contact Name</label><input style={inputStyle} value={emergencyContactName} onChange={(event) => setEmergencyContactName(event.target.value)} /></div>
            <div style={fieldStyle}><label style={labelStyle}>Emergency Contact Phone</label><input style={inputStyle} value={emergencyContactPhone} onChange={(event) => setEmergencyContactPhone(event.target.value)} /></div>
            <div style={fieldStyle}><label style={labelStyle}>Guarantor Name</label><input style={inputStyle} value={guarantorName} onChange={(event) => setGuarantorName(event.target.value)} /></div>
            <div style={fieldStyle}><label style={labelStyle}>Guarantor Phone</label><input style={inputStyle} value={guarantorPhone} onChange={(event) => setGuarantorPhone(event.target.value)} /></div>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Guarantor Document URL</label>
            <input style={inputStyle} value={guarantorDocumentUrl} onChange={(event) => setGuarantorDocumentUrl(event.target.value)} />
          </div>
        </div>
      </FormCard>

      <div style={{ position: "sticky", bottom: 0, zIndex: 10, backgroundColor: "#f8fafc", borderTop: `1px solid ${colors.border}`, padding: "16px 24px", display: "flex", justifyContent: "flex-end" }}>
        <ActionButtons actions={footerActions} />
      </div>
    </div>
  );
}
