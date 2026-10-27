"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { colors } from "@/components/ui/colors";
import { decoratedDropdownOptionStyle } from "@/components/shared/dropdown-styles";
import { qcInputStyle } from "./QCWideTable";

export type QCSelectOption = { value: string; label: string; group?: string };

const SEARCH_THRESHOLD = 10;

const GROUP_ORDER = ["ENVIRONMENT", "PROCESSING", "PRODUCT"];

function sortGroupedOptions(options: QCSelectOption[]) {
  return [...options].sort((left, right) => {
    const leftGroup = GROUP_ORDER.indexOf((left.group ?? "").toUpperCase());
    const rightGroup = GROUP_ORDER.indexOf((right.group ?? "").toUpperCase());
    return (leftGroup === -1 ? GROUP_ORDER.length : leftGroup) - (rightGroup === -1 ? GROUP_ORDER.length : rightGroup);
  });
}

export function QCSearchSelect({
  value,
  onChange,
  options,
  placeholder = "Select ...",
  disabled,
  required,
  grouped,
}: {
  value: string;
  onChange: (value: string) => void;
  options: QCSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  grouped?: boolean;
}) {
  const ordered = grouped ? sortGroupedOptions(options) : options;
  const selected = ordered.find((option) => option.value === value);
  const needsSearch = grouped || ordered.length >= SEARCH_THRESHOLD || ordered.some((option) => option.group);

  if (disabled) {
    return (
      <input
        style={qcInputStyle}
        value={selected?.label ?? ""}
        disabled
        readOnly
      />
    );
  }

  if (!needsSearch) {
    const groups = [...new Set(ordered.map((option) => option.group).filter(Boolean))] as string[];
    return (
      <select
        style={qcInputStyle}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{placeholder}</option>
        {groups.length
          ? (
            <>
              {groups.map((group) => (
                <optgroup key={group} label={group}>
                  {ordered
                    .filter((option) => option.group === group)
                    .map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </optgroup>
              ))}
              {ordered
                .filter((option) => !option.group)
                .map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
            </>
          )
          : ordered.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
      </select>
    );
  }

  return (
    <SearchableDropdown
      value={value}
      selectedLabel={selected?.label ?? ""}
      options={ordered}
      placeholder={placeholder}
      required={required}
      onChange={onChange}
    />
  );
}

function SearchableDropdown({
  value,
  selectedLabel,
  options,
  placeholder,
  required,
  onChange,
}: {
  value: string;
  selectedLabel: string;
  options: QCSelectOption[];
  placeholder: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) =>
      `${option.group ?? ""} ${option.label}`.toLowerCase().includes(term),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    requestAnimationFrame(() => searchRef.current?.focus());
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(next: string) {
    onChange(next);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef} style={{ position: "relative", minWidth: 0 }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        style={{
          ...qcInputStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          textAlign: "left",
          cursor: "pointer",
          color: selectedLabel ? colors.text.primary : colors.text.muted,
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {selectedLabel || placeholder}
        </span>
        <span style={{ color: colors.text.secondary, flexShrink: 0 }}>▾</span>
      </button>
      {required ? (
        <input
          tabIndex={-1}
          required
          value={value}
          onChange={() => undefined}
          style={{
            position: "absolute",
            opacity: 0,
            pointerEvents: "none",
            height: 0,
            width: 0,
          }}
        />
      ) : null}
      {open ? (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 80,
            background: "white",
            border: "1px solid #94a3b8",
            borderRadius: 8,
            boxShadow: "0 12px 28px rgba(15, 23, 42, 0.14)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 8, borderBottom: `1px solid ${colors.border}` }}>
            <input
              ref={searchRef}
              style={{ ...qcInputStyle, minHeight: 36, padding: "8px 10px" }}
              placeholder="Search..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div style={{ maxHeight: 240, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "12px 14px", color: colors.text.muted, fontSize: 13 }}>
                No matches
              </div>
            ) : (
              filtered.map((option, index) => {
                const showGroup =
                  option.group &&
                  option.group !== filtered[index - 1]?.group;
                return (
                  <div key={option.value}>
                    {showGroup ? (
                      <div
                        style={{
                          padding: "8px 14px 4px",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#334155",
                          background: "#f8fafc",
                          letterSpacing: 0.3,
                          textTransform: "uppercase",
                        }}
                      >
                        {option.group}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => choose(option.value)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        padding: "10px 14px",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 13,
                        ...decoratedDropdownOptionStyle(option.value === value, false),
                      }}
                      onMouseOver={(event) => {
                        Object.assign(
                          event.currentTarget.style,
                          decoratedDropdownOptionStyle(option.value === value, option.value !== value),
                        );
                      }}
                      onMouseOut={(event) => {
                        Object.assign(
                          event.currentTarget.style,
                          decoratedDropdownOptionStyle(option.value === value, false),
                        );
                      }}
                    >
                      <span>{option.label}</span>
                      {option.value === value ? <span aria-hidden="true">✓</span> : null}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
