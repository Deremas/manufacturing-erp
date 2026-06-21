"use client";

import React, { useState, useEffect } from "react";
import { FormCard, ActionButtons } from "@/components/shared";
import type { Action } from "@/components/shared";
import { itemSchema } from "@/validators/master-data";
import type { ItemInput } from "@/validators/master-data";
import type { Item, Category, ItemType, Unit, TaxCode } from "../types";
import { colors } from "@/components/ui/colors";
import { typography } from "@/components/ui/typography";
import * as categoryService from "@/services/master-data/categoryService";
import * as itemTypeService from "@/services/master-data/itemTypeService";
import * as unitService from "@/services/master-data/unitService";
import * as taxCodeService from "@/services/master-data/taxCodeService";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface ItemFormProps {
  initialData?: Item;
  onSubmit: (data: ItemInput) => Promise<void>;
  loading?: boolean;
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "16px",
};

const gridStyle2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "16px",
};

const fieldGroupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const labelStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.medium,
  color: colors.text.secondary,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  border: `1px solid ${colors.border}`,
  borderRadius: "6px",
  backgroundColor: colors.surface,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  color: colors.text.primary,
  outline: "none",
  boxSizing: "border-box",
  lineHeight: "20px",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
  appearance: "auto",
};

const errorTextStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.caption.fontSize,
  color: colors.danger[600],
  marginTop: "2px",
};

const toggleRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  paddingTop: "4px",
};

const toggleLabelStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  color: colors.text.primary,
};

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.small.fontSize,
  fontWeight: typography.weights.semibold,
  color: colors.text.primary,
  margin: 0,
  marginBottom: "12px",
  paddingBottom: "6px",
  borderBottom: `1px solid ${colors.border}`,
};

const sectionStyle: React.CSSProperties = {
  marginBottom: "20px",
};

const checkboxStyle: React.CSSProperties = {
  width: "18px",
  height: "18px",
  cursor: "pointer",
  accentColor: colors.primary[600],
};

// ----------------------------------------------------------------------------
// Item types that use standardCost
// ----------------------------------------------------------------------------
const COST_ITEM_TYPES = ["RAW", "PACK", "CONS", "SPARE"];
const SELLING_PRICE_ITEM_TYPE = "FG";

