import type { CSSProperties } from "react";

import type { CssVariables } from "@/lib/frappe/types";

const FALLBACK_VARIABLES: CssVariables = {
  "--bc-primary": "#5B2C6F",
  "--bc-secondary": "#E91E8C",
  "--bc-gold": "#E91E8C",
  "--bc-accent": "#F4A5C8",
  "--bc-tan": "#9D4EDD",
  "--bc-background": "#FFFBFC",
  "--bc-surface": "#FFF5F9",
  "--bc-text": "#2D1B36",
  "--bc-muted": "#8B6F96",
  "--bc-success": "#059669",
  "--bc-warning": "#D97706",
  "--bc-danger": "#E11D48",
  "--bc-border": "#F0D9E8",
  "--bc-radius": "0.75rem",
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
