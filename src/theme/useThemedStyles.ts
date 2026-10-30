import { useMemo } from "react";
import { useAppTheme } from "@/theme/AppTheme";

type StyleDictionary = Record<string, any>;

const lightStyleCache = new WeakMap<object, StyleDictionary>();

type RgbColor = { r: number; g: number; b: number };

function parseHex(value: string): RgbColor | null {
  if (!value.startsWith("#")) return null;

  const hex = value.slice(1);
  if (!/^[a-f\d]{3}(?:[a-f\d]{1})?$|^[a-f\d]{6}(?:[a-f\d]{2})?$/i.test(hex)) {
    return null;
  }

  const normalized = hex.length <= 4
    ? hex.slice(0, 3).split("").map((digit) => digit + digit).join("")
    : hex.slice(0, 6);

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function luminance({ r, g, b }: RgbColor) {
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

function hasRedHue({ r, g, b }: RgbColor) {
  return r > g * 1.26 && r > b * 1.17 && r - Math.max(g, b) > 17;
}

function lightColor(value: string, property: string, styleName: string) {
  if (value === "transparent" || value.startsWith("rgba(") || value.startsWith("rgb(")) {
    return value;
  }

  const rgb = parseHex(value);
  if (!rgb) return value;

  const brightness = luminance(rgb);
  const red = hasRedHue(rgb);

  if (property === "shadowColor") return "#423532";

  if (property === "color" || property === "textDecorationColor") {
    if (red) return brightness > 135 ? "#873f49" : "#8c3441";
    if (brightness <= 35) return "#ffffff";
    if (brightness < 80) return "#746963";
    if (brightness < 150) return "#615953";
    if (brightness < 210) return "#443c39";
    return "#242120";
  }

  if (property.endsWith("Color") && property.toLowerCase().includes("border")) {
    if (red) return "#b37d83";
    if (brightness >= 195) return "#5b504d";
    if (brightness >= 105) return "#a89994";
    return "#d3c9c5";
  }

  if (property === "backgroundColor") {
    if (red) {
      return brightness >= 105 ? "#a34a56" : "#f0dede";
    }

    if (brightness >= 170) return "#842c37";

    if (/^(container|screen|loading|canvas|root|background|scrollView)$/i.test(styleName)) {
      return "#f3f0ec";
    }

    if (/overlay|backdrop/i.test(styleName)) return "#f1e8e5";

    if (brightness <= 15) return "#ffffff";
    if (brightness < 38) return "#faf6f2";
    if (brightness < 90) return "#efe6e1";
    return "#ded3ce";
  }

  return value;
}

function createLightStyles<T extends StyleDictionary>(baseStyles: T): T {
  const cached = lightStyleCache.get(baseStyles);
  if (cached) return cached as T;

  const converted: StyleDictionary = {};

  for (const [styleName, entry] of Object.entries(baseStyles)) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      converted[styleName] = entry;
      continue;
    }

    const style: Record<string, unknown> = { ...entry };
    for (const [property, value] of Object.entries(style)) {
      if (
        typeof value === "string" &&
        (property === "color" || property.toLowerCase().includes("color"))
      ) {
        style[property] = lightColor(value, property, styleName);
      }
    }

    converted[styleName] = style;
  }

  lightStyleCache.set(baseStyles, converted);
  return converted as T;
}

export function useThemedStyles<T extends StyleDictionary>(baseStyles: T): T {
  const { mode } = useAppTheme();
  return useMemo(
    () => mode === "dark" ? baseStyles : createLightStyles(baseStyles),
    [baseStyles, mode],
  );
}
