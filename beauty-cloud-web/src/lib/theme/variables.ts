import type { CSSProperties } from "react";

import type { CssVariables } from "@/lib/frappe/types";
import { BEAU_T_CLOUD_PALETTE } from "@/lib/theme/brand-palette";

const FALLBACK_VARIABLES: CssVariables = {
  "--bc-primary": BEAU_T_CLOUD_PALETTE.primary,
  "--bc-primary-soft": BEAU_T_CLOUD_PALETTE.primaryHover,
  "--bc-secondary": BEAU_T_CLOUD_PALETTE.primary,
  "--bc-heading": BEAU_T_CLOUD_PALETTE.plum,
  "--bc-gold": BEAU_T_CLOUD_PALETTE.primary,
  "--bc-accent": BEAU_T_CLOUD_PALETTE.blush,
  "--bc-tan": BEAU_T_CLOUD_PALETTE.plum,
  "--bc-accent-light": BEAU_T_CLOUD_PALETTE.blush,
  "--bc-accent-muted": BEAU_T_CLOUD_PALETTE.blush,
  "--bc-beige": BEAU_T_CLOUD_PALETTE.fog,
  "--bc-beige-dark": BEAU_T_CLOUD_PALETTE.line,
  "--bc-background": BEAU_T_CLOUD_PALETTE.white,
  "--bc-surface": BEAU_T_CLOUD_PALETTE.fog,
  "--bc-text": BEAU_T_CLOUD_PALETTE.body,
  "--bc-muted": BEAU_T_CLOUD_PALETTE.muted,
  "--bc-success": "#059669",
  "--bc-warning": "#D97706",
  "--bc-danger": "#E11D48",
  "--bc-border": BEAU_T_CLOUD_PALETTE.line,
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
