"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { colors } from "@/components/ui/colors";
import { decoratedDropdownListStyle, decoratedDropdownOptionStyle } from "@/components/shared/dropdown-styles";

type Option = { value: string; label: string; itemCode?: string; itemName?: string };

export function ItemSearchSelect({
  value,
  options,
  onChange,
  placeholder = "Search by code or name",
  disabled,
  inputStyle,
}: {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  inputStyle: React.CSSProperties;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const selected = options.find((option) => option.value === value);

  const selectedLabel = (selected?.label ?? "").toLowerCase();
  const term = query.trim().toLowerCase();
  const searching = Boolean(term) && term !== selectedLabel;
  const filtered = useMemo(() => {
    const matches = searching
      ? options.filter((option) => {
          const haystack = `${option.label} ${option.itemCode ?? ""} ${option.itemName ?? ""}`.toLowerCase();
          return haystack.includes(term);
        })
      : options;
    return matches.slice(0, 80);
  }, [options, searching, term]);

  function updatePosition() {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 260),
    });
  }

  function close() {
    setOpen(false);
    setQuery("");
    setHighlight(0);
  }

  function choose(option: Option) {
    onChange(option.value);
    close();
  }

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const onReposition = () => updatePosition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (inputRef.current?.contains(target) || listRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const selectedIndex = filtered.findIndex((option) => option.value === value);
    setHighlight(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, query, value, filtered]);

  useEffect(() => {
    if (!open) return;
    const active = listRef.current?.querySelector("[data-active='true']");
    if (active instanceof HTMLElement) {
      active.scrollIntoView({ block: "nearest" });
    }
  }, [highlight, open, filtered]);

  if (disabled) {
    return <input style={inputStyle} value={selected?.label ?? ""} disabled readOnly />;
  }

  const list = open
    ? createPortal(
        <div
          ref={listRef}
          role="listbox"
          style={{
            position: "fixed",
            top: coords.top,
            left: coords.left,
            width: coords.width,
            ...decoratedDropdownListStyle,
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: "12px 14px", color: colors.text.muted, fontSize: 13 }}>
              {options.length === 0
                ? "No items in master data"
                : searching
                  ? "No matches"
                  : "Type to search by code or name"}
            </div>
          ) : (
            filtered.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === highlight;
              return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                data-active={isActive}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => choose(option)}
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
              );
            })
          )}
        </div>,
        document.body,
      )
    : null;

  return (
    <div style={{ minWidth: 0, width: "100%" }}>
      <input
        ref={inputRef}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-haspopup="listbox"
        autoComplete="off"
        placeholder={placeholder}
        value={open ? query : (selected?.label ?? "")}
        onFocus={() => {
          setQuery(selected?.label ?? "");
          setOpen(true);
          requestAnimationFrame(() => inputRef.current?.select());
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          if (!open) setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!open) {
              setQuery("");
              setOpen(true);
              return;
            }
            setHighlight((current) => Math.min(current + 1, Math.max(filtered.length - 1, 0)));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlight((current) => Math.max(current - 1, 0));
          } else if (event.key === "Enter") {
            if (open && filtered[highlight]) {
              event.preventDefault();
              choose(filtered[highlight]);
            }
          } else if (event.key === "Escape") {
            event.preventDefault();
            close();
            inputRef.current?.blur();
          }
        }}
        style={inputStyle}
      />
      {list}
    </div>
  );
}
