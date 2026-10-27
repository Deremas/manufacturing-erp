"use client";

import { useRef, useState } from "react";
import type { CSSProperties, FocusEvent, InputHTMLAttributes, KeyboardEvent } from "react";

import {
  formatDecimal,
  formatNumberDraft,
  formatQuantity,
  getCursorAfterFormattedNumber,
  parseFormattedNumber,
} from "@/lib/utils/format-number";

type FormattedNumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "inputMode" | "step" | "min"
> & {
  value: number;
  onChange: (value: number) => void;
  decimals?: number;
  style?: CSSProperties;
  /** Arrow-key increment amount. Defaults to 1 when decimals is 0. */
  step?: number;
  min?: number;
};

export function FormattedNumberInput({
  value,
  onChange,
  decimals = 2,
  disabled,
  style,
  step: stepProp,
  min = 0,
  onFocus,
  onBlur,
  onKeyDown,
  ...rest
}: FormattedNumberInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");
  const step = stepProp ?? (decimals === 0 ? 1 : undefined);

  const displayValue = focused
    ? draft
    : decimals === 0
      ? formatQuantity(value)
      : formatDecimal(value, decimals);

  function formatValue(amount: number) {
    return decimals === 0 ? formatQuantity(amount) : formatDecimal(amount, decimals);
  }

  function applyStep(direction: "up" | "down") {
    if (!step || disabled) return;

    const current = focused ? parseFormattedNumber(draft) : value;
    const delta = direction === "up" ? step : -step;
    const next = Math.max(min, current + delta);
    const nextDraft = formatValue(next);

    setFocused(true);
    setDraft(nextDraft);
    onChange(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (step && event.key === "ArrowUp") {
      event.preventDefault();
      applyStep("up");
    } else if (step && event.key === "ArrowDown") {
      event.preventDefault();
      applyStep("down");
    }

    onKeyDown?.(event);
  }

  return (
    <input
      {...rest}
      ref={inputRef}
      type="text"
      inputMode="decimal"
      disabled={disabled}
      style={style}
      value={displayValue}
      onFocus={(event) => {
        setFocused(true);
        setDraft(value === 0 ? "" : formatValue(value));
        event.currentTarget.select();
        onFocus?.(event);
      }}
      onChange={(event) => {
        const { value: rawValue, selectionStart } = event.target;
        const cursor = selectionStart ?? rawValue.length;
        const nextDraft = formatNumberDraft(rawValue, decimals);

        setDraft(nextDraft);
        onChange(parseFormattedNumber(nextDraft));

        requestAnimationFrame(() => {
          const input = inputRef.current;
          if (!input) return;
          const nextCursor = getCursorAfterFormattedNumber(rawValue, nextDraft, cursor);
          input.setSelectionRange(nextCursor, nextCursor);
        });
      }}
      onKeyDown={handleKeyDown}
      onBlur={(event) => {
        setFocused(false);
        if (!event.currentTarget.value.trim()) {
          onChange(0);
        }
        onBlur?.(event);
      }}
    />
  );
}

export function getFormattedNumberInputProps(
  value: number,
  onCommit: (nextValue: number) => void,
  decimals = 2,
) {
  return {
    value,
    onChange: onCommit,
    decimals,
  } as const;
}
