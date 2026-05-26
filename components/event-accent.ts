import type { CSSProperties } from 'react';
import type { GroupColor } from '@/lib/contacts-data';

type EventAccent = {
  border: string;
  dot: string;
  card: string;
  header: string;
  icon: string;
  rowHeader: string;
  borderStyle?: CSSProperties;
  dotStyle?: CSSProperties;
  cardStyle?: CSSProperties;
  headerStyle?: CSSProperties;
  iconStyle?: CSSProperties;
  rowHeaderStyle?: CSSProperties;
};

const eventAccentPalette: EventAccent[] = [
  {
    border: 'border-blue-500',
    dot: 'bg-blue-600',
    card: 'bg-blue-50/80',
    header: 'bg-blue-50/80',
    icon: 'bg-blue-100 border border-blue-200 text-blue-700',
    rowHeader: 'bg-blue-100/70',
  },
  {
    border: 'border-emerald-500',
    dot: 'bg-emerald-600',
    card: 'bg-emerald-50/80',
    header: 'bg-emerald-50/80',
    icon: 'bg-emerald-100 border border-emerald-200 text-emerald-700',
    rowHeader: 'bg-emerald-100/70',
  },
  {
    border: 'border-amber-500',
    dot: 'bg-amber-600',
    card: 'bg-amber-50/80',
    header: 'bg-amber-50/80',
    icon: 'bg-amber-100 border border-amber-200 text-amber-700',
    rowHeader: 'bg-amber-100/70',
  },
  {
    border: 'border-violet-500',
    dot: 'bg-violet-600',
    card: 'bg-violet-50/80',
    header: 'bg-violet-50/80',
    icon: 'bg-violet-100 border border-violet-200 text-violet-700',
    rowHeader: 'bg-violet-100/70',
  },
  {
    border: 'border-rose-500',
    dot: 'bg-rose-600',
    card: 'bg-rose-50/80',
    header: 'bg-rose-50/80',
    icon: 'bg-rose-100 border border-rose-200 text-rose-700',
    rowHeader: 'bg-rose-100/70',
  },
];

const eventAccentMap: Record<GroupColor, EventAccent> = {
  blue: eventAccentPalette[0],
  green: eventAccentPalette[1],
  amber: eventAccentPalette[2],
  purple: eventAccentPalette[3],
  rose: eventAccentPalette[4],
  cyan: {
    border: 'border-cyan-500',
    dot: 'bg-cyan-600',
    card: 'bg-cyan-50/80',
    header: 'bg-cyan-50/80',
    icon: 'bg-cyan-100 border border-cyan-200 text-cyan-700',
    rowHeader: 'bg-cyan-100/70',
  },
  slate: {
    border: 'border-slate-300',
    dot: 'bg-slate-500',
    card: 'bg-slate-100/80',
    header: 'bg-slate-100/80',
    icon: 'bg-slate-100 border border-slate-200 text-slate-700',
    rowHeader: 'bg-slate-100/70',
  },
};

export function getEventAccentClasses(occurrenceId: string, color?: GroupColor | string) {
  // If color is provided and is a known GroupColor, use the mapped palette
  if (color && color in eventAccentMap) {
    return eventAccentMap[color as GroupColor];
  }

  // If color is a hex string, generate a custom accent object with inline styles.
  if (color && /^#[0-9A-Fa-f]{6}$/.test(color)) {
    return createCustomHexAccent(color);
  }

  // Fall back to hash-based selection from palette
  let hash = 0;
  for (let index = 0; index < occurrenceId.length; index += 1) {
    hash = ((hash << 5) - hash + occurrenceId.charCodeAt(index)) >>> 0;
  }
  return eventAccentPalette[hash % eventAccentPalette.length];
}

function createCustomHexAccent(hex: string): EventAccent {
  return {
    border: 'border-slate-300',
    dot: 'bg-slate-500',
    card: 'bg-background',
    header: 'bg-slate-50',
    icon: 'bg-slate-100 border border-slate-200 text-slate-700',
    rowHeader: 'bg-slate-100/70',
    borderStyle: { borderColor: hex },
    dotStyle: { backgroundColor: hex },
    cardStyle: { backgroundColor: hexToRgba(hex, 0.08) },
    headerStyle: { backgroundColor: hexToRgba(hex, 0.08) },
    iconStyle: { backgroundColor: hexToRgba(hex, 0.1), borderColor: hex, color: hex },
    rowHeaderStyle: { backgroundColor: hexToRgba(hex, 0.08) },
  };
}

function hexToRgba(hex: string, alpha: number) {
  const value = parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
