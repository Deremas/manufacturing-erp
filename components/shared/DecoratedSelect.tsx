"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { colors } from "@/components/ui/colors";
import { decoratedDropdownListStyle, decoratedDropdownOptionStyle } from "./dropdown-styles";

export type DecoratedSelectOption = { value: string; label: string; group?: string };

export function DecoratedSelect({
  id,
  value,
  options = [],
  onChange,
  placeholder = "Select",
  allowEmpty = true,
  searchable = false,
  disabled,
  invalid,
  style,
}: {
  id?: string;
  value: string;
  options: DecoratedSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  /** When true, shows a guide row that is selected while value is empty and is not a real option value. */
  allowEmpty?: boolean;
  searchable?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  style?: React.CSSProperties;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, maxHeight: 240 });
  const hasValue = Boolean(value);
  const selected = options.find((option) => option.value === value);
  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(needle) ||
        (option.group ?? "").toLowerCase().includes(needle),
    );
  }, [options, query]);
  const showingPlaceholder = allowEmpty && !query.trim();
  const optionOffset = showingPlaceholder ? 1 : 0;
  const itemCount = optionOffset + filteredOptions.length;

  const selectedIndex = useMemo(() => {
    if (!hasValue && showingPlaceholder) return 0;
    const index = filteredOptions.findIndex((option) => option.value === value);
    return index >= 0 ? index + optionOffset : optionOffset;
  }, [filteredOptions, hasValue, optionOffset, showingPlaceholder, value]);

  function updatePosition() {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mobile = window.innerWidth < 768;
    const viewportPad = mobile ? 16 : 8;
    const available = Math.max(160, window.innerWidth - viewportPad * 2);
    const top = rect.bottom + 4;
    const width = mobile ? available : Math.min(Math.max(rect.width, 180), available);
    const left = mobile
      ? viewportPad
      : Math.min(Math.max(rect.left, viewportPad), window.innerWidth - width - viewportPad);
    setCoords({
      top,
      left,
      width,
      maxHeight: Math.max(140, window.innerHeight - top - viewportPad),
    });
  }

  function close() {
    setOpen(false);
    setQuery("");
  }

  function chooseOption(option: DecoratedSelectOption) {
    onChange(option.value);
    close();
  }

  function chooseHighlighted(index: number) {
    if (allowEmpty && index === 0) {
      if (hasValue) {
        onChange("");
        close();
      }
      return;
    }
    const option = filteredOptions[index - optionOffset];
    if (option) {
      chooseOption(option);
    }
  }

  useLayoutEffect(() => {
    if (!open) return;
    setHighlight(selectedIndex);
    updatePosition();
    if (searchable) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
    const onReposition = () => updatePosition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, searchable, selectedIndex]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || listRef.current?.contains(target)) return;
      close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const active = listRef.current?.querySelector("[data-active='true']");
    if (active instanceof HTMLElement) {
      active.scrollIntoView({ block: "nearest" });
    }
  }, [highlight, open]);

  if (disabled) {
    return <input style={style} value={selected?.label ?? (hasValue ? value : "")} disabled readOnly />;
  }

  const list = open
    ? createPortal(
        <div
          ref={listRef}
          role="listbox"
          style={{
            ...decoratedDropdownListStyle,
            position: "fixed",
            top: coords.top,
            left: coords.left,
            width: coords.width,
            maxHeight: coords.maxHeight,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {searchable ? (
            <div
              style={{
                flexShrink: 0,
                padding: 8,
                borderBottom: `1px solid ${colors.border}`,
                background: colors.surface,
              }}
            >
              <input
                ref={searchRef}
                type="text"
                value={query}
                placeholder="Search item..."
                aria-label="Search item"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setHighlight(0);
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    setHighlight((current) =>
                      event.key === "ArrowDown"
                        ? Math.min(current + 1, Math.max(itemCount - 1, 0))
                        : Math.max(current - 1, 0),
                    );
                  } else if (event.key === "Enter") {
                    event.preventDefault();
                    event.stopPropagation();
                    chooseHighlighted(highlight);
                  }
                }}
                style={{
                  width: "100%",
                  height: 36,
                  borderRadius: 8,
                  border: `1px solid ${colors.inputBorder}`,
                  padding: "0 10px",
                  fontSize: 13,
                  boxSizing: "border-box",
                  color: colors.text.primary,
                  outline: "none",
                }}
              />
            </div>
          ) : null}
          <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
          {showingPlaceholder ? (
            <button
              key="__placeholder__"
              type="button"
              role="option"
              aria-selected={!hasValue}
              data-active={highlight === 0}
              disabled={!hasValue}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setHighlight(0)}
              onClick={() => chooseHighlighted(0)}
              style={{
                width: "100%",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                padding: "9px 12px",
                border: "none",
                cursor: hasValue ? "pointer" : "default",
                fontSize: 13,
                color: colors.text.muted,
                fontStyle: "italic",
                backgroundColor: highlight === 0 ? colors.secondary[50] : "transparent",
                opacity: hasValue ? 0.85 : 1,
              }}
            >
              <span>{placeholder}</span>
              {!hasValue ? <span aria-hidden="true">✓</span> : null}
            </button>
          ) : null}
          {filteredOptions.length === 0 ? (
            <div style={{ padding: "12px", fontSize: 13, color: colors.text.muted }}>
              No matching items
            </div>
          ) : null}
          {filteredOptions.map((option, index) => {
            const listIndex = index + optionOffset;
            const isSelected = option.value === value;
            const isActive = listIndex === highlight;
            const previousGroup = filteredOptions[index - 1]?.group;
            const showGroup = Boolean(option.group) && option.group !== previousGroup;
            return (
              <div key={`${option.value}-${index}`}>
                {showGroup ? (
                  <div
                    role="presentation"
                    style={{
                      padding: "8px 12px 6px",
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: 0.6,
                      textTransform: "uppercase",
                      color: colors.text.secondary,
                      background: "#f8fafc",
                      borderTop: index > 0 || showingPlaceholder ? `1px solid ${colors.border}` : "none",
                    }}
                  >
                    {option.group}
                  </div>
                ) : null}
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-active={isActive}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlight(listIndex)}
                  onClick={() => chooseOption(option)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    padding: "9px 12px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    ...decoratedDropdownOptionStyle(isSelected, isActive),
                  }}
                >
                  <span>{option.label}</span>
                  {isSelected ? <span aria-hidden="true">✓</span> : null}
                </button>
              </div>
            );
          })}
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div style={{ minWidth: 0, width: "100%" }}>
      <button
        id={id}
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) {
              setOpen(true);
              return;
            }
            setHighlight((current) =>
              event.key === "ArrowDown"
                ? Math.min(current + 1, Math.max(itemCount - 1, 0))
                : Math.max(current - 1, 0),
            );
          } else if (event.key === "Enter" && open) {
            event.preventDefault();
            chooseHighlighted(highlight);
          }
        }}
        className={invalid ? "erp-field-trigger erp-field-invalid" : "erp-field-trigger"}
        aria-invalid={invalid || undefined}
        style={{
          ...style,
          appearance: "none",
          WebkitAppearance: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          textAlign: "left",
          cursor: "pointer",
          color: hasValue ? colors.text.primary : colors.text.muted,
          border: style?.border ?? `1px solid ${colors.inputBorder}`,
          backgroundColor: style?.backgroundColor ?? colors.surface,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {hasValue ? (selected?.label ?? value) : placeholder}
        </span>
        <span style={{ color: colors.text.secondary, flexShrink: 0, fontSize: 12 }}>▾</span>
      </button>
      {list}
    </div>
  );
}
