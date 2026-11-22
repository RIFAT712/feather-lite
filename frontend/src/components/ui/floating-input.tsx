"use client";

import * as React from "react";
import { cn } from "cn";

export interface FloatingInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  labelBg?: string;
}

export const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  (
    {
      className,
      label,
      id,
      value,
      defaultValue,
      error,
      type = "text",
      onFocus,
      onBlur,
      disabled,
      labelBg = "bg-card",
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const [isFocused, setIsFocused] = React.useState(false);

    // Support both controlled and uncontrolled values
    const hasValue = Boolean(
      (value !== undefined && value !== null && value !== "") ||
      (defaultValue !== undefined && defaultValue !== null && defaultValue !== "")
    );

    // Native datetime-local inputs show placeholder chrome, so float by default
    const isDatetime = type === "datetime-local" || type === "date" || type === "time";
    const isFloating = isFocused || hasValue || isDatetime;

    return (
      <div className="relative w-full">
        <input
          id={inputId}
          ref={ref}
          type={type}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          placeholder=" "
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          className={cn(
            "peer block w-full rounded-md border border-input/90 bg-transparent px-3.5 h-11 text-xs sm:text-sm text-foreground transition-all duration-150 outline-none cursor-text",
            "focus:border-primary focus:ring-1 focus:ring-primary",
            error && "border-destructive focus:border-destructive focus:ring-destructive",
            disabled && "cursor-not-allowed opacity-50 bg-muted/30",
            className
          )}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "pointer-events-none absolute left-2.5 px-1.5 py-0.5 transition-all duration-150 select-none rounded-xs z-10 flex items-center gap-0.5",
            labelBg,
            isFloating
              ? "top-0 -translate-y-1/2 text-xs font-medium leading-none"
              : "top-1/2 -translate-y-1/2 text-xs sm:text-sm text-muted-foreground",
            isFocused
              ? "text-primary font-semibold"
              : isFloating
              ? "text-muted-foreground font-medium"
              : "text-muted-foreground",
            error && "text-destructive"
          )}
        >
          <span>{label}</span>
          {props.required && <span className="text-destructive">*</span>}
        </label>
        {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
      </div>
    );
  }
);
FloatingInput.displayName = "FloatingInput";

export interface FloatingTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  labelBg?: string;
}

export const FloatingTextarea = React.forwardRef<HTMLTextAreaElement, FloatingTextareaProps>(
  (
    {
      className,
      label,
      id,
      value,
      defaultValue,
      error,
      onFocus,
      onBlur,
      disabled,
      rows = 3,
      labelBg = "bg-card",
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const [isFocused, setIsFocused] = React.useState(false);

    const hasValue = Boolean(
      (value !== undefined && value !== null && value !== "") ||
      (defaultValue !== undefined && defaultValue !== null && defaultValue !== "")
    );

    const isFloating = isFocused || hasValue;

    return (
      <div className="relative w-full">
        <textarea
          id={inputId}
          ref={ref}
          rows={rows}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          placeholder=" "
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          className={cn(
            "peer block w-full rounded-md border border-input/90 bg-transparent px-3.5 py-3 text-xs sm:text-sm text-foreground transition-all duration-150 outline-none leading-relaxed cursor-text",
            "focus:border-primary focus:ring-1 focus:ring-primary",
            error && "border-destructive focus:border-destructive focus:ring-destructive",
            disabled && "cursor-not-allowed opacity-50 bg-muted/30",
            className
          )}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "pointer-events-none absolute left-2.5 px-1.5 py-0.5 transition-all duration-150 select-none rounded-xs z-10 flex items-center gap-0.5",
            labelBg,
            isFloating
              ? "top-0 -translate-y-1/2 text-xs font-medium leading-none"
              : "top-3 text-xs sm:text-sm text-muted-foreground",
            isFocused
              ? "text-primary font-semibold"
              : isFloating
              ? "text-muted-foreground font-medium"
              : "text-muted-foreground",
            error && "text-destructive"
          )}
        >
          <span>{label}</span>
          {props.required && <span className="text-destructive">*</span>}
        </label>
        {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
      </div>
    );
  }
);
FloatingTextarea.displayName = "FloatingTextarea";
