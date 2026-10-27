import { randomUUID } from "crypto";

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { sql } from "@/lib/db";
import { getTaxCodes } from "@/lib/master-data-db";
import {
  get as getCompanySettings,
  update as updateCompanySettings,
} from "@/services/administration/companySettingsService";

function isAdminRole(role?: string | null) {
  const normalized = String(role ?? "").trim().toLowerCase();
  return (
    normalized === "admin" ||
    normalized === "super admin" ||
    normalized === "superadmin"
  );
}

const COMPANY_EXTRA_KEYS = {
  tradeName: "company.tradeName",
  website: "company.website",
  printLogo: "company.printLogo",
  printCompanyName: "company.printCompanyName",
  footerText: "company.footerText",
  signatureLabel: "company.signatureLabel",
  defaultTaxCodeId: "company.defaultTaxCodeId",
  procurementVatEnabled: "company.procurementVatEnabled",
};

async function getCompanyExtraSettings() {
  const rows = await sql<Array<{ key: string; value: string }>>`
    SELECT key, value
    FROM "SystemSetting"
    WHERE key IN (
      ${COMPANY_EXTRA_KEYS.tradeName},
      ${COMPANY_EXTRA_KEYS.website},
      ${COMPANY_EXTRA_KEYS.printLogo},
      ${COMPANY_EXTRA_KEYS.printCompanyName},
      ${COMPANY_EXTRA_KEYS.footerText},
      ${COMPANY_EXTRA_KEYS.signatureLabel},
      ${COMPANY_EXTRA_KEYS.defaultTaxCodeId},
      ${COMPANY_EXTRA_KEYS.procurementVatEnabled}
    )
      AND "isArchived" = false
  `;

  const map = new Map(rows.map((row) => [row.key, row.value]));
  return {
    tradeName: map.get(COMPANY_EXTRA_KEYS.tradeName) ?? "",
    website: map.get(COMPANY_EXTRA_KEYS.website) ?? "",
    printLogo: map.get(COMPANY_EXTRA_KEYS.printLogo) !== "false",
    printCompanyName:
      map.get(COMPANY_EXTRA_KEYS.printCompanyName) !== "false",
    footerText: map.get(COMPANY_EXTRA_KEYS.footerText) ?? "",
    signatureLabel:
      map.get(COMPANY_EXTRA_KEYS.signatureLabel) ?? "Authorized Signature",
    defaultTaxCodeId: map.get(COMPANY_EXTRA_KEYS.defaultTaxCodeId) ?? "",
    procurementVatEnabled:
      map.get(COMPANY_EXTRA_KEYS.procurementVatEnabled) !== "false",
  };
}

async function upsertSystemSetting(key: string, value: string) {
  await sql`
    INSERT INTO "SystemSetting" ("id", "key", "value", "category", "isArchived")
    VALUES (${randomUUID()}, ${key}, ${value}, 'company', false)
    ON CONFLICT ("key")
    DO UPDATE SET
      value = EXCLUDED.value,
      category = EXCLUDED.category,
      "isArchived" = false
  `;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [companyResult, extras, taxCodes] = await Promise.all([
    getCompanySettings(),
    getCompanyExtraSettings(),
    getTaxCodes(),
  ]);

  if (!companyResult.success || !companyResult.data) {
    return NextResponse.json(
      { error: companyResult.error ?? "Failed to load company settings" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    settings: {
      ...companyResult.data,
      ...extras,
    },
    taxCodes: taxCodes
      .filter((taxCode) => taxCode.isActive && String(taxCode.taxType).toUpperCase() === "VAT")
      .sort((left, right) => Number(left.rate ?? 0) - Number(right.rate ?? 0)),
  });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminRole(user.role)) {
    return NextResponse.json(
      { error: "Only administrators can update company settings" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();

    const companyResult = await updateCompanySettings(
      {
        companyName: body.companyName,
        logo: body.logo,
        address: body.address,
        phone: body.phone,
        email: body.email,
        tinNumber: body.tinNumber,
        vatNumber: body.vatNumber,
        defaultCurrency: body.defaultCurrency,
        fiscalYearStart: body.fiscalYearStart,
        invoiceFooter: body.invoiceFooter,
        reportHeaderInfo: body.reportHeaderInfo,
      },
      user.id,
      user.name,
    );

    if (!companyResult.success || !companyResult.data) {
      return NextResponse.json(
        { error: companyResult.error ?? "Failed to update company settings" },
        { status: 400 },
      );
    }

    await Promise.all([
      upsertSystemSetting(
        COMPANY_EXTRA_KEYS.tradeName,
        String(body.tradeName ?? ""),
      ),
      upsertSystemSetting(
        COMPANY_EXTRA_KEYS.website,
        String(body.website ?? ""),
      ),
      upsertSystemSetting(
        COMPANY_EXTRA_KEYS.printLogo,
        String(body.printLogo ?? true),
      ),
      upsertSystemSetting(
        COMPANY_EXTRA_KEYS.printCompanyName,
        String(body.printCompanyName ?? true),
      ),
      upsertSystemSetting(
        COMPANY_EXTRA_KEYS.footerText,
        String(body.footerText ?? ""),
      ),
      upsertSystemSetting(
        COMPANY_EXTRA_KEYS.signatureLabel,
        String(body.signatureLabel ?? "Authorized Signature"),
      ),
      upsertSystemSetting(
        COMPANY_EXTRA_KEYS.defaultTaxCodeId,
        String(body.defaultTaxCodeId ?? ""),
      ),
      upsertSystemSetting(
        COMPANY_EXTRA_KEYS.procurementVatEnabled,
        String(body.procurementVatEnabled ?? true),
      ),
    ]);

    const extras = await getCompanyExtraSettings();

    return NextResponse.json({
      settings: {
        ...companyResult.data,
        ...extras,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update company settings",
      },
      { status: 400 },
    );
  }
}
