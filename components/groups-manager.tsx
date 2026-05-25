'use client';

import { useMemo, useState } from 'react';
import { FolderPlus, Pencil, Trash2, Users as UsersIcon, Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { Contact, Group, GroupColor } from '@/lib/contacts-data';

type ColorClass = { dot: string; bg: string; text: string; ring: string };

interface Props {
  groups: Group[];
  contacts: Contact[];
  groupColorClasses: Record<GroupColor, ColorClass>;
  onCreate: (input: Omit<Group, 'id'>) => void;
  onUpdate: (group: Group) => void;
  onDelete: (id: string) => void;
  /** Replace the full set of group IDs for a single contact */
  onSetContactGroups: (contactId: string, groupIds: string[]) => void;
}

const COLOR_OPTIONS: GroupColor[] = ['blue', 'green', 'amber', 'rose', 'cyan', 'slate', 'purple'];

export function GroupsManager({
  groups,
  contacts,
  groupColorClasses,
  onCreate,
  onUpdate,
  onDelete,
  onSetContactGroups,
}: Props) {
  const [editing, setEditing] = useState<Group | null>(null);
  const [creating, setCreating] = useState(false);
  const [managing, setManaging] = useState<Group | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Group | null>(null);

  const memberCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const g of groups) counts[g.id] = 0;
    for (const c of contacts) {
      for (const gid of c.groupIds) counts[gid] = (counts[gid] ?? 0) + 1;
    }
    return counts;
  }, [groups, contacts]);

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold">Groups</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Organize contacts into reusable categories. A contact can belong to any number of
            groups.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)} className="gap-1.5">
          <FolderPlus className="w-3.5 h-3.5" />
          New group
        </Button>
      </div>

      {groups.length === 0 ? (
        <div className="mt-5 rounded-md border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            No groups yet. Create your first one to start organizing contacts.
          </p>
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-border border border-border rounded-md overflow-hidden">
          {groups.map((g) => {
            const c = groupColorClasses[g.color];
            const count = memberCounts[g.id] ?? 0;
            return (
              <li key={g.id} className="flex items-center gap-4 px-4 py-3 bg-card">
                <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', c.dot)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{g.name}</p>
                  {g.description && (
                    <p className="text-xs text-muted-foreground truncate">{g.description}</p>
                  )}
                </div>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium tabular-nums',
                    c.bg,
                    c.text
                  )}
                >
                  <UsersIcon className="w-3 h-3" />
                  {count}
                </span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setManaging(g)}
                    className="h-8 px-2 gap-1.5 text-xs"
                  >
                    Members
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(g)}
                    className="h-8 w-8 p-0"
                    aria-label={`Edit ${g.name}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmDelete(g)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    aria-label={`Delete ${g.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <GroupFormDialog
        open={creating}
        onOpenChange={setCreating}
        groupColorClasses={groupColorClasses}
        title="New group"
        description="Groups help you slice your contacts in meaningful ways."
        onSubmit={(input) => {
          onCreate(input);
          setCreating(false);
        }}
      />

      <GroupFormDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        groupColorClasses={groupColorClasses}
        title="Edit group"
        description="Update the name, description, or color."
        initial={editing ?? undefined}
        onSubmit={(input) => {
          if (editing) onUpdate({ ...editing, ...input });
          setEditing(null);
        }}
      />

      <ManageMembersDialog
        group={managing}
        contacts={contacts}
        onClose={() => setManaging(null)}
        onSetContactGroups={onSetContactGroups}
        groupColorClasses={groupColorClasses}
      />

      <Dialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete group?</DialogTitle>
            <DialogDescription>
              {confirmDelete && (
                <>
                  This removes &ldquo;{confirmDelete.name}&rdquo; from{' '}
                  {memberCounts[confirmDelete.id] ?? 0} contact
                  {(memberCounts[confirmDelete.id] ?? 0) === 1 ? '' : 's'} and any custom-field
                  scopes that referenced it. The contacts themselves are not deleted.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDelete) onDelete(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Delete group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ----- Form dialog --------------------------------------------------------

function GroupFormDialog({
  open,
  onOpenChange,
  title,
  description,
  initial,
  groupColorClasses,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  initial?: Group;
  groupColorClasses: Record<GroupColor, ColorClass>;
  onSubmit: (input: Omit<Group, 'id'>) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [desc, setDesc] = useState(initial?.description ?? '');
  const [color, setColor] = useState<GroupColor>(initial?.color ?? 'blue');

  // Re-sync local form state when the dialog opens with new data
  function handleOpenChange(next: boolean) {
    if (next) {
      setName(initial?.name ?? '');
      setDesc(initial?.description ?? '');
      setColor(initial?.color ?? 'blue');
    }
    onOpenChange(next);
  }

  function submit() {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      description: desc.trim(),
      color,
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="group-name" className="text-xs">
              Name
            </Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Conference 2026"
              className="mt-1.5"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="group-desc" className="text-xs">
              Description
            </Label>
            <Textarea
              id="group-desc"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Optional"
              className="mt-1.5 min-h-[60px]"
            />
          </div>
          <div>
            <Label className="text-xs">Color</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => {
                const cls = groupColorClasses[c];
                const active = color === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={`Color ${c}`}
                    aria-pressed={active}
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center ring-offset-background transition-all',
                      cls.dot,
                      active ? 'ring-2 ring-foreground ring-offset-2 scale-110' : 'hover:scale-105'
                    )}
                  >
                    {active && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!name.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ----- Member management dialog -----------------------------------------

function ManageMembersDialog({
  group,
  contacts,
  onClose,
  onSetContactGroups,
  groupColorClasses,
}: {
  group: Group | null;
  contacts: Contact[];
  onClose: () => void;
  onSetContactGroups: (contactId: string, groupIds: string[]) => void;
  groupColorClasses: Record<GroupColor, ColorClass>;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!group) return [];
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) =>
      `${c.firstName} ${c.lastName} ${c.email} ${c.company} ${c.title}`.toLowerCase().includes(q)
    );
  }, [contacts, search, group]);

  function toggle(c: Contact) {
    if (!group) return;
    const next = c.groupIds.includes(group.id)
      ? c.groupIds.filter((id) => id !== group.id)
      : [...c.groupIds, group.id];
    onSetContactGroups(c.id, next);
  }

  if (!group) return null;
  const cls = groupColorClasses[group.color];
  const memberCount = contacts.filter((c) => c.groupIds.includes(group.id)).length;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <span className={cn('w-2.5 h-2.5 rounded-full', cls.dot)} />
            Manage &ldquo;{group.name}&rdquo;
          </DialogTitle>
          <DialogDescription>
            {memberCount} of {contacts.length} contact
            {contacts.length === 1 ? '' : 's'} are in this group. Click to toggle membership.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pt-3 pb-2 border-b border-border">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              No contacts match your search.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((c) => {
                const inGroup = c.groupIds.includes(group.id);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => toggle(c)}
                      className={cn(
                        'w-full flex items-center gap-3 px-6 py-2.5 text-left transition-colors',
                        inGroup ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-secondary/40'
                      )}
                    >
                      <div
                        className={cn(
                          'w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors',
                          inGroup
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-input'
                        )}
                      >
                        {inGroup && <Check className="w-3 h-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {c.firstName} {c.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[c.title, c.company].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="px-6 py-3 border-t border-border">
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
