"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "cn"

export interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  size?: "sm" | "default" | "lg"
}

const Switch = React.forwardRef<HTMLSpanElement, SwitchProps>(
  ({ className, size = "default", ...props }, ref) => {
    return (
      <SwitchPrimitive.Root
        ref={ref}
        data-slot="switch"
        className={cn(
          "peer inline-flex shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          size === "sm" ? "h-4 w-7" : size === "lg" ? "h-6 w-11" : "h-5 w-9",
          "data-checked:bg-primary data-unchecked:bg-muted-foreground/30 hover:data-unchecked:bg-muted-foreground/40 dark:data-unchecked:bg-neutral-700 dark:hover:data-unchecked:bg-neutral-600",
          className
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb
          data-slot="switch-thumb"
          className={cn(
            "pointer-events-none block rounded-full shadow-xs ring-0 transition-transform duration-200 ease-in-out",
            size === "sm"
              ? "size-3 data-checked:translate-x-3 data-unchecked:translate-x-0"
              : size === "lg"
              ? "size-5 data-checked:translate-x-5 data-unchecked:translate-x-0"
              : "size-4 data-checked:translate-x-4 data-unchecked:translate-x-0",
            // In light mode: track is dark (primary), thumb is white (background).
            // In dark mode: track is light (primary), thumb is dark (background), matching the reference screenshot!
            // When unchecked: thumb is white in light mode, and crisp light off-white in dark mode.
            "data-checked:bg-background data-unchecked:bg-background dark:data-unchecked:bg-neutral-200"
          )}
        />
      </SwitchPrimitive.Root>
    )
  }
)

Switch.displayName = "Switch"

export { Switch }
