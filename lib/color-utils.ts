/**
 * Color contrast and distinguishability utilities
 */

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

/**
 * Calculate relative luminance (WCAG formula)
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRgb = c / 255;
    return sRgb <= 0.03928 ? sRgb / 12.92 : Math.pow((sRgb + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate WCAG contrast ratio between two colors (1-21)
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 1;

  const l1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const l2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Calculate average hue distance between two hex colors
 * Returns value 0-180 (0 = same hue, 180 = opposite)
 */
function getHueDistance(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 180;

  const hue1 = rgbToHue(...rgb1);
  const hue2 = rgbToHue(...rgb2);
  let distance = Math.abs(hue1 - hue2);
  if (distance > 180) distance = 360 - distance;
  return distance;
}

/**
 * Convert RGB to HSL, return just hue (0-360)
 */
function rgbToHue(r: number, g: number, b: number): number {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;

  if (max === min) {
    h = 0;
  } else if (max === r) {
    h = ((g - b) / (max - min) + (g < b ? 6 : 0)) / 6;
  } else if (max === g) {
    h = ((b - r) / (max - min) + 2) / 6;
  } else {
    h = ((r - g) / (max - min) + 4) / 6;
  }

  return h * 360;
}

/**
 * Check if a color is sufficiently distinguishable from existing colors
 * Returns { isDistinguishable, closestColor, distance }
 */
export function checkColorDistinguishability(
  newHex: string,
  existingHexes: string[]
): {
  isDistinguishable: boolean;
  closestColor: string | null;
  distance: number;
} {
  if (existingHexes.length === 0) {
    return { isDistinguishable: true, closestColor: null, distance: 180 };
  }

  let minDistance = 180;
  let closestColor: string | null = null;

  for (const hex of existingHexes) {
    const distance = getHueDistance(newHex, hex);
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = hex;
    }
  }

  // Consider distinguishable if hue distance > 30 degrees
  // (rough threshold for visually distinct colors)
  const isDistinguishable = minDistance > 30;

  return { isDistinguishable, closestColor, distance: minDistance };
}

/**
 * Map Tailwind color names to hex values
 */
export const TAILWIND_COLOR_MAP: Record<string, string> = {
  blue: '#3b82f6',
  green: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  cyan: '#06b6d4',
  slate: '#64748b',
  purple: '#a855f7',
};
