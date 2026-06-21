"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, ActionButtons } from "@/components/shared";
import type { Breadcrumb, Action } from "@/components/shared";
import type { Item, Category, ItemType, Unit, TaxCode } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { typography } from "@/components/ui/typography";
import { Package } from "lucide-react";
import * as categoryService from "@/services/master-data/categoryService";
import * as itemTypeService from "@/services/master-data/itemTypeService";
import * as unitService from "@/services/master-data/unitService";
import * as taxCodeService from "@/services/master-data/taxCodeService";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface ItemFormPageProps {
  initialData?: Item;
  onSubmit?: (data: Partial<Item>) => Promise<void>;
  loading?: boolean;
  isEdit?: boolean;
}

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
// Styles
// ----------------------------------------------------------------------------
const formContainer: React.CSSProperties = {
  maxWidth: 900,
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: "24px",
  paddingBottom: 24,
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "16px",
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 24,
};

const cardTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: "#111827",
  margin: "0 0 20px 0",
  paddingBottom: 12,
  borderBottom: "1px solid #f3f4f6",
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const labelStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 500,
  color: "#374151",
};

const inputStyle: React.CSSProperties = {
  height: 48,
  padding: "0 14px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  fontSize: "14px",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  backgroundColor: "#fff",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "auto" as const,
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  height: 90,
  padding: "12px 14px",
  resize: "vertical",
};

const checkStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  height: 40,
  cursor: "pointer",
};

