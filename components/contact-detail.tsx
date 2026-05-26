'use client';

import { useEffect, useId, useRef, useState } from 'react';
import {
  Building2,
  ChevronDown,
  CreditCard,
  MapPin,
  NotebookText,
  Phone,
  Plus,
  SlidersHorizontal,
  Star,
  Trash2,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type {
  Contact,
  ContactAddress,
  ContactDate,
  ContactLabeledValue,
  ContactRelatedPerson,
  CustomField,
  CustomFieldValue,
  EventOccurrence,
  EventParticipation,
  EventSeries,
  Group,
} from '@/lib/contacts-data';
import { ContactCustomFields, hasCustomValuesToShow } from '@/components/contact-custom-fields';
import { ContactPhotoPicker } from '@/components/contact-avatar';
import {
  ParticipationSection,
  type CreateParticipationInput,
  type CreatePaymentInput,
  type UpdatePaymentInput,
} from '@/components/participation-section';

type ColorClass = { dot: string; bg: string; text: string; ring: string };
type SectionKey =
  | 'identity'
  | 'organization'
  | 'contact'
  | 'address'
  | 'notes'
  | 'custom'
  | 'participation';

const DEFAULT_OPEN_SECTIONS: Record<SectionKey, boolean> = {
  identity: true,
  organization: true,
  contact: true,
  address: true,
  notes: true,
  custom: true,
  participation: true,
};

interface Props {
  contact: Contact;
  groups: Group[];
  groupColorClasses: Record<Group['color'], ColorClass>;
  customFields: CustomField[];
  eventSeries: EventSeries[];
  eventOccurrences: EventOccurrence[];
  participations: EventParticipation[];
  onUpdate: (contact: Contact) => void;
  onDelete: (id: string) => void;
  onToggleStar: (id: string) => void;
  onCreateParticipation: (input: CreateParticipationInput) => void;
  onAddPayment: (participationId: string, payment: CreatePaymentInput) => void;
  onUpdatePayment: (
    participationId: string,
    paymentId: string,
    payment: UpdatePaymentInput
  ) => void;
  onDeleteParticipation: (participationId: string) => void;
  onDeletePayment: (participationId: string, paymentId: string) => void;
  onSelectEventPayments: (occurrenceId: string) => void;
}

export function ContactDetail({
  contact,
  groups,
  groupColorClasses,
  customFields,
  eventSeries,
  eventOccurrences,
  participations,
  onUpdate,
  onDelete,
  onToggleStar,
  onCreateParticipation,
  onAddPayment,
  onUpdatePayment,
  onDeleteParticipation,
  onDeletePayment,
  onSelectEventPayments,
}: Props) {
  const [draft, setDraft] = useState<Contact>(() => ensureEditableContact(contact));
  const [dirty, setDirty] = useState(false);
  const [showCustomFields, setShowCustomFields] = useState(false);
  const [openSections, setOpenSections] =
    useState<Record<SectionKey, boolean>>(DEFAULT_OPEN_SECTIONS);

  useEffect(() => {
    setDraft(ensureEditableContact(contact));
    setDirty(false);
    setShowCustomFields(false);
  }, [contact]);

  function updateDraft(next: Contact) {
    setDraft(ensureEditableContact(next));
    setDirty(true);
  }

  function save() {
    onUpdate(syncLegacyFields(draft));
    setDirty(false);
  }

  function cancel() {
    setDraft(ensureEditableContact(contact));
    setDirty(false);
  }

  function handleCustomChange(fieldId: string, value: CustomFieldValue | undefined) {
    const next = { ...(draft.customValues ?? {}) };
    if (value === undefined) delete next[fieldId];
    else next[fieldId] = value;
    updateDraft({ ...draft, customValues: next });
  }

  function toggleSection(section: SectionKey) {
    setOpenSections((current) => ({ ...current, [section]: !current[section] }));
  }

  const name = displayName(draft);
  const lastModifiedLabel = new Date(draft.updatedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const labelSuggestions = buildLabelSuggestions(draft);
  const shouldShowCustomFields = showCustomFields || hasCustomValuesToShow(draft, customFields);
  const visibleTags = draft.tags ?? [];

  return (
    <div className="h-full bg-slate-100">
      <div className="space-y-4 px-4 py-5 md:px-8">
        <section className="mx-auto max-w-6xl">
          <div className="space-y-5">
            <div className="rounded-lg bg-background p-4">
              <div className="flex flex-col gap-5 md:flex-row md:items-start">
                <ContactPhotoPicker
                  firstName={draft.firstName}
                  lastName={draft.lastName}
                  photoUrl={draft.photoUrl}
                  size="xl"
                  onChange={(photoUrl) => updateDraft({ ...draft, photoUrl })}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-2xl font-semibold tracking-tight">{name}</h2>
                        <button
                          onClick={() => onToggleStar(contact.id)}
                          className="flex-shrink-0 text-muted-foreground transition-colors hover:text-amber-400"
                          aria-label={contact.starred ? 'Unstar contact' : 'Star contact'}
                        >
                          <Star
                            className={cn(
                              'h-5 w-5',
                              contact.starred && 'fill-amber-400 text-amber-400'
                            )}
                          />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Last modified {lastModifiedLabel}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 gap-2">
                      <Button size="sm" onClick={save} disabled={!dirty}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancel} disabled={!dirty}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(contact.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete contact</span>
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-3 text-sm md:grid-cols-2">
                    <EditableGroupChips
                      groups={groups}
                      selectedIds={draft.groupIds}
                      groupColorClasses={groupColorClasses}
                      onChange={(groupIds) => updateDraft({ ...draft, groupIds })}
                    />
                    <TagEditor
                      tags={visibleTags}
                      onChange={(tags) => updateDraft({ ...draft, tags })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 rounded-lg bg-background p-3">
              <SectionHeader
                title="Name"
                icon={UserRound}
                open={openSections.identity}
                onToggle={() => toggleSection('identity')}
              />
              {openSections.identity && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                      {getNameFields(draft).map((field) => (
                        <CompactInput
                          key={field.key}
                          label={field.label}
                          value={field.value}
                          onChange={(value) => updateDraft({ ...draft, [field.key]: value })}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5 rounded-lg bg-background p-3">
              <SectionHeader
                title="Organization"
                icon={Building2}
                open={openSections.organization}
                onToggle={() => toggleSection('organization')}
              />
              {openSections.organization && (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <CompactInput
                    label="Title"
                    value={draft.title}
                    onChange={(value) => updateDraft({ ...draft, title: value })}
                  />
                  <CompactInput
                    label="Company"
                    value={draft.company}
                    onChange={(value) => updateDraft({ ...draft, company: value })}
                  />
                  <CompactInput
                    label="Department"
                    value={draft.department ?? ''}
                    onChange={(value) => updateDraft({ ...draft, department: value })}
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5 rounded-lg bg-background p-3">
              <SectionHeader
                title="Contact Information"
                icon={Phone}
                open={openSections.contact}
                onToggle={() => toggleSection('contact')}
              />
              {openSections.contact && (
                <div className="space-y-1.5">
                  <InlineRowsCompact
                    items={draft.phones ?? []}
                    valueLabel="Phone"
                    valueType="tel"
                    addLabel="Add phone"
                    labelSuggestions={labelSuggestions.phone}
                    onChange={(phones) => updateDraft(syncLegacyFields({ ...draft, phones }))}
                  />
                  <InlineRowsCompact
                    items={draft.emails ?? []}
                    valueLabel="Email"
                    valueType="email"
                    addLabel="Add email"
                    labelSuggestions={labelSuggestions.email}
                    onChange={(emails) => updateDraft(syncLegacyFields({ ...draft, emails }))}
                  />
                  <InlineRowsCompact
                    items={draft.websites ?? []}
                    valueLabel="Website"
                    valueType="url"
                    addLabel="Add website"
                    labelSuggestions={labelSuggestions.website}
                    onChange={(websites) => updateDraft(syncLegacyFields({ ...draft, websites }))}
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5 rounded-lg bg-background p-3">
              <SectionHeader
                title="Address"
                icon={MapPin}
                open={openSections.address}
                onToggle={() => toggleSection('address')}
              />
              {openSections.address && (
                <AddressRowsCompact
                  items={draft.addresses ?? []}
                  labelSuggestions={labelSuggestions.address}
                  onChange={(addresses) => updateDraft(syncLegacyFields({ ...draft, addresses }))}
                />
              )}
            </div>

            <div className="space-y-1.5 rounded-lg bg-background p-3">
              <SectionHeader
                title="Notes"
                icon={NotebookText}
                open={openSections.notes}
                onToggle={() => toggleSection('notes')}
              />
              {openSections.notes && (
                <Textarea
                  value={draft.notes}
                  onChange={(event) => updateDraft({ ...draft, notes: event.target.value })}
                  className="min-h-[60px] rounded-md border-0 bg-transparent px-1 pt-1 shadow-none placeholder:text-muted-foreground/45 hover:bg-secondary/50 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Add notes"
                />
              )}
            </div>

            <div className="space-y-1.5 rounded-lg bg-background p-3">
              <SectionHeader
                title="Custom Fields"
                icon={SlidersHorizontal}
                open={openSections.custom}
                onToggle={() => toggleSection('custom')}
              />
              {openSections.custom &&
                (shouldShowCustomFields ? (
                  <div className="max-w-[42rem]">
                    <ContactCustomFields
                      contact={draft}
                      fields={customFields}
                      onChange={handleCustomChange}
                    />
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-0.5 text-sm"
                    onClick={() => setShowCustomFields(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add custom fields
                  </Button>
                ))}
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl space-y-1.5 rounded-lg bg-background p-3">
          <SectionHeader
            title="Participation & payments"
            icon={CreditCard}
            open={openSections.participation}
            onToggle={() => toggleSection('participation')}
          />
          {openSections.participation && (
            <ParticipationSection
              contact={syncLegacyFields(draft)}
              eventSeries={eventSeries}
              eventOccurrences={eventOccurrences}
              participations={participations}
              canEdit
              onCreateParticipation={onCreateParticipation}
              onAddPayment={onAddPayment}
              onUpdatePayment={onUpdatePayment}
              onDeleteParticipation={onDeleteParticipation}
              onDeletePayment={onDeletePayment}
              onSelectEventPayments={onSelectEventPayments}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function EditableGroupChips({
  groups,
  selectedIds,
  groupColorClasses,
  onChange,
}: {
  groups: Group[];
  selectedIds: string[];
  groupColorClasses: Record<Group['color'], ColorClass>;
  onChange: (groupIds: string[]) => void;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-xs font-medium uppercase text-muted-foreground">Groups</p>
      {groups.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {groups.map((group) => {
            const color = groupColorClasses[group.color];
            const active = selectedIds.includes(group.id);
            return (
              <button
                type="button"
                key={group.id}
                onClick={() =>
                  onChange(
                    active
                      ? selectedIds.filter((id) => id !== group.id)
                      : [...selectedIds, group.id]
                  )
                }
                className={cn(
                  'inline-flex h-6 max-w-full items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors',
                  active
                    ? cn(color.bg, color.text, 'border-transparent')
                    : 'border-border bg-background text-muted-foreground hover:bg-secondary'
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    active ? color.dot : 'bg-muted-foreground/50'
                  )}
                />
                <span className="truncate">{group.name}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No groups</p>
      )}
    </div>
  );
}

function TagEditor({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [value, setValue] = useState('');

  function addTags(rawValue = value) {
    const nextTags = rawValue
      .split(/[,;]+/)
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (nextTags.length === 0) return;
    onChange(uniqueStrings([...tags, ...nextTags]));
    setValue('');
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase text-muted-foreground">Tags</p>
      <div className="flex flex-wrap gap-1">
        {tags.length > 0 ? (
          tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                type="button"
                onClick={() => onChange(tags.filter((current) => current !== tag))}
                className="rounded-sm text-muted-foreground transition-colors hover:text-foreground"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No tags</p>
        )}
      </div>
      <div className="max-w-[22rem]">
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',' || event.key === ';') {
              event.preventDefault();
              addTags();
            }
          }}
          onBlur={() => addTags()}
          placeholder="Add tag"
          className="h-9"
        />
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  icon: Icon,
  open,
  onToggle,
}: {
  title: string;
  icon: LucideIcon;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        '-mx-3 -mt-3 flex w-[calc(100%+1.5rem)] items-center justify-between gap-3 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground',
        open ? 'mb-1 rounded-t-lg rounded-b-none' : '-mb-3 rounded-lg'
      )}
      aria-expanded={open}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="truncate">{title}</span>
      </span>
      <ChevronDown
        className={cn('h-3.5 w-3.5 flex-shrink-0 transition-transform', !open && '-rotate-90')}
      />
    </button>
  );
}

function InlineRowsCompact({
  items,
  valueLabel,
  valueType,
  addLabel,
  labelSuggestions,
  onChange,
}: {
  items: ContactLabeledValue[];
  valueLabel: string;
  valueType: string;
  addLabel: string;
  labelSuggestions: string[];
  onChange: (items: ContactLabeledValue[]) => void;
}) {
  const rows = items.length > 0 ? items : [newLabeledValue(defaultLabel(addLabel))];
  return (
    <div className="space-y-0.5">
      {rows.map((item, index) => (
        <div
          key={item.id}
          className="grid grid-cols-1 gap-2 md:grid-cols-[7rem_minmax(12rem,1fr)_1.5rem] md:items-center"
        >
          <LabelInput
            ariaLabel={`${valueLabel} label ${index + 1}`}
            value={item.label}
            placeholder={valueLabel}
            suggestions={labelSuggestions}
            onChange={(label) => onChange(replaceAt(rows, index, { ...item, label }))}
            className="text-xs"
          />
          <CompactInput
            ariaLabel={`${valueLabel} ${index + 1}`}
            placeholder={valueLabel}
            type={valueType}
            value={item.value}
            onChange={(value) => onChange(replaceAt(rows, index, { ...item, value }))}
          />
          {rows.length > 1 ? (
            <IconButton
              label="Remove"
              onClick={() => onChange(rows.filter((row) => row.id !== item.id))}
              className="h-5 w-5"
            >
              <X className="h-3 w-3" />
            </IconButton>
          ) : (
            <span />
          )}
        </div>
      ))}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-[7rem_minmax(12rem,1fr)]">
        <span aria-hidden className="hidden md:block" />
        <Button
          type="button"
          variant="ghost"
          className="h-7 w-fit justify-start gap-1 px-0.5 text-sm"
          onClick={() => onChange([...rows, newLabeledValue(defaultLabel(addLabel))])}
        >
          <Plus className="h-3.5 w-3.5" />
          {addLabel}
        </Button>
      </div>
    </div>
  );
}

function AddressRowsCompact({
  items,
  labelSuggestions,
  onChange,
}: {
  items: ContactAddress[];
  labelSuggestions: string[];
  onChange: (items: ContactAddress[]) => void;
}) {
  const rows = items.length > 0 ? items : [newAddress()];
  return (
    <div className="space-y-1.5">
      {rows.map((item, index) => (
        <div key={item.id} className="space-y-1">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[7rem_minmax(12rem,1fr)_1.5rem] md:items-center">
            <LabelInput
              ariaLabel={`Address label ${index + 1}`}
              value={item.label}
              placeholder="Address"
              suggestions={labelSuggestions}
              onChange={(label) => onChange(replaceAt(rows, index, { ...item, label }))}
              className="text-xs"
            />
            <CompactInput
              ariaLabel={`Address line 1 ${index + 1}`}
              placeholder="Address line 1"
              value={item.addressLine1 ?? ''}
              onChange={(addressLine1) =>
                onChange(replaceAt(rows, index, { ...item, addressLine1 }))
              }
            />
            {rows.length > 1 ? (
              <IconButton
                label="Remove"
                onClick={() => onChange(rows.filter((row) => row.id !== item.id))}
                className="h-5 w-5"
              >
                <X className="h-3 w-3" />
              </IconButton>
            ) : (
              <span />
            )}
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[7rem_minmax(12rem,1fr)]">
            <span className="text-xs" />
            <CompactInput
              ariaLabel={`Address line 2 ${index + 1}`}
              placeholder="Address line 2"
              value={item.addressLine2 ?? ''}
              onChange={(addressLine2) =>
                onChange(replaceAt(rows, index, { ...item, addressLine2 }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-[7rem_minmax(6rem,1fr)_minmax(6rem,1fr)_minmax(6rem,1fr)] md:items-center">
            <span className="text-xs" />
            <CompactInput
              ariaLabel={`City ${index + 1}`}
              placeholder="City"
              value={item.city ?? ''}
              onChange={(city) => onChange(replaceAt(rows, index, { ...item, city }))}
            />
            <CompactInput
              ariaLabel={`State ${index + 1}`}
              placeholder="State"
              value={item.state ?? ''}
              onChange={(state) => onChange(replaceAt(rows, index, { ...item, state }))}
            />
            <CompactInput
              ariaLabel={`ZIP ${index + 1}`}
              placeholder="ZIP"
              value={item.zip ?? ''}
              onChange={(zip) => onChange(replaceAt(rows, index, { ...item, zip }))}
            />
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[7rem_minmax(12rem,1fr)]">
            <span className="text-xs" />
            <CompactInput
              ariaLabel={`Country ${index + 1}`}
              placeholder="Country"
              value={item.country ?? ''}
              onChange={(country) => onChange(replaceAt(rows, index, { ...item, country }))}
            />
          </div>
        </div>
      ))}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-[7rem_minmax(12rem,1fr)]">
        <span aria-hidden className="hidden md:block" />
        <Button
          type="button"
          variant="ghost"
          className="h-7 w-fit justify-start gap-1 px-0.5 text-sm"
          onClick={() => onChange([...rows, newAddress()])}
        >
          <Plus className="h-3.5 w-3.5" />
          Add address
        </Button>
      </div>
    </div>
  );
}

function CompactInput({
  label,
  ariaLabel,
  placeholder,
  value,
  onChange,
  type = 'text',
  disabled = false,
  suggestions = [],
}: {
  label?: string;
  ariaLabel?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
  suggestions?: string[];
}) {
  const generatedListId = useId();
  const listId = suggestions.length > 0 ? generatedListId : undefined;
  return (
    <div className="min-w-0">
      {label && (
        <Label className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </Label>
      )}
      <Input
        type={type}
        value={value}
        placeholder={placeholder ?? label}
        list={listId}
        aria-label={ariaLabel ?? label}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-7 min-w-0 rounded-md border-0 bg-transparent px-1 text-sm shadow-none placeholder:text-muted-foreground/45 hover:bg-secondary/50 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring"
      />
      {listId && (
        <datalist id={listId}>
          {suggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      )}
    </div>
  );
}

function LabelInput({
  ariaLabel,
  placeholder,
  value,
  onChange,
  suggestions = [],
  className,
}: {
  ariaLabel: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  suggestions?: string[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const filteredSuggestions = suggestions
    .filter((suggestion) => {
      const current = value.trim().toLowerCase();
      return suggestion !== value && (!current || suggestion.toLowerCase().includes(current));
    })
    .slice(0, 8);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <LabelControl
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={className}
        onFocus={() => setOpen(filteredSuggestions.length > 0)}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
        }}
      />
      {open && filteredSuggestions.length > 0 && (
        <div className="absolute right-0 z-40 mt-1 max-h-48 min-w-full overflow-auto rounded-md border border-border bg-popover py-1 text-sm shadow-md">
          {filteredSuggestions.map((suggestion) => (
            <button
              type="button"
              key={suggestion}
              className="block w-full px-2 py-1.5 text-left text-popover-foreground hover:bg-secondary sm:text-right"
              onClick={() => {
                onChange(suggestion);
                setOpen(false);
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const labelControlClassName =
  'ml-auto flex h-7 w-full min-w-0 items-center justify-start rounded-md border-0 bg-transparent px-1 text-left text-sm font-medium text-muted-foreground shadow-none placeholder:text-muted-foreground/45 hover:bg-secondary/50 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring sm:justify-end sm:text-right';

function LabelControl(props: React.ComponentProps<typeof Input>) {
  return <Input {...props} className={cn(labelControlClassName, props.className)} />;
}

function IconButton({
  label,
  onClick,
  children,
  className,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={onClick}
      className={cn('h-7 w-7 self-center text-muted-foreground', className)}
    >
      {children}
      <span className="sr-only">{label}</span>
    </Button>
  );
}

function replaceAt<T>(items: T[], index: number, value: T) {
  return items.map((item, idx) => (idx === index ? value : item));
}

function ensureEditableContact(contact: Contact): Contact {
  const next = syncLegacyFields(contact);
  return {
    ...next,
    emails:
      next.emails && next.emails.length > 0 ? next.emails : [newLabeledValue('Work', next.email)],
    phones:
      next.phones && next.phones.length > 0 ? next.phones : [newLabeledValue('Mobile', next.phone)],
    websites:
      next.websites && next.websites.length > 0
        ? next.websites
        : [newLabeledValue('Website', next.website)],
    addresses: next.addresses && next.addresses.length > 0 ? next.addresses : [newAddress(next)],
    significantDates:
      next.significantDates && next.significantDates.length > 0
        ? next.significantDates
        : [newDate()],
    relatedPeople:
      next.relatedPeople && next.relatedPeople.length > 0
        ? next.relatedPeople
        : [newRelatedPerson()],
  };
}

function syncLegacyFields(contact: Contact): Contact {
  const emails = contact.emails ?? [];
  const phones = contact.phones ?? [];
  const websites = contact.websites ?? [];
  const addresses = contact.addresses ?? [];
  const significantDates = contact.significantDates ?? [];
  const relatedPeople = contact.relatedPeople ?? [];
  const address = addresses.find(hasAddressValue) ?? addresses[0];
  const significantDate = significantDates.find(hasDateValue) ?? significantDates[0];
  const relatedPerson = relatedPeople.find((item) => item.name.trim()) ?? relatedPeople[0];

  return {
    ...contact,
    emails,
    email: emails[0]?.value ?? '',
    email2: emails[1]?.value || undefined,
    phones,
    phone: phones[0]?.value ?? '',
    phone2: phones[1]?.value || undefined,
    websites,
    website: websites[0]?.value ?? '',
    addresses,
    addressLine1: address?.addressLine1,
    addressLine2: address?.addressLine2,
    city: address?.city ?? '',
    zip: address?.zip,
    country: address?.country ?? '',
    significantDates,
    significantDate:
      significantDate && hasDateValue(significantDate)
        ? datePartsToString(significantDate)
        : undefined,
    significantDateLabel: significantDate?.label,
    relatedPeople,
    relatedPerson: relatedPerson?.name,
    relationLabel: relatedPerson?.label,
  };
}

function hasAddressValue(item: ContactAddress) {
  return Boolean(
    item.addressLine1 || item.addressLine2 || item.city || item.state || item.zip || item.country
  );
}

function hasDateValue(item: ContactDate) {
  return Boolean(item.month || item.day || item.year);
}

function newLabeledValue(label: string, value = ''): ContactLabeledValue {
  return { id: `value_${Date.now()}_${Math.random().toString(36).slice(2)}`, label, value };
}

function newAddress(contact?: Contact): ContactAddress {
  return {
    id: `address_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    label: 'Home',
    addressLine1: contact?.addressLine1 ?? '',
    addressLine2: contact?.addressLine2 ?? '',
    city: contact?.city ?? '',
    state: contact?.state ?? '',
    zip: contact?.zip ?? '',
    country: contact?.country ?? '',
  };
}

function newDate(): ContactDate {
  return newDateWithLabel('Anniversary');
}

function newDateWithLabel(label: string): ContactDate {
  return {
    id: `date_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    label,
    month: '',
    day: '',
    year: '',
  };
}

function newRelatedPerson(): ContactRelatedPerson {
  return {
    id: `related_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    label: 'Spouse',
    name: '',
  };
}

function defaultLabel(addLabel: string) {
  if (addLabel.includes('email')) return 'Work';
  if (addLabel.includes('phone')) return 'Mobile';
  if (addLabel.includes('website')) return 'Website';
  return '';
}

function displayName(contact: Contact) {
  const parts = [
    contact.namePrefix,
    contact.firstName,
    contact.middleName,
    contact.lastName,
    contact.nameSuffix,
  ].filter(Boolean);
  return parts.join(' ') || contact.nickname || 'Unnamed contact';
}

function datePartsToString(value: ContactDate) {
  const rawMonth = value.month.trim();
  const rawDay = value.day.trim();
  if (!rawMonth || !rawDay) return '';
  const month = rawMonth.padStart(2, '0');
  const day = rawDay.padStart(2, '0');
  return value.year ? `${value.year}-${month}-${day}` : `${month}-${day}`;
}

function _hasAnyAddress(addresses: ContactAddress[]) {
  return addresses.some(hasAddressValue);
}

function _hasAnyRelationship(people: ContactRelatedPerson[]) {
  return people.some((person) => person.name.trim().length > 0);
}

function getNameFields(contact: Contact) {
  return [
    { key: 'namePrefix', label: 'Prefix', value: contact.namePrefix ?? '' },
    { key: 'firstName', label: 'First name', value: contact.firstName },
    { key: 'middleName', label: 'Middle name', value: contact.middleName ?? '' },
    { key: 'lastName', label: 'Last name', value: contact.lastName },
    { key: 'nameSuffix', label: 'Suffix', value: contact.nameSuffix ?? '' },
    { key: 'nickname', label: 'Nickname', value: contact.nickname ?? '' },
  ] satisfies Array<{
    key: 'namePrefix' | 'firstName' | 'middleName' | 'lastName' | 'nameSuffix' | 'nickname';
    label: string;
    value: string;
  }>;
}

function buildLabelSuggestions(contact: Contact) {
  return {
    phone: uniqueStrings([
      'Mobile',
      'Work',
      'Home',
      'Main',
      'Office',
      'Fax',
      'Other',
      ...(contact.phones ?? []).map((item) => item.label),
    ]),
    email: uniqueStrings([
      'Work',
      'Personal',
      'Home',
      'Billing',
      'School',
      'Other',
      ...(contact.emails ?? []).map((item) => item.label),
    ]),
    website: uniqueStrings([
      'Website',
      'Portfolio',
      'LinkedIn',
      'GitHub',
      'Company',
      'Other',
      ...(contact.websites ?? []).map((item) => item.label),
    ]),
    address: uniqueStrings([
      'Home',
      'Work',
      'Billing',
      'Shipping',
      'Other',
      ...(contact.addresses ?? []).map((item) => item.label),
    ]),
    date: uniqueStrings([
      'Anniversary',
      'Birthday',
      'First met',
      'Last contacted',
      'Follow-up',
      'Work anniversary',
      'Other',
      ...(contact.significantDates ?? []).map((item) => item.label),
    ]),
    relationship: uniqueStrings([
      'Spouse',
      'Partner',
      'Family',
      'Parent',
      'Child',
      'Sibling',
      'Friend',
      'Manager',
      'Assistant',
      'Colleague',
      'Client',
      'Vendor',
      'Referred by',
      'Emergency contact',
      'Other',
      ...(contact.relatedPeople ?? []).map((item) => item.label),
    ]),
  };
}

function uniqueStrings(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
}
