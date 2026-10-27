export interface Employee {
  id: string;
  publicId: number;
  employeeNo: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  fullName: string;
  gender?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  hireDate: string;
  employmentType?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  positionTitle?: string | null;
  productionRole?: string | null;
  baseShiftCode?: string | null;
  managerId?: string | null;
  managerName?: string | null;
  bankId?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  tin?: string | null;
  pensionNumber?: string | null;
  baseSalary: number;
  status: string;
  userId?: string | null;
  userName?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  guarantorName?: string | null;
  guarantorPhone?: string | null;
  guarantorDocumentUrl?: string | null;
  medicalCertificateExpiry?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  paymentJournalId?: string | null;
  paymentJournalNo?: string | null;
  paidAt?: string | null;
}

export interface AttendanceRow {
  id: string;
  employeeId: string;
  employeeNo: string;
  employeeName: string;
  attendanceDate: string;
  locationId?: string | null;
  locationName?: string | null;
  userId?: string | null;
  userName?: string | null;
  shiftSessionId?: string | null;
  shiftCode?: string | null;
  status: string;
  approvalStatus?: string;
  approvedById?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  sourceType: string;
  hoursWorked: number;
  overtimeHours: number;
  remarks?: string | null;
}

export interface OptionItem {
  value: string;
  label: string;
}

export interface LeaveType {
  id: string;
  code: string;
  name: string;
  paid: boolean;
  entitlementDays: number;
  requiresAttachment: boolean;
  approvalLevel: number;
  isActive: boolean;
}

export interface PayrollComponent {
  id: string;
  code: string;
  name: string;
  type: string;
  taxable: boolean;
  recurring: boolean;
  defaultAmount: number;
  ratePercent?: number | null;
  isActive: boolean;
}

export interface EmployeePayrollAssignment {
  id: string;
  employeeId: string;
  employeeNo: string;
  employeeName: string;
  employeeLocationId?: string | null;
  employeeLocationName?: string | null;
  payrollComponentId: string;
  payrollComponentCode: string;
  payrollComponentName: string;
  payrollComponentType: string;
  taxable: boolean;
  amount?: number | null;
  ratePercent?: number | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  remarks?: string | null;
  isActive: boolean;
}

export interface LeaveRequest {
  id: string;
  publicId: number;
  leaveNo: string;
  employeeId: string;
  employeeNo?: string | null;
  employeeName: string;
  leaveTypeId: string;
  leaveTypeName: string;
  departmentId?: string | null;
  departmentName?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string | null;
  attachmentUrl?: string | null;
  status: string;
  managerApprovalStatus?: string | null;
  hrApprovalStatus?: string | null;
  finalApprovalStatus?: string | null;
  requestedById?: string | null;
  requestedByName?: string | null;
  managerApprovedById?: string | null;
  managerApprovedByName?: string | null;
  managerApprovedAt?: string | null;
  hrApprovedById?: string | null;
  hrApprovedByName?: string | null;
  hrApprovedAt?: string | null;
  finalApprovedById?: string | null;
  finalApprovedByName?: string | null;
  finalApprovedAt?: string | null;
  rejectionReason?: string | null;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OvertimeRequest {
  id: string;
  publicId: number;
  overtimeNo: string;
  employeeId: string;
  employeeNo?: string | null;
  employeeName: string;
  departmentId?: string | null;
  departmentName?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  overtimeDate: string;
  shiftCode?: string | null;
  attendanceReferenceId?: string | null;
  hours: number;
  reason?: string | null;
  requestedById?: string | null;
  requestedByName?: string | null;
  approvedById?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  dayType?: string | null;
  rateMultiplier: number;
  amount: number;
  status: string;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollSettings {
  taxPercent: number;
  employeePensionPercent: number;
  employerPensionPercent: number;
  overtimeMultiplier: number;
  normalDayOvertimeMultiplier: number;
  weekendOvertimeMultiplier: number;
  holidayOvertimeMultiplier: number;
  standardWorkDaysPerMonth: number;
  attendanceRequiredForSalary: boolean;
  weekendDays: number[];
  holidayDates: string[];
  salaryExpenseAccountId?: string | null;
  employerPensionExpenseAccountId?: string | null;
  salaryPayableAccountId?: string | null;
  taxPayableAccountId?: string | null;
  pensionPayableAccountId?: string | null;
}

export interface WorkCalendarSettings {
  standardWorkDaysPerMonth: number;
  attendanceRequiredForSalary: boolean;
  weekendDays: number[];
  holidayDates: string[];
  holidayEntries?: HolidayCalendarEntry[];
  holidayTemplates?: HolidayTemplate[];
}

export interface HolidayCalendarEntry {
  id: string;
  name: string;
  date: string;
  sourceType: "CUSTOM" | "GENERATED";
  templateId?: string | null;
  remarks?: string | null;
  isActive: boolean;
}

export interface HolidayTemplate {
  id: string;
  name: string;
  month: number;
  day: number;
  remarks?: string | null;
  isActive: boolean;
}

export interface BulkAttendanceEntry {
  employeeId: string;
  employeeLabel: string;
  status: string;
  hoursWorked: string;
  overtimeHours: string;
  remarks: string;
  selected: boolean;
}

export interface MonthlyAttendanceDay {
  attendanceDate: string;
  dayLabel: string;
  status: string;
  approvalStatus?: string;
  hoursWorked: string;
  overtimeHours: string;
  remarks: string;
  existingId?: string;
}

export interface PayrollRun {
  id: string;
  publicId: number;
  payrollNo: string;
  periodStart: string;
  periodEnd: string;
  paymentDate: string;
  status: string;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  employeeCount: number;
  createdByName?: string | null;
  approvedByName?: string | null;
  postedByName?: string | null;
  paymentJournalId?: string | null;
  paymentJournalNo?: string | null;
  paidAt?: string | null;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollEmployeeLine {
  id: string;
  employeeId: string;
  employeeNo: string;
  employeeName: string;
  locationId?: string | null;
  locationName?: string | null;
  departmentName?: string | null;
  baseSalary: number;
  overtimeAmount: number;
  allowanceAmount: number;
  bonusAmount: number;
  taxableIncome: number;
  incomeTax: number;
  pensionEmployee: number;
  pensionEmployer: number;
  loanDeduction: number;
  otherDeduction: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  remarks?: string | null;
}