const reqMark: React.CSSProperties = { color: "#ef4444", marginLeft: 2 };

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div style={labelStyle}>
      {children}
      {required && <span style={reqMark}>*</span>}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input style={{ ...inputStyle, ...(props.style || {}) }} {...props} />;
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select style={{ ...selectStyle, ...(props.style || {}) }} {...props} />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea style={{ ...textareaStyle, ...(props.style || {}) }} {...props} />
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <label style={checkStyle}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        style={{ width: 18, height: 18 }}
      />
      <span style={{ fontSize: 14, color: "#374151" }}>{label}</span>
    </label>
  );
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function ItemFormPage({
  initialData,
  onSubmit,
  loading,
  isEdit,
}: ItemFormPageProps) {
  const router = useRouter();

  // Basic Information
  const [itemCode, setItemCode] = useState(initialData?.itemCode || "");
  const [itemName, setItemName] = useState(initialData?.itemName || "");
  const [sku, setSku] = useState(initialData?.sku || "");
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || "");
  const [itemType, setItemType] = useState(initialData?.itemType || "");
  const [uomId, setUomId] = useState(initialData?.uomId || "");
  const [description, setDescription] = useState(
    initialData?.description || "",
  );

  // Stock Level
  const [reorderPoint, setReorderPoint] = useState(
    initialData?.reorderPoint ?? 0,
  );

  // Conditional Pricing
  const [standardCost, setStandardCost] = useState(
    initialData?.standardCost ?? 0,
  );
  const [sellingPrice, setSellingPrice] = useState(
    initialData?.sellingPrice ?? 0,
  );

  // Tracking
  const [batchTracking, setBatchTracking] = useState(
    initialData?.batchTracking || false,
  );
  const [expiryTracking, setExpiryTracking] = useState(
    initialData?.expiryTracking || false,
  );
  const [serialTracking, setSerialTracking] = useState(
    initialData?.serialTracking || false,
  );

  // Tax Settings
  const [vatApplicable, setVatApplicable] = useState(
    initialData?.vatApplicable ?? true,
  );
  const [exciseApplicable, setExciseApplicable] = useState(
    initialData?.exciseApplicable || false,
  );
  const [taxCodeId, setTaxCodeId] = useState(
    initialData?.purchaseTaxCodeId || "",
  );

  // Status
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);

  // Dropdown data
  const [categories, setCategories] = useState<Category[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [taxCodes, setTaxCodes] = useState<TaxCode[]>([]);
  const [dropdownsLoading, setDropdownsLoading] = useState(true);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Conditional pricing visibility
  const normalizedItemType = normalizeItemTypeCode(itemType, itemTypes);
  const showStandardCost = COST_ITEM_TYPES.includes(normalizedItemType);
  const showSellingPrice = normalizedItemType === SELLING_PRICE_ITEM_TYPE;

  // ── Fetch dropdown data from DB services ───────────────────────────────
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
    if (!itemTypes.length || !itemType) return;
    const normalized = normalizeItemTypeCode(itemType, itemTypes);
    if (normalized !== itemType) {
      setItemType(normalized);
    }
  }, [itemTypes, itemType]);

  const handleSubmit = async () => {
    const errs: Record<string, string> = {};
    if (!itemName.trim()) errs.itemName = "Item name is required";
    if (!categoryId) errs.categoryId = "Category is required";
    if (!itemType) errs.itemType = "Item type is required";
    if (!uomId) errs.uomId = "Unit is required";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      if (onSubmit)
        await onSubmit({
          itemCode,
          itemName,
          sku,
          categoryId,
          itemType,
          uomId,
          description,
          reorderPoint,
          batchTracking,
          expiryTracking,
          serialTracking,
          vatApplicable,
          exciseApplicable,
          purchaseTaxCodeId: taxCodeId,
          isActive,
          ...(showStandardCost ? { standardCost } : { standardCost: 0 }),
          ...(showSellingPrice ? { sellingPrice } : { sellingPrice: 0 }),
        });
    } finally {
      setSaving(false);
    }
  };

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Items", href: "/master-data/items" },
    { label: isEdit ? "Edit Item" : "Create Item" },
  ];

  const isSaving = saving || loading;
  const footerActions = [
    {
      label: "Cancel",
      variant: "secondary" as const,
      onClick: () => router.push("/master-data/items"),
    },
    {
      label: isEdit ? "Update Item" : "Save Item",
      variant: "primary" as const,
      onClick: handleSubmit,
      loading: isSaving,
    },
  ];

  if (dropdownsLoading) {
    return (
      <div style={formContainer}>
        <PageHeader
          title={isEdit ? "Edit Item" : "Create Item"}
          breadcrumbs={breadcrumbs}
        />
        <div style={{ padding: 24, color: colors.text.secondary }}>
          Loading form data…
        </div>
      </div>
    );
  }

  return (
    <div style={formContainer}>
      <PageHeader
        title={isEdit ? "Edit Item" : "Create Item"}
        subtitle={
          isEdit
            ? "Update item master information"
            : "Define a new item in the system"
        }
        breadcrumbs={breadcrumbs}
      />

      {/* Card 1: Basic Information */}
      <div style={cardStyle}>
        <h3 style={cardTitle}>Basic Information</h3>
        <div style={grid2}>
          <div style={fieldStyle}>
            <Label>Item Code</Label>
            <Input
              value={itemCode}
              onChange={(e) => setItemCode(e.target.value)}
              placeholder="Auto-generated if you leave blank"
            />
          </div>
          <div style={fieldStyle}>
            <Label required>Item Name</Label>
            <Input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Enter item name"
            />
            {errors.itemName && (
              <span style={{ color: "#ef4444", fontSize: 12 }}>
                {errors.itemName}
              </span>
            )}
          </div>
          <div style={fieldStyle}>
            <Label>SKU / Barcode</Label>
            <Input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="Stock keeping unit or barcode"
            />
          </div>
          <div style={fieldStyle}>
            <Label required>Category</Label>
            <Select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Select category...</option>
              {categories
                .filter((c) => c.isActive)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </Select>
            {errors.categoryId && (
              <span style={{ color: "#ef4444", fontSize: 12 }}>
                {errors.categoryId}
              </span>
            )}
          </div>
          <div style={fieldStyle}>
            <Label required>Item Type</Label>
            <Select
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
            >
              <option value="">Select type...</option>
              {itemTypes
                .filter((t) => t.isActive)
                .map((t) => (
                  <option key={t.id} value={t.code}>
                    {t.name}
                  </option>
                ))}
            </Select>
            {errors.itemType && (
              <span style={{ color: "#ef4444", fontSize: 12 }}>
                {errors.itemType}
              </span>
            )}
          </div>
          <div style={fieldStyle}>
            <Label required>UOM</Label>
            <Select value={uomId} onChange={(e) => setUomId(e.target.value)}>
              <option value="">Select unit...</option>
              {units
                .filter((u) => u.isActive)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.abbreviation})
                  </option>
                ))}
            </Select>
            {errors.uomId && (
              <span style={{ color: "#ef4444", fontSize: 12 }}>
                {errors.uomId}
              </span>
            )}
          </div>
        </div>
        <div style={{ ...fieldStyle, marginTop: 16 }}>
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Item description (optional)"
          />
        </div>
      </div>

      {/* Card 2: Inventory Settings */}
      <div style={cardStyle}>
        <h3 style={cardTitle}>Inventory Settings</h3>
        <div style={grid2}>
          <div style={fieldStyle}>
            <Label>Low Stock Alert Level</Label>
            <Input
              type="number"
              value={reorderPoint}
              onChange={(e) => setReorderPoint(Number(e.target.value))}
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Card 3: Pricing */}
      <div style={cardStyle}>
        <h3 style={cardTitle}>Pricing</h3>
        <div style={grid2}>
          {showStandardCost && (
            <div style={fieldStyle}>
              <Label>Standard Cost</Label>
              <Input
                type="number"
                value={standardCost}
                onChange={(e) => setStandardCost(Number(e.target.value))}
                min="0"
                step="0.01"
              />
            </div>
          )}
          {showSellingPrice && (
            <div style={fieldStyle}>
              <Label>Selling Price</Label>
              <Input
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value))}
                min="0"
                step="0.01"
              />
            </div>
          )}
        </div>
      </div>

      {/* Card 4: Tracking */}
      <div style={cardStyle}>
        <h3 style={cardTitle}>Tracking</h3>
        <div>
          <Checkbox
            label="Track by Batch"
            checked={batchTracking}
            onChange={setBatchTracking}
          />
          <Checkbox
            label="Track by Expiry Date"
            checked={expiryTracking}
            onChange={setExpiryTracking}
          />
          <Checkbox
            label="Track by Serial Number"
            checked={serialTracking}
            onChange={setSerialTracking}
          />
        </div>
      </div>

      {/* Card 5: Tax & Status */}
      <div style={cardStyle}>
        <h3 style={cardTitle}>Tax & Status</h3>
        <div style={grid2}>
          <div>
            <Checkbox
              label="VAT Applicable"
              checked={vatApplicable}
              onChange={setVatApplicable}
            />
            <Checkbox
              label="Excise Applicable"
              checked={exciseApplicable}
              onChange={setExciseApplicable}
            />
          </div>
          <div style={fieldStyle}>
            <Label>Tax Code</Label>
            <Select
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
            </Select>
          </div>
          <div style={fieldStyle}>
            <Label>Status</Label>
            <Select
              value={isActive ? "true" : "false"}
              onChange={(e) => setIsActive(e.target.value === "true")}
              style={{ maxWidth: 300 }}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 12,
          paddingTop: 8,
          paddingBottom: 8,
        }}
      >
        <ActionButtons actions={footerActions} />
      </div>

    </div>
  );
}
