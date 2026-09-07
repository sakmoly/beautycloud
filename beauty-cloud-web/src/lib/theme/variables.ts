import type { CSSProperties } from "react";

import type { CssVariables } from "@/lib/frappe/types";

const FALLBACK_VARIABLES: CssVariables = {
  "--bc-primary": "#1A1A1A",
  "--bc-secondary": "#C2185B",
  "--bc-accent": "#F4A4B5",
  "--bc-background": "#FFFAFB",
  "--bc-surface": "#FFFFFF",
  "--bc-text": "#1F1F1F",
  "--bc-muted": "#8B7E7E",
  "--bc-success": "#2E7D52",
  "--bc-warning": "#B45309",
  "--bc-danger": "#C62828",
  "--bc-border": "#F0E0E5",
  "--bc-radius": "1.25rem",
};

export function mergeThemeVariables(
  cssVariables?: CssVariables,
): CssVariables {
  return { ...FALLBACK_VARIABLES, ...cssVariables };
}

export function themeVariablesToStyle(
  cssVariables?: CssVariables,
): CSSProperties {
  return mergeThemeVariables(cssVariables) as CSSProperties;
}
