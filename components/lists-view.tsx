'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ListIcon,
  Plus,
  Printer,
  Mail,
  Trash2,
  Sparkles,
  Hand,
  ChevronLeft,
  Check,
  Filter,
  Pencil,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  type Contact,
  type ContactList,
  type CustomField,
  type Group,
  type GroupColor,
  STANDARD_SEARCHABLE_FIELDS,
  resolveListMembers,
} from '@/lib/contacts-data';

type ColorClass = { dot: string; bg: string; text: string; ring: string };

interface Props {
  lists: ContactList[];
  contacts: Contact[];
  groups: Group[];
  customFields: CustomField[];
  groupColorClasses: Record<GroupColor, ColorClass>;
  onCreateList: (list: Omit<ContactList, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateList: (list: ContactList) => void;
  onDeleteList: (id: string) => void;
  onPrintList: (list: ContactList) => void;
  onCopyEmails: (contacts: Contact[]) => void;
}

function removeManualListMember(list: ContactList, contactId: string): ContactList {
  return {
    ...list,
    contactIds: (list.contactIds ?? []).filter((cid) => cid !== contactId),
    updatedAt: Date.now(),
  };
}

// ----- Filter state shared between create + edit dialogs -----------------

type FilterDraft = {
  starredOnly: boolean;
  groupIds: string[];
  advancedQuery: string;
  advancedFieldKeys: string[];
};

const EMPTY_DRAFT: FilterDraft = {
  starredOnly: false,
  groupIds: [],
  advancedQuery: '',
  advancedFieldKeys: [],
};

function draftFromList(list: ContactList): FilterDraft {
  const f = list.filter ?? {};
  const groupIds = f.groupIds && f.groupIds.length > 0 ? f.groupIds : f.groupId ? [f.groupId] : [];
  return {
    starredOnly: !!f.starred,
    groupIds,
    advancedQuery: f.advancedSearch?.query ?? '',
    advancedFieldKeys: f.advancedSearch?.fieldKeys ?? [],
  };
}

function draftToFilter(d: FilterDraft): NonNullable<ContactList['filter']> {
  const filter: NonNullable<ContactList['filter']> = {};
  if (d.starredOnly) filter.starred = true;
  if (d.groupIds.length > 0) filter.groupIds = d.groupIds;
  if (d.advancedQuery.trim() && d.advancedFieldKeys.length > 0) {
    filter.advancedSearch = {
      query: d.advancedQuery.trim(),
      fieldKeys: d.advancedFieldKeys,
    };
  }
  return filter;
}

export function ListsView({
  lists,
  contacts,
  groups,
  customFields,
  groupColorClasses,
  onCreateList,
  onUpdateList,
  onDeleteList,
  onPrintList,
  onCopyEmails,
}: Props) {
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const activeList = lists.find((l) => l.id === activeListId) ?? null;

  return (
    <div className="flex-1 overflow-hidden flex">
      {/* Lists sidebar */}
      <aside className="w-[340px] border-r border-border bg-card flex flex-col">
        <header className="px-5 py-4 border-b border-border flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Lists</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lists.length} saved list{lists.length === 1 ? '' : 's'}
            </p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            New List
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto">
          {lists.length === 0 ? (
            <div className="p-8 text-center">
              <ListIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No lists yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {lists.map((l) => {
                const members = resolveListMembers(l, contacts, customFields);
                return (
                  <li key={l.id}>
                    <button
                      onClick={() => setActiveListId(l.id)}
                      className={cn(
                        'w-full text-left px-5 py-3 transition-colors',
                        activeListId === l.id ? 'bg-secondary' : 'hover:bg-secondary/40'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {l.type === 'dynamic' ? (
                          <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                        ) : (
                          <Hand className="w-3.5 h-3.5 text-blue-600" />
                        )}
                        <p className="text-sm font-semibold truncate">{l.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {l.description}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] capitalize px-1.5 py-0">
                          {l.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {members.length} contacts
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Detail */}
      <main className="flex-1 overflow-y-auto bg-background">
        {activeList ? (
          <ListDetail
            list={activeList}
            contacts={contacts}
            groups={groups}
            customFields={customFields}
            groupColorClasses={groupColorClasses}
            onUpdateList={onUpdateList}
            onDeleteList={(id) => {
              onDeleteList(id);
              setActiveListId(null);
            }}
            onPrintList={onPrintList}
            onCopyEmails={onCopyEmails}
            onBack={() => setActiveListId(null)}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-center px-6">
            <div>
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <ListIcon className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold">Pick a list</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Manual lists hold a fixed selection of contacts. Dynamic lists update automatically
                based on a saved filter.
              </p>
            </div>
          </div>
        )}
      </main>

      <CreateListDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        groups={groups}
        customFields={customFields}
        groupColorClasses={groupColorClasses}
        onCreate={(list) => {
          onCreateList(list);
          setCreateOpen(false);
        }}
      />
    </div>
  );
}

function ListDetail({
  list,
  contacts,
  groups,
  customFields,
  groupColorClasses,
  onUpdateList,
  onDeleteList,
  onPrintList,
  onCopyEmails,
  onBack,
}: {
  list: ContactList;
  contacts: Contact[];
  groups: Group[];
  customFields: CustomField[];
  groupColorClasses: Record<GroupColor, ColorClass>;
  onUpdateList: (list: ContactList) => void;
  onDeleteList: (id: string) => void;
  onPrintList: (list: ContactList) => void;
  onCopyEmails: (contacts: Contact[]) => void;
  onBack: () => void;
}) {
  const members = useMemo(
    () => resolveListMembers(list, contacts, customFields),
    [list, contacts, customFields]
  );
  const [editFilterOpen, setEditFilterOpen] = useState(false);

  function removeMember(id: string) {
    if (list.type !== 'manual') return;
    onUpdateList(removeManualListMember(list, id));
  }

  return (
    <div>
      <div className="px-8 py-5 border-b border-border flex items-start gap-4">
        <Button size="sm" variant="ghost" onClick={onBack} className="md:hidden gap-1.5">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {list.type === 'dynamic' ? (
              <Sparkles className="w-4 h-4 text-violet-600" />
            ) : (
              <Hand className="w-4 h-4 text-blue-600" />
            )}
            <h2 className="text-2xl font-semibold tracking-tight truncate">{list.name}</h2>
            <Badge variant="outline" className="capitalize">
              {list.type}
            </Badge>
          </div>
          {list.description && (
            <p className="text-sm text-muted-foreground mt-1">{list.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1.5">
            {members.length} contact{members.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCopyEmails(members)}
            className="gap-1.5"
          >
            <Mail className="w-3.5 h-3.5" /> Copy emails
          </Button>
          <Button size="sm" variant="outline" onClick={() => onPrintList(list)} className="gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDeleteList(list.id)}
            className="gap-1.5 text-destructive hover:text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete list
          </Button>
        </div>
      </div>

      <div className="px-8 py-6">
        {list.type === 'dynamic' && (
          <Card className="p-4 mb-4 bg-secondary/40">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Filter
                </p>
                <FilterSummary filter={list.filter} groups={groups} customFields={customFields} />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditFilterOpen(true)}
                className="gap-1.5 flex-shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit filter
              </Button>
            </div>
          </Card>
        )}

        {members.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-sm text-muted-foreground">No contacts in this list yet.</p>
          </Card>
        ) : (
          <Card className="divide-y divide-border">
            {members.map((c) => {
              const cgroups = groups.filter((g) => c.groupIds.includes(g.id));
              return (
                <div key={c.id} className="px-4 py-3 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {(c.firstName[0] ?? '') + (c.lastName[0] ?? '')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {c.firstName} {c.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.title}
                      {c.title && c.company && ' · '}
                      {c.company}
                    </p>
                  </div>
                  <div className="hidden md:flex flex-wrap gap-1 max-w-[40%] justify-end">
                    {cgroups.map((g) => {
                      const cc = groupColorClasses[g.color];
                      return (
                        <span
                          key={g.id}
                          className={cn(
                            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                            cc.bg,
                            cc.text
                          )}
                        >
                          <span className={cn('w-1 h-1 rounded-full', cc.dot)} />
                          {g.name}
                        </span>
                      );
                    })}
                  </div>
                  {list.type === 'manual' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeMember(c.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              );
            })}
          </Card>
        )}
      </div>

      {list.type === 'dynamic' && (
        <EditFilterDialog
          open={editFilterOpen}
          onOpenChange={setEditFilterOpen}
          list={list}
          groups={groups}
          customFields={customFields}
          groupColorClasses={groupColorClasses}
          onSave={(filter) => {
            onUpdateList({ ...list, filter, updatedAt: Date.now() });
            setEditFilterOpen(false);
          }}
        />
      )}
    </div>
  );
}

function FilterSummary({
  filter,
  groups,
  customFields,
}: {
  filter: ContactList['filter'];
  groups: Group[];
  customFields: CustomField[];
}) {
  const f = filter ?? {};
  const groupIds = f.groupIds && f.groupIds.length > 0 ? f.groupIds : f.groupId ? [f.groupId] : [];

  const fieldLabel = (key: string) => {
    if (key.startsWith('cf:')) {
      const id = key.slice(3);
      return customFields.find((cf) => cf.id === id)?.name ?? key;
    }
    return STANDARD_SEARCHABLE_FIELDS.find((s) => s.key === key)?.label ?? key;
  };

  const empty =
    !f.starred &&
    groupIds.length === 0 &&
    !f.search &&
    !f.customField &&
    (!f.advancedSearch ||
      !f.advancedSearch.query.trim() ||
      f.advancedSearch.fieldKeys.length === 0);

  if (empty) {
    return (
      <p className="text-sm text-muted-foreground italic mt-1">
        No filter — matches every contact.
      </p>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
      {f.starred && <Badge variant="secondary">Starred only</Badge>}
      {groupIds.map((gid) => (
        <Badge key={gid} variant="secondary">
          Group: {groups.find((g) => g.id === gid)?.name ?? '—'}
        </Badge>
      ))}
      {f.search && <Badge variant="secondary">Search: &ldquo;{f.search}&rdquo;</Badge>}
      {f.customField && <Badge variant="secondary">Custom field match</Badge>}
      {f.advancedSearch &&
        f.advancedSearch.query.trim() &&
        f.advancedSearch.fieldKeys.length > 0 && (
          <Badge variant="secondary" className="gap-1">
            <Filter className="w-3 h-3" />
            Text &ldquo;{f.advancedSearch.query}&rdquo; in{' '}
            {f.advancedSearch.fieldKeys.map(fieldLabel).join(', ')}
          </Badge>
        )}
    </div>
  );
}

// ----- Reusable filter builder -------------------------------------------

function DynamicFilterBuilder({
  draft,
  setDraft,
  groups,
  customFields,
  groupColorClasses,
}: {
  draft: FilterDraft;
  setDraft: (next: FilterDraft) => void;
  groups: Group[];
  customFields: CustomField[];
  groupColorClasses: Record<GroupColor, ColorClass>;
}) {
  const fieldOptions = useMemo(
    () => [
      ...STANDARD_SEARCHABLE_FIELDS.map((s) => ({
        key: s.key as string,
        label: s.label,
        kind: 'standard' as const,
      })),
      ...customFields.map((cf) => ({
        key: `cf:${cf.id}`,
        label: cf.name,
        kind: 'custom' as const,
      })),
    ],
    [customFields]
  );

  function toggleGroup(id: string) {
    setDraft({
      ...draft,
      groupIds: draft.groupIds.includes(id)
        ? draft.groupIds.filter((gid) => gid !== id)
        : [...draft.groupIds, id],
    });
  }

  function toggleField(key: string) {
    setDraft({
      ...draft,
      advancedFieldKeys: draft.advancedFieldKeys.includes(key)
        ? draft.advancedFieldKeys.filter((k) => k !== key)
        : [...draft.advancedFieldKeys, key],
    });
  }

  function selectAllFields() {
    setDraft({ ...draft, advancedFieldKeys: fieldOptions.map((f) => f.key) });
  }

  function clearFields() {
    setDraft({ ...draft, advancedFieldKeys: [] });
  }

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-xs">Groups</Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          Match any of the selected groups (logical OR). Leave empty to match all groups.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {groups.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No groups yet.</p>
          ) : (
            groups.map((g) => {
              const c = groupColorClasses[g.color];
              const active = draft.groupIds.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGroup(g.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                    active
                      ? cn(c.bg, c.text, 'border-transparent')
                      : 'border-border text-muted-foreground hover:bg-secondary'
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full', c.dot)} />
                  {g.name}
                </button>
              );
            })
          )}
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox
          checked={draft.starredOnly}
          onCheckedChange={(v) => setDraft({ ...draft, starredOnly: v === true })}
        />
        <span className="text-sm">Only starred contacts</span>
      </label>

      <Separator />

      <div>
        <div className="flex items-baseline justify-between">
          <Label className="text-xs">Advanced text filter</Label>
          {draft.advancedFieldKeys.length > 0 && (
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {draft.advancedFieldKeys.length} field
              {draft.advancedFieldKeys.length === 1 ? '' : 's'} selected
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Find contacts where any of the selected fields contain this text. Letters, numbers,
          symbols, and spaces all count — partial matches work too (e.g. &ldquo;Apt 4-B&rdquo;,
          &ldquo;+49 170&rdquo;).
        </p>
        <div className="mt-2 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={draft.advancedQuery}
            onChange={(e) => setDraft({ ...draft, advancedQuery: e.target.value })}
            placeholder="Type any text to search for..."
            className="pl-9"
          />
        </div>

        <div className="mt-3 rounded-md border border-border">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-secondary/30">
            <span className="text-xs font-semibold">Fields to search</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAllFields}
                className="text-xs text-primary hover:underline"
              >
                Select all
              </button>
              <span className="text-xs text-muted-foreground">·</span>
              <button
                type="button"
                onClick={clearFields}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="p-3 max-h-56 overflow-y-auto">
            <FieldGroup
              title="Standard fields"
              options={fieldOptions.filter((o) => o.kind === 'standard')}
              selected={draft.advancedFieldKeys}
              onToggle={toggleField}
            />
            {fieldOptions.some((o) => o.kind === 'custom') && (
              <>
                <Separator className="my-3" />
                <FieldGroup
                  title="Custom fields"
                  options={fieldOptions.filter((o) => o.kind === 'custom')}
                  selected={draft.advancedFieldKeys}
                  onToggle={toggleField}
                />
              </>
            )}
          </div>
        </div>

        {draft.advancedQuery.trim() && draft.advancedFieldKeys.length === 0 && (
          <p className="mt-2 text-xs text-amber-700">
            Choose at least one field for the text filter to take effect.
          </p>
        )}
      </div>
    </div>
  );
}

function FieldGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: { key: string; label: string }[];
  selected: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        {title}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = selected.includes(o.key);
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onToggle(o.key)}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors',
                active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-foreground hover:bg-secondary'
              )}
            >
              {active && <Check className="w-3 h-3" />}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ----- Create dialog -----------------------------------------------------

function CreateListDialog({
  open,
  onOpenChange,
  groups,
  customFields,
  groupColorClasses,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: Group[];
  customFields: CustomField[];
  groupColorClasses: Record<GroupColor, ColorClass>;
  onCreate: (list: Omit<ContactList, 'id' | 'createdAt' | 'updatedAt'>) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'manual' | 'dynamic'>('manual');
  const [draft, setDraft] = useState<FilterDraft>(EMPTY_DRAFT);

  function reset() {
    setName('');
    setDescription('');
    setType('manual');
    setDraft(EMPTY_DRAFT);
  }

  function submit() {
    if (!name.trim()) return;
    onCreate({
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      contactIds: type === 'manual' ? [] : undefined,
      filter: type === 'dynamic' ? draftToFilter(draft) : undefined,
    });
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New list</DialogTitle>
          <DialogDescription>
            Manual lists hold a fixed set of contacts. Dynamic lists auto-update from a filter.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="list-name">Name</Label>
            <Input
              id="list-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Holiday Cards 2026"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="list-desc">Description</Label>
            <Textarea
              id="list-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              className="mt-1.5 min-h-[60px]"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Type
            </Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <TypeButton
                active={type === 'manual'}
                onClick={() => setType('manual')}
                icon={Hand}
                title="Manual"
                description="Add contacts yourself"
              />
              <TypeButton
                active={type === 'dynamic'}
                onClick={() => setType('dynamic')}
                icon={Sparkles}
                title="Dynamic"
                description="Auto-update from a filter"
              />
            </div>
          </div>

          {type === 'dynamic' && (
            <>
              <Separator />
              <DynamicFilterBuilder
                draft={draft}
                setDraft={setDraft}
                groups={groups}
                customFields={customFields}
                groupColorClasses={groupColorClasses}
              />
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!name.trim()}>
            Create list
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ----- Edit filter dialog -----------------------------------------------

function EditFilterDialog({
  open,
  onOpenChange,
  list,
  groups,
  customFields,
  groupColorClasses,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list: ContactList;
  groups: Group[];
  customFields: CustomField[];
  groupColorClasses: Record<GroupColor, ColorClass>;
  onSave: (filter: NonNullable<ContactList['filter']>) => void;
}) {
  const [draft, setDraft] = useState<FilterDraft>(() => draftFromList(list));

  // Reset draft when opening for a different list / different filter
  useEffect(() => {
    if (open) setDraft(draftFromList(list));
  }, [open, list]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Edit filter
          </DialogTitle>
          <DialogDescription>
            Adjust the criteria. The list will recompute its members automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <DynamicFilterBuilder
            draft={draft}
            setDraft={setDraft}
            groups={groups}
            customFields={customFields}
            groupColorClasses={groupColorClasses}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="gap-1.5">
            <X className="w-3.5 h-3.5" />
            Cancel
          </Button>
          <Button onClick={() => onSave(draftToFilter(draft))} className="gap-1.5">
            <Check className="w-3.5 h-3.5" />
            Save filter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TypeButton({
  active,
  onClick,
  icon: Icon,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-start gap-1 rounded-md border px-3 py-2.5 text-left transition-colors',
        active ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary/60'
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{title}</span>
        {active && <Check className="w-3 h-3 text-primary ml-auto" />}
      </div>
      <span className="text-xs text-muted-foreground">{description}</span>
    </button>
  );
}
