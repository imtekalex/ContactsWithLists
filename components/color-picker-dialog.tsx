'use client';

import { useEffect, useMemo, useState } from 'react';
import { HexColorInput, HexColorPicker } from 'react-colorful';
import { AlertCircle, Check, Plus, X } from 'lucide-react';
import type { GroupColor } from '@/lib/contacts-data';
import { checkColorDistinguishability, hexToRgb, TAILWIND_COLOR_MAP } from '@/lib/color-utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (color: string) => void;
  existingEventColors?: GroupColor[];
  existingCustomHexes?: string[];
};

const EMPTY_GROUP_COLORS: GroupColor[] = [];
const EMPTY_HEX_COLORS: string[] = [];
const DEFAULT_SAVED_COLORS = [
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#14B8A6',
  '#3B82F6',
  '#A855F7',
  '#EC4899',
];
const MAX_SAVED_COLORS = 16;

function normalizeHex(hex: string) {
  return hex.toUpperCase();
}

export function ColorPickerDialog({
  open,
  onOpenChange,
  value,
  onChange,
  existingEventColors = EMPTY_GROUP_COLORS,
  existingCustomHexes = EMPTY_HEX_COLORS,
}: Props) {
  const [hexInput, setHexInput] = useState(value);

  const existingHexes = useMemo(
    () =>
      Array.from(
        new Set([
          ...existingEventColors.map((color) => TAILWIND_COLOR_MAP[color]).filter(Boolean),
          ...existingCustomHexes,
        ])
      ),
    [existingEventColors, existingCustomHexes]
  );
  const existingColorSet = useMemo(
    () => new Set(existingHexes.map((hex) => normalizeHex(hex))),
    [existingHexes]
  );

  const [savedColors, setSavedColors] = useState<string[]>(DEFAULT_SAVED_COLORS);
  const visibleSavedColors = useMemo(
    () => savedColors.filter((hex) => !existingColorSet.has(normalizeHex(hex))),
    [existingColorSet, savedColors]
  );

  useEffect(() => {
    setHexInput((currentColor) => (currentColor === value ? currentColor : value));
  }, [value]);

  const distinguishability = useMemo(
    () => checkColorDistinguishability(hexInput, existingHexes),
    [hexInput, existingHexes]
  );

  function handleColorChange(color: string) {
    setHexInput((currentColor) => (currentColor === color ? currentColor : color));
  }

  const currentRgb = useMemo(() => hexToRgb(hexInput), [hexInput]);

  function handleAddSavedColor() {
    if (!isValidHex) return;
    const normalized = normalizeHex(hexInput);
    setSavedColors((prev) => {
      if (prev.includes(normalized)) return prev;
      return [normalized, ...prev].slice(0, MAX_SAVED_COLORS);
    });
  }

  function handleDeleteSavedColor(color: string) {
    setSavedColors((prev) => prev.filter((saved) => saved !== color));
  }

  function handleConfirm() {
    onChange(hexInput);
    onOpenChange(false);
  }

  const isValidHex = /^#[0-9A-Fa-f]{6}$/.test(hexInput);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pick Event Color</DialogTitle>
          <DialogDescription>
            Choose a color for this event. You can pick from the entire spectrum.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_10rem] md:items-start">
            <div className="overflow-hidden rounded-lg shadow-sm">
              <HexColorPicker
                color={hexInput}
                onChange={handleColorChange}
                className="!h-56 !w-full"
              />
            </div>
            <div className="grid gap-3">
              <div className="grid gap-1">
                <Label htmlFor="color-hex" className="text-xs">
                  Hex
                </Label>
                <HexColorInput
                  id="color-hex"
                  color={hexInput}
                  onChange={handleColorChange}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 md:grid-cols-1">
                <ColorValue label="R" value={currentRgb ? currentRgb[0] : '-'} />
                <ColorValue label="G" value={currentRgb ? currentRgb[1] : '-'} />
                <ColorValue label="B" value={currentRgb ? currentRgb[2] : '-'} />
              </div>
            </div>
          </div>

          {existingHexes.length > 0 &&
            distinguishability &&
            !distinguishability.isDistinguishable && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  This color is too similar to another event color. Consider picking a more distinct
                  color.
                </AlertDescription>
              </Alert>
            )}

          <div className="flex items-center justify-between">
            <Label className="text-xs">Saved colors</Label>
            <Button variant="outline" size="sm" onClick={handleAddSavedColor} className="gap-1">
              <Plus className="w-3.5 h-3.5" />
              Save color
            </Button>
          </div>
          <ColorSwatches
            colors={visibleSavedColors}
            selectedColor={hexInput}
            onSelect={setHexInput}
            onDelete={handleDeleteSavedColor}
          />

          {existingHexes.length > 0 && (
            <div>
              <Label className="text-xs">Existing event colors</Label>
              <ColorSwatches
                colors={existingHexes}
                selectedColor={hexInput}
                onSelect={setHexInput}
              />
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={!isValidHex} className="gap-1.5">
              <Check className="w-3.5 h-3.5" />
              Confirm Color
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ColorValue({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2 text-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="tabular-nums">{value}</p>
    </div>
  );
}

function ColorSwatches({
  colors,
  selectedColor,
  onSelect,
  onDelete,
}: {
  colors: string[];
  selectedColor: string;
  onSelect: (color: string) => void;
  onDelete?: (color: string) => void;
}) {
  if (colors.length === 0) {
    return <p className="text-xs text-muted-foreground">No colors saved.</p>;
  }

  return (
    <div className="mt-2 grid grid-cols-8 gap-2">
      {colors.map((color) => {
        const selected = normalizeHex(color) === normalizeHex(selectedColor);
        return (
          <div key={color} className="group relative h-10 w-10">
            <button
              type="button"
              onClick={() => onSelect(color)}
              className={cn(
                'h-10 w-10 rounded-full border border-border shadow-sm transition-shadow',
                selected && 'ring-2 ring-primary ring-offset-2'
              )}
              style={{ backgroundColor: color }}
              aria-label={`Pick color ${color}`}
            />
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(color)}
                className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground group-hover:flex"
                aria-label={`Delete saved color ${color}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
