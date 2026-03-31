/**
 * Tenant-level theming (white-label support).
 *
 * Theme settings are stored in tenants.settings JSONB:
 * {
 *   theme: {
 *     primaryColor: "#0D9488",
 *     accentColor: "#F97316",
 *     logoUrl: "https://...",
 *     appName: "MyApp"
 *   }
 * }
 */

export interface TenantTheme {
  primaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  appName: string;
}

const DEFAULT_THEME: TenantTheme = {
  primaryColor: "#0D9488",
  accentColor: "#F97316",
  logoUrl: null,
  appName: "STEP",
};

const HEX_COLOR_RE = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/;

function sanitizeColor(color: unknown, fallback: string): string {
  if (typeof color !== "string") return fallback;
  return HEX_COLOR_RE.test(color) ? color : fallback;
}

export function extractTheme(
  settings: Record<string, unknown> | null
): TenantTheme {
  if (!settings) return DEFAULT_THEME;
  const theme = settings.theme as Partial<TenantTheme> | undefined;
  if (!theme) return DEFAULT_THEME;

  return {
    primaryColor: sanitizeColor(theme.primaryColor, DEFAULT_THEME.primaryColor),
    accentColor: sanitizeColor(theme.accentColor, DEFAULT_THEME.accentColor),
    logoUrl: typeof theme.logoUrl === "string" ? theme.logoUrl : DEFAULT_THEME.logoUrl,
    appName:
      typeof theme.appName === "string" && theme.appName.length <= 50
        ? theme.appName
        : DEFAULT_THEME.appName,
  };
}

/**
 * Returns a safe style object for CSS custom property overrides.
 * Uses React style attribute (no dangerouslySetInnerHTML).
 */
export function themeToStyle(
  theme: TenantTheme
): Record<string, string> | null {
  if (
    theme.primaryColor === DEFAULT_THEME.primaryColor &&
    theme.accentColor === DEFAULT_THEME.accentColor
  ) {
    return null;
  }

  return {
    "--color-primary": theme.primaryColor,
    "--color-accent-color": theme.accentColor,
  } as Record<string, string>;
}
