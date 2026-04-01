/**
 * Chart color constants aligned with the design system CSS variables.
 * Recharts doesn't support CSS variables directly, so we maintain
 * these constants in sync with globals.css.
 */
export const chartColors = {
  primary: "#0D9488",       // --color-primary
  primaryHover: "#0F766E",  // --color-primary-hover
  accent: "#F97316",        // --color-accent-color
  border: "#E7E5E4",        // --color-border
  foreground: "#1C1917",    // --color-foreground
  mutedForeground: "#78716C", // --color-muted-foreground
  success: "#16A34A",       // --color-success
  warning: "#D97706",       // --color-warning
  danger: "#DC2626",        // --color-danger
  // Chart-specific derived colors
  primaryLight: "#99F6E4",  // --color-primary-muted
  secondaryLine: "#94A3B8", // slate-400 for secondary data lines
} as const;
