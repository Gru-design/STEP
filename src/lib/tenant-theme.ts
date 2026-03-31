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

export function extractTheme(
  settings: Record<string, unknown> | null
): TenantTheme {
  if (!settings) return DEFAULT_THEME;
  const theme = settings.theme as Partial<TenantTheme> | undefined;
  if (!theme) return DEFAULT_THEME;

  return {
    primaryColor: theme.primaryColor ?? DEFAULT_THEME.primaryColor,
    accentColor: theme.accentColor ?? DEFAULT_THEME.accentColor,
    logoUrl: theme.logoUrl ?? DEFAULT_THEME.logoUrl,
    appName: theme.appName ?? DEFAULT_THEME.appName,
  };
}

/**
 * Generate CSS custom property overrides for the tenant theme.
 */
export function themeToCSS(theme: TenantTheme): string {
  if (
    theme.primaryColor === DEFAULT_THEME.primaryColor &&
    theme.accentColor === DEFAULT_THEME.accentColor
  ) {
    return "";
  }

  return `:root {
  --color-primary: ${theme.primaryColor};
  --color-accent-color: ${theme.accentColor};
}`;
}