function normalizeItemTypeCode(value: string, itemTypes: ItemType[]): string {
  const trimmed = value.trim();
  const match = itemTypes.find(
    (itemType) => itemType.code === trimmed || itemType.name === trimmed,
  );
  return match?.code ?? trimmed;
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function ItemForm({
  initialData,
  onSubmit,
  loading,
}: ItemFormProps) {
  const isEdit = !!initialData;

  const [form, setForm] = useState<ItemInput>({
    itemCode: "",
    itemName: "",
    sku: "",
    description: "",
    categoryId: "",
    itemType: "",
    uomId: "",
    reorderPoint: 0,
    standardCost: 0,
    sellingPrice: 0,
    batchTracking: false,
    expiryTracking: false,
    serialTracking: false,
    purchaseTaxCodeId: "",
    vatApplicable: true,
    exciseApplicable: false,
    isActive: true,
  });

  // Extra tracking fields (not in ItemInput schema but managed locally)
  const [batchTracking, setBatchTracking] = useState(false);
  const [expiryTracking, setExpiryTracking] = useState(false);
  const [serialTracking, setSerialTracking] = useState(false);
  const [taxCodeId, setTaxCodeId] = useState("");

  const [errors, setErrors] = useState<Record<string, string[]>>({});

  // Dropdown data from DB services
  const [categories, setCategories] = useState<Category[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [taxCodes, setTaxCodes] = useState<TaxCode[]>([]);
  const [dropdownsLoading, setDropdownsLoading] = useState(true);

  // Determine if pricing fields should be shown
  const normalizedItemType = normalizeItemTypeCode(form.itemType, itemTypes);
  const showStandardCost = COST_ITEM_TYPES.includes(normalizedItemType);
  const showSellingPrice = normalizedItemType === SELLING_PRICE_ITEM_TYPE;

  // ── Fetch dropdown data from DB services on mount ─────────────────────────
  useEffect(() => {
    async function fetchDropdowns() {
      try {
        const [catResult, itResult, unitResult, taxResult] = await Promise.all([
          categoryService.getAll({ isActive: true }),
          itemTypeService.getAll({ isActive: true }),
          unitService.getAll({ isActive: true }),
          taxCodeService.getAll({ isActive: true }),
        ]);
        setCategories(catResult.items);
        setItemTypes(itResult.items);
        setUnits(unitResult.items);
        setTaxCodes(taxResult.items);
      } catch (err) {
        console.error("Failed to load dropdown data:", err);
      } finally {
        setDropdownsLoading(false);
      }
    }
    fetchDropdowns();
  }, []);

  useEffect(() => {
    if (!itemTypes.length || !form.itemType) return;
    const normalized = normalizeItemTypeCode(form.itemType, itemTypes);
    if (normalized !== form.itemType) {
      setForm((prev) => ({ ...prev, itemType: normalized }));
    }
  }, [itemTypes, form.itemType]);

  // ── Populate form from initialData on edit ────────────────────────────────
  useEffect(() => {
    if (initialData) {
      setForm({
        itemCode: initialData.itemCode,
        itemName: initialData.itemName,
        sku: initialData.sku ?? "",
        description: initialData.description ?? "",
        categoryId: initialData.categoryId ?? "",
        itemType: initialData.itemType ?? "",
        uomId: initialData.uomId ?? "",
        reorderPoint: initialData.reorderPoint ?? 0,
        standardCost: initialData.standardCost ?? 0,
        sellingPrice: initialData.sellingPrice ?? 0,
        batchTracking: initialData.batchTracking ?? false,
        expiryTracking: initialData.expiryTracking ?? false,
        serialTracking: initialData.serialTracking ?? false,
        purchaseTaxCodeId: initialData.purchaseTaxCodeId ?? "",
        vatApplicable: initialData.vatApplicable ?? true,
        exciseApplicable: initialData.exciseApplicable ?? false,
        isActive: initialData.isActive ?? true,
      });
      setBatchTracking(initialData.batchTracking ?? false);
      setExpiryTracking(initialData.expiryTracking ?? false);
      setSerialTracking(initialData.serialTracking ?? false);
      setTaxCodeId(initialData.purchaseTaxCodeId ?? "");
    }
  }, [initialData]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    const checked =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;

    setForm((prev) => ({
      ...prev,
      [name]: checked !== undefined ? checked : value,
    }));

    // Clear field error on change
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value === "" ? 0 : Number(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = itemSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    // Merge tracking and tax fields into payload
    const payload: ItemInput & {
      batchTracking?: boolean;
      expiryTracking?: boolean;
      serialTracking?: boolean;
    } = {
      ...parsed.data,
      batchTracking,
      expiryTracking,
      serialTracking,
      purchaseTaxCodeId: taxCodeId || "",
    };

    await onSubmit(payload as unknown as ItemInput);
  };

  const handleCancel = () => {
    window.history.back();
  };

  const footerActions: Action[] = [
    {
      label: "Cancel",
      variant: "secondary",
      onClick: handleCancel,
      disabled: loading,
    },
    {
      label: isEdit ? "Update Item" : "Save Item",
      variant: "primary",
      onClick: handleSubmit as unknown as () => void,
      loading,
    },
  ];

  // ── Render field helper ───────────────────────────────────────────────────
  const renderField = (
    name: string,
    label: string,
    type: "text" | "select" | "number" = "text",
    options?: { label: string; value: string }[],
    placeholder?: string,
  ) => {
    const hasError = !!errors[name];
    const fieldValue = (form as Record<string, unknown>)[name];

    return (
      <div style={fieldGroupStyle}>
        <label style={labelStyle}>{label}</label>
        {type === "select" && options ? (
          <select
            name={name}
            style={selectStyle}
            value={String(fieldValue ?? "")}
            onChange={handleChange}
          >
            <option value="">{placeholder ?? `Select ${label}`}</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            name={name}
            type={type}
            style={{
              ...inputStyle,
              borderColor: hasError ? colors.danger[500] : colors.border,
            }}
            value={String(fieldValue ?? "")}
            onChange={type === "number" ? handleNumberChange : handleChange}
            placeholder={placeholder ?? `Enter ${label.toLowerCase()}...`}
          />
        )}
        {hasError &&
          errors[name]?.map((err, i) => (
            <span key={i} style={errorTextStyle}>
              {err}
            </span>
          ))}
      </div>
    );
  };

  if (dropdownsLoading) {
    return (
      <FormCard title="Item Information" variant="teal-header">
        <p style={{ padding: "24px", color: colors.text.secondary }}>
          Loading form data…
        </p>
      </FormCard>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormCard
        title="Item Information"
        variant="teal-header"
        footer={{ actions: <ActionButtons actions={footerActions} /> }}
      >
        {/* ── Basic Information ────────────────────────────────────────────── */}
        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Basic Information</h4>
          <div style={gridStyle}>
            {renderField(
              "itemCode",
              "Item Code",
              "text",
              undefined,
              "e.g. ITM-001",
            )}
            {renderField(
              "itemName",
              "Item Name",
              "text",
              undefined,
              "Enter item name",
            )}
            {renderField(
              "sku",
              "SKU / Barcode",
              "text",
              undefined,
              "Stock keeping unit or barcode",
            )}
            {renderField(
              "categoryId",
              "Category",
              "select",
              categories
                .filter((c) => c.isActive)
                .map((c) => ({ label: c.name, value: c.id })),
            )}
            {renderField(
              "itemType",
              "Item Type",
              "select",
              itemTypes
                .filter((t) => t.isActive)
                .map((t) => ({ label: t.name, value: t.code })),
            )}
            {renderField(
              "uomId",
              "UOM",
              "select",
              units
                .filter((u) => u.isActive)
                .map((u) => ({
                  label: `${u.name} (${u.abbreviation})`,
                  value: u.id,
                })),
            )}
          </div>
        </div>

        {/* ── Pricing & Stock Level ────────────────────────────────────────── */}
        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Pricing & Stock Level</h4>
          <div style={gridStyle}>
            {renderField("reorderPoint", "Low Stock Alert Level", "number")}
            {showStandardCost &&
              renderField("standardCost", "Standard Cost", "number")}
            {showSellingPrice &&
              renderField("sellingPrice", "Selling Price", "number")}
          </div>
        </div>

        {/* ── Tracking ─────────────────────────────────────────────────────── */}
        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Tracking</h4>
          <div style={gridStyle}>
            <div style={toggleRowStyle}>
              <input
                type="checkbox"
                style={checkboxStyle}
                checked={batchTracking}
                onChange={(e) => setBatchTracking(e.target.checked)}
              />
              <span style={toggleLabelStyle}>Batch Tracking</span>
            </div>
            <div style={toggleRowStyle}>
              <input
                type="checkbox"
                style={checkboxStyle}
                checked={expiryTracking}
                onChange={(e) => setExpiryTracking(e.target.checked)}
              />
              <span style={toggleLabelStyle}>Expiry Tracking</span>
            </div>
            <div style={toggleRowStyle}>
              <input
                type="checkbox"
                style={checkboxStyle}
                checked={serialTracking}
                onChange={(e) => setSerialTracking(e.target.checked)}
              />
              <span style={toggleLabelStyle}>Serial Tracking</span>
            </div>
          </div>
        </div>

        {/* ── Tax & Status ─────────────────────────────────────────────────── */}
        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Tax & Status</h4>
          <div style={gridStyle}>
            <div>
              <div style={toggleRowStyle}>
                <input
                  name="vatApplicable"
                  type="checkbox"
                  style={checkboxStyle}
                  checked={form.vatApplicable}
                  onChange={handleChange}
                />
                <span style={toggleLabelStyle}>VAT Applicable</span>
              </div>
              <div style={toggleRowStyle}>
                <input
                  name="exciseApplicable"
                  type="checkbox"
                  style={checkboxStyle}
                  checked={form.exciseApplicable}
                  onChange={handleChange}
                />
                <span style={toggleLabelStyle}>Excise Applicable</span>
              </div>
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Tax Code</label>
              <select
                style={selectStyle}
                value={taxCodeId}
                onChange={(e) => setTaxCodeId(e.target.value)}
              >
                <option value="">Select tax code...</option>
                {taxCodes
                  .filter((t) => t.isActive)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.taxName} ({t.rate}%)
                    </option>
                  ))}
              </select>
            </div>
            <div style={toggleRowStyle}>
              <input
                name="isActive"
                type="checkbox"
                style={checkboxStyle}
                checked={form.isActive}
                onChange={handleChange}
              />
              <span style={toggleLabelStyle}>Active</span>
            </div>
          </div>
        </div>
      </FormCard>
    </form>
  );
}
