'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2, Pencil, X, Save, Layers, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { CustomField, CustomFieldType, Group } from '@/lib/contacts-data';

interface Props {
  fields: CustomField[];
  groups: Group[];
  onCreate: (field: CustomField) => void;
  onUpdate: (field: CustomField) => void;
  onDelete: (id: string) => void;
}

const TYPE_LABELS: Record<CustomFieldType, string> = {
  text: 'Text',
  longText: 'Long text',
  number: 'Number',
  date: 'Date',
  dropdown: 'Dropdown',
  multiSelect: 'Multi-select',
  boolean: 'Yes / No',
  url: 'URL',
  email: 'Email',
  phone: 'Phone',
};

export function CustomFieldsManager({ fields, groups, onCreate, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState<CustomField | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold">Custom fields</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Reusable field definitions. Global fields apply to every contact; group fields only show
            for contacts in their groups.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Add field
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-6 text-center">
            No custom fields defined yet.
          </p>
        ) : (
          fields.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-border hover:bg-secondary/40"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{f.name}</p>
                  <Badge variant="outline" className="text-[10px]">
                    {TYPE_LABELS[f.type]}
                  </Badge>
                  {f.isGlobal ? (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <Globe className="w-2.5 h-2.5" />
                      Global
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <Layers className="w-2.5 h-2.5" />
                      {f.groupIds.length} group{f.groupIds.length === 1 ? '' : 's'}
                    </Badge>
                  )}
                </div>
                {f.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{f.description}</p>
                )}
                {f.options && f.options.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    Options: {f.options.map((o) => o.label).join(', ')}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(f)}
                className="text-muted-foreground"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span className="sr-only">Edit</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(f.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
          ))
        )}
      </div>

      <FieldEditorDialog
        open={creating}
        onOpenChange={setCreating}
        groups={groups}
        existingFields={fields}
        onSave={(f) => {
          onCreate(f);
          setCreating(false);
        }}
      />

      <FieldEditorDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        groups={groups}
        existingFields={fields}
        initial={editing ?? undefined}
        onSave={(f) => {
          onUpdate(f);
          setEditing(null);
        }}
      />
    </Card>
  );
}

function FieldEditorDialog({
  open,
  onOpenChange,
  groups,
  existingFields,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  groups: Group[];
  existingFields: CustomField[];
  initial?: CustomField;
  onSave: (f: CustomField) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [type, setType] = useState<CustomFieldType>(initial?.type ?? 'text');
  const [isGlobal, setIsGlobal] = useState(initial?.isGlobal ?? true);
  const [groupIds, setGroupIds] = useState<string[]>(initial?.groupIds ?? []);
  const [options, setOptions] = useState<{ id: string; label: string }[]>(initial?.options ?? []);
  const [optionDraft, setOptionDraft] = useState('');

  // Reset internal state when dialog opens with a different initial
  useMemo(() => {
    if (open) {
      setName(initial?.name ?? '');
      setDescription(initial?.description ?? '');
      setType(initial?.type ?? 'text');
      setIsGlobal(initial?.isGlobal ?? true);
      setGroupIds(initial?.groupIds ?? []);
      setOptions(initial?.options ?? []);
      setOptionDraft('');
    }
  }, [open, initial]);

  const duplicateName = useMemo(() => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) return false;
    return existingFields.some((f) => f.id !== initial?.id && f.name.toLowerCase() === trimmed);
  }, [name, existingFields, initial]);

  const needsOptions = type === 'dropdown' || type === 'multiSelect';

  function toggleGroup(id: string) {
    setGroupIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function addOption() {
    const label = optionDraft.trim();
    if (!label) return;
    const id = 'opt_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
    setOptions((prev) => [...prev, { id, label }]);
    setOptionDraft('');
  }

  function removeOption(id: string) {
    setOptions((prev) => prev.filter((o) => o.id !== id));
  }

  function submit() {
    if (!name.trim()) return;
    if (needsOptions && options.length === 0) return;
    if (!isGlobal && groupIds.length === 0) return;

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');

    const field: CustomField = {
      id: initial?.id ?? `cf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      slug: initial?.slug ?? slug,
      type,
      description: description.trim() || undefined,
      isGlobal,
      groupIds: isGlobal ? [] : groupIds,
      options: needsOptions ? options : undefined,
    };
    onSave(field);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit field' : 'New custom field'}</DialogTitle>
          <DialogDescription>
            Custom fields are reusable. Reuse an existing field instead of creating a duplicate
            where possible.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="cf-name">Name</Label>
            <Input
              id="cf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5"
              placeholder="e.g. Customer Status"
            />
            {duplicateName && (
              <p className="text-xs text-amber-600 mt-1">
                A field with this name already exists. Consider reusing it.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="cf-desc">Description</Label>
            <Input
              id="cf-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1.5"
              placeholder="Optional"
            />
          </div>

          <div>
            <Label className="text-xs">Type</Label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as CustomFieldType)}
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          {needsOptions && (
            <div>
              <Label className="text-xs">Options</Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  value={optionDraft}
                  onChange={(e) => setOptionDraft(e.target.value)}
                  placeholder="Add an option"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addOption();
                    }
                  }}
                />
                <Button type="button" size="sm" variant="outline" onClick={addOption}>
                  Add
                </Button>
              </div>
              <div className="mt-2 space-y-1">
                {options.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-secondary text-sm"
                  >
                    <span>{o.label}</span>
                    <button
                      type="button"
                      onClick={() => removeOption(o.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {options.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Add at least one option.</p>
                )}
              </div>
            </div>
          )}

          <Separator />

          <div>
            <Label className="text-xs">Visibility</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsGlobal(true)}
                className={cn(
                  'rounded-md border px-3 py-2 text-sm font-medium flex items-center gap-2',
                  isGlobal ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary/60'
                )}
              >
                <Globe className="w-3.5 h-3.5" />
                Global
              </button>
              <button
                type="button"
                onClick={() => setIsGlobal(false)}
                className={cn(
                  'rounded-md border px-3 py-2 text-sm font-medium flex items-center gap-2',
                  !isGlobal ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary/60'
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                Specific groups
              </button>
            </div>

            {!isGlobal && (
              <div className="mt-3 space-y-1.5">
                {groups.map((g) => (
                  <label
                    key={g.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary/60 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={groupIds.includes(g.id)}
                      onChange={() => toggleGroup(g.id)}
                      className="rounded border-input"
                    />
                    <span className="text-sm">{g.name}</span>
                  </label>
                ))}
                {groupIds.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Pick at least one group.</p>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={
              !name.trim() ||
              (needsOptions && options.length === 0) ||
              (!isGlobal && groupIds.length === 0)
            }
            className="gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {initial ? 'Save changes' : 'Create field'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
