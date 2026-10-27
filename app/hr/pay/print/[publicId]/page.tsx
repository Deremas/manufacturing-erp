import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth/auth";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { get as getCompanySettings } from "@/services/administration/companySettingsService";
import { getPayrollRunById } from "@/services/hr/payroll.service";

export default async function PayrollPrintPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const user = await requireAuth();
  const { publicId } = await params;
  const [payroll, preferences, companyResult] = await Promise.all([
    getPayrollRunById(publicId, { accessibleLocationIds: user.accessibleLocationIds }),
    getSystemPreferences(),
    getCompanySettings(),
  ]);

  if (!payroll) notFound();
  const company = companyResult.success ? companyResult.data : null;
  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: preferences.currencyCode,
    minimumFractionDigits: 2,
  });

  return <section className="print-content" style={{ background: "#fff", color: "#0f172a", padding: 24 }}>
    <header style={{ display: "flex", justifyContent: "space-between", gap: 24, marginBottom: 24 }}>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800 }}>{company?.companyName ?? "NEW ERP"}</div>
        <div style={{ display: "grid", gap: 3, marginTop: 7, color: "#475467" }}>
          {company?.address ? <span>{company.address}</span> : null}
          {company?.phone ? <span>{company.phone}</span> : null}
          {company?.email ? <span>{company.email}</span> : null}
          {company?.tinNumber ? <span>TIN: {company.tinNumber}</span> : null}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 25, fontWeight: 800 }}>Payroll Register</div>
        <div style={{ marginTop: 7 }}>{payroll.payrollNo}</div>
        <div style={{ color: "#475467" }}>{payroll.status}</div>
      </div>
    </header>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 22 }}>
      {[
        ["Period", `${payroll.periodStart.slice(0, 10)} to ${payroll.periodEnd.slice(0, 10)}`],
        ["Payment Date", payroll.paymentDate.slice(0, 10)],
        ["Employees", String(payroll.employeeCount)],
        ["Currency", preferences.currencyCode],
      ].map(([label, value]) => <div key={label} style={{ border: "1px solid #e4e7ec", borderRadius: 12, padding: 12 }}>
        <div style={{ color: "#667085", fontSize: 11, textTransform: "uppercase" }}>{label}</div>
        <strong style={{ display: "block", marginTop: 5 }}>{value}</strong>
      </div>)}
    </div>

    <div style={{ border: "1px solid #e4e7ec", borderRadius: 12, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead><tr style={{ background: "#f8fafc", textAlign: "left" }}>
          {["Employee", "Location", "Base Salary", "Overtime", "Allowances", "Tax", "Pension", "Deductions", "Net Pay"].map((label) => <th key={label} style={{ padding: "10px 8px" }}>{label}</th>)}
        </tr></thead>
        <tbody>{payroll.employees.map((line) => <tr key={line.id} style={{ borderTop: "1px solid #eaecf0" }}>
          <td style={{ padding: "10px 8px" }}><strong>{line.employeeNo}</strong><br />{line.employeeName}</td>
          <td style={{ padding: "10px 8px" }}>{line.locationName ?? "-"}</td>
          <td style={{ padding: "10px 8px" }}>{money.format(line.baseSalary)}</td>
          <td style={{ padding: "10px 8px" }}>{money.format(line.overtimeAmount)}</td>
          <td style={{ padding: "10px 8px" }}>{money.format(line.allowanceAmount + line.bonusAmount)}</td>
          <td style={{ padding: "10px 8px" }}>{money.format(line.incomeTax)}</td>
          <td style={{ padding: "10px 8px" }}>{money.format(line.pensionEmployee)}</td>
          <td style={{ padding: "10px 8px" }}>{money.format(line.totalDeductions)}</td>
          <td style={{ padding: "10px 8px", fontWeight: 800 }}>{money.format(line.netPay)}</td>
        </tr>)}</tbody>
      </table>
    </div>

    <div style={{ marginTop: 18, marginLeft: "auto", width: 360, display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}><span>Gross Pay</span><strong>{money.format(payroll.grossPay)}</strong></div>
      <div style={{ display: "flex", justifyContent: "space-between" }}><span>Total Deductions</span><strong>{money.format(payroll.totalDeductions)}</strong></div>
      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "2px solid #0f172a", paddingTop: 8, fontSize: 16 }}><span>Net Payroll</span><strong>{money.format(payroll.netPay)}</strong></div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 54, marginTop: 60 }}>
      {["Prepared By", "Approved By", "Paid By"].map((label) => <div key={label} style={{ borderTop: "1px solid #0f172a", paddingTop: 7 }}>{label}</div>)}
    </div>
  </section>;
}
