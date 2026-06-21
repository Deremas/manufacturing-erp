"use client";

import React, { useState, useEffect } from "react";
import { PageHeader, FormCard, ActionButtons } from "@/components/shared";
import type { Breadcrumb, Action } from "@/components/shared";
import type { Location } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { typography } from "@/components/ui/typography";
import { LocationTypes } from "@/lib/constants";
import { Save, X, MapPin } from "lucide-react";

export interface LocationFormPageProps {
  initialData?: Location;
  onSubmit?: (data: Partial<Location>) => Promise<void>;
  loading?: boolean;
  isEdit?: boolean;
  onBack?: () => void;
}

const pageStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: `${spacing.page.gap}px`,
};

const gridStyle2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "16px",
};

const fieldGroupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const labelStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.medium,
  color: colors.text.secondary,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: "48px",
  padding: "10px 12px",
  border: `1px solid ${colors.border}`,
  borderRadius: "10px",
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

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  height: "96px",
  resize: "vertical",
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

const checkboxStyle: React.CSSProperties = {
  width: "18px",
  height: "18px",
  cursor: "pointer",
  accentColor: colors.primary[600],
};

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.small.fontSize,
  fontWeight: typography.weights.semibold,
  color: colors.text.primary,
  margin: 0,
  marginBottom: "16px",
  paddingBottom: "8px",
  borderBottom: `1px solid ${colors.border}`,
};

const sectionStyle: React.CSSProperties = {
  marginBottom: "24px",
};

const stickyFooterStyle: React.CSSProperties = {
  position: "sticky",
  bottom: 0,
  zIndex: 10,
  backgroundColor: "#f8fafc",
  borderTop: `1px solid ${colors.border}`,
  padding: "16px 40px",
  display: "flex",
  justifyContent: "flex-end",
  gap: "8px",
};

export default function LocationFormPage({
  initialData,
  onSubmit,
  loading,
  isEdit: editMode,
  onBack,
}: LocationFormPageProps) {
  const isEdit = editMode ?? !!initialData;

  const [locationCode, setLocationCode] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationType, setLocationType] = useState("");
  const [address, setAddress] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (initialData) {
      setLocationCode(initialData.locationCode);
      setLocationName(initialData.locationName);
      setLocationType(initialData.locationType ?? "");
      setAddress(initialData.address ?? "");
      setIsActive(initialData.isActive ?? true);
    }
  }, [initialData]);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Administration", href: "/administration" },
    { label: "Locations", href: "/administration/locations" },
    { label: isEdit ? "Edit Location" : "Create Location" },
  ];

  const handleSubmit = async () => {
    if (onSubmit) {
      await onSubmit({
        locationCode,
        locationName,
        locationType,
        address,
        isActive,
      });
    }
  };

  const handleCancel = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  const footerActions: Action[] = [
    {
      label: "Cancel",
      variant: "secondary",
      icon: <X size={16} />,
      onClick: handleCancel,
      disabled: loading,
    },
    {
      label: isEdit ? "Update Location" : "Save Location",
      variant: "primary",
      icon: <Save size={16} />,
      onClick: handleSubmit,
      loading,
    },
  ];

  return (
    <div style={pageStyle}>
      <PageHeader
        title={isEdit ? "Edit Location" : "Create Location"}
        breadcrumbs={breadcrumbs}
      />

      <FormCard
        title="Location Information"
        variant="teal-header"
        icon={<MapPin size={18} />}
      >
        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Location Details</h4>
          <div style={gridStyle2}>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Code</label>
              <input
                type="text"
                value={locationCode}
                onChange={(e) => setLocationCode(e.target.value)}
                style={inputStyle}
                placeholder="e.g. WH-001"
              />
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Name</label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                style={inputStyle}
                placeholder="e.g. Main Warehouse"
              />
            </div>
          </div>

          <div style={gridStyle2}>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Type</label>
              <select
                value={locationType}
                onChange={(e) => setLocationType(e.target.value)}
                style={selectStyle}
              >
                <option value="" disabled>
                  -- Select Type --
                </option>
                {LocationTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Status</label>
              <div style={toggleRowStyle}>
                <input
                  type="checkbox"
                  style={checkboxStyle}
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span style={toggleLabelStyle}>
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Address</h4>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={textareaStyle}
              placeholder="Enter physical address..."
            />
          </div>
        </div>
      </FormCard>

      <div style={stickyFooterStyle}>
        <ActionButtons actions={footerActions} />
      </div>
    </div>
  );
}
