import { describe, it, expect } from "vitest";
import { extractTheme, themeToStyle } from "@/lib/tenant-theme";

describe("extractTheme", () => {
  it("returns defaults when settings is null", () => {
    const theme = extractTheme(null);
    expect(theme.primaryColor).toBe("#0D9488");
    expect(theme.accentColor).toBe("#F97316");
    expect(theme.appName).toBe("STEP");
    expect(theme.logoUrl).toBeNull();
  });

  it("returns defaults when theme is not set", () => {
    const theme = extractTheme({ other: "value" });
    expect(theme.appName).toBe("STEP");
  });

  it("extracts valid theme", () => {
    const theme = extractTheme({
      theme: {
        primaryColor: "#FF0000",
        accentColor: "#00FF00",
        appName: "MyApp",
        logoUrl: "https://example.com/logo.png",
      },
    });
    expect(theme.primaryColor).toBe("#FF0000");
    expect(theme.accentColor).toBe("#00FF00");
    expect(theme.appName).toBe("MyApp");
    expect(theme.logoUrl).toBe("https://example.com/logo.png");
  });

  it("sanitizes invalid color values (CSS injection prevention)", () => {
    const theme = extractTheme({
      theme: {
        primaryColor: "red; background: url(evil.com)",
        accentColor: "expression(alert(1))",
      },
    });
    // Should fall back to defaults
    expect(theme.primaryColor).toBe("#0D9488");
    expect(theme.accentColor).toBe("#F97316");
  });

  it("rejects non-hex colors", () => {
    const theme = extractTheme({
      theme: {
        primaryColor: "rgb(255,0,0)",
        accentColor: "hsl(120, 100%, 50%)",
      },
    });
    expect(theme.primaryColor).toBe("#0D9488");
    expect(theme.accentColor).toBe("#F97316");
  });

  it("truncates overly long appName", () => {
    const theme = extractTheme({
      theme: {
        appName: "A".repeat(100),
      },
    });
    expect(theme.appName).toBe("STEP"); // Falls back to default
  });

  it("accepts 3-digit hex colors", () => {
    const theme = extractTheme({
      theme: { primaryColor: "#F00" },
    });
    expect(theme.primaryColor).toBe("#F00");
  });
});

describe("themeToStyle", () => {
  it("returns null when theme matches defaults", () => {
    const style = themeToStyle({
      primaryColor: "#0D9488",
      accentColor: "#F97316",
      logoUrl: null,
      appName: "STEP",
    });
    expect(style).toBeNull();
  });

  it("returns CSS custom properties when theme differs", () => {
    const style = themeToStyle({
      primaryColor: "#FF0000",
      accentColor: "#00FF00",
      logoUrl: null,
      appName: "STEP",
    });
    expect(style).not.toBeNull();
    expect(style!["--color-primary"]).toBe("#FF0000");
    expect(style!["--color-accent-color"]).toBe("#00FF00");
  });
});
