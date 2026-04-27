"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, ThemeProviderProps, useTheme } from "next-themes"
import { Toaster as SonnerToaster } from "sonner"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      {children}
      <ThemeAwareToaster />
    </NextThemesProvider>
  )
}

function ThemeAwareToaster() {
  const { theme } = useTheme()

  return (
    <SonnerToaster
      theme={theme as "light" | "dark" | "system"}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
    />
  )
}