'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Pencil, Plus, Search, Trash2, UserPlus, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { getEventAccentClasses } from '@/components/event-accent';
import { ColorPickerDialog } from '@/components/color-picker-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import type {
  Contact,
  ContactList,
  CustomField,
  EventOccurrence,
  EventParticipation,
  EventPriceOption,
  EventRecurrence,
  EventSeries,
  Group,
  GroupColor,
} from '@/lib/contacts-data';
import { resolveListMembers, STANDARD_SEARCHABLE_FIELDS } from '@/lib/contacts-data';
import {
  formatMoney,
  getContactName,
  getParticipationBalance,
  getPaymentStatusLabel,
} from '@/lib/payments';
import { TAILWIND_COLOR_MAP } from '@/lib/color-utils';
import { cn } from '@/lib/utils';
import type { CreatePaymentInput } from '@/components/participation-section';

type ColorClass = { dot: string; bg: string; text: string; ring: string };

export type CreateEventOccurrenceInput = {
  name: string;
  date?: string;
  recurrence: EventRecurrence;
  defaultAmountOwed?: number;
};

export type UpdateEventOccurrenceInput = {
  occurrence: EventOccurrence;
  series: EventSeries;
};

export type EventParticipantInput = {
  occurrenceId: string;
  contactId: string;
};

export type EventParticipantsInput = {
  occurrenceId: string;
  contactIds: string[];
};

export type EventParticipantPriceInput = {
  occurrenceId: string;
  contactId: string;
  amountOwed: number;
  currency: string;
};

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

type Props = {
  contacts: Contact[];
  groups: Group[];
  customFields: CustomField[];
  groupColorClasses: Record<GroupColor, ColorClass>;
  eventSeries: EventSeries[];
  eventOccurrences: EventOccurrence[];
  participations: EventParticipation[];
  activeOccurrenceId?: string | null;
  onCreateEvent: (input: CreateEventOccurrenceInput) => void;
  onUpdateEvent: (input: UpdateEventOccurrenceInput) => void;
  onAddParticipants: (input: EventParticipantsInput) => void;
  onRemoveParticipant: (input: EventParticipantInput) => void;
  onSetParticipantPrice: (input: EventParticipantPriceInput) => void;
  onAddPayment: (participationId: string, payment: CreatePaymentInput) => void;
  onSelectContact: (contactId: string) => void;
};

const COLOR_OPTIONS: GroupColor[] = ['blue', 'green', 'amber', 'rose', 'cyan', 'slate', 'purple'];

function isGroupColor(color: unknown): color is GroupColor {
  return typeof color === 'string' && COLOR_OPTIONS.includes(color as GroupColor);
}

function getColorHex(color: GroupColor | string | undefined) {
  if (typeof color === 'string' && color.startsWith('#')) return color;
  if (isGroupColor(color)) return TAILWIND_COLOR_MAP[color];
  return TAILWIND_COLOR_MAP.blue;
}

type PriceDraft = { id: string; label: string; amount: string; currency: string; notes: string };
type ParticipantPriceDraft = {
  priceId: string;
  amount: string;
  currency: string;
  customAmount: string;
};

function draftToFilter(draft: FilterDraft): NonNullable<ContactList['filter']> {
  const filter: NonNullable<ContactList['filter']> = {};
  if (draft.starredOnly) filter.starred = true;
  if (draft.groupIds.length > 0) filter.groupIds = draft.groupIds;
  if (draft.advancedQuery.trim() && draft.advancedFieldKeys.length > 0) {
    filter.advancedSearch = {
      query: draft.advancedQuery.trim(),
      fieldKeys: draft.advancedFieldKeys,
    };
  }
  return filter;
}

function hasFilterCriteria(draft: FilterDraft) {
  return (
    draft.starredOnly ||
    draft.groupIds.length > 0 ||
    (draft.advancedQuery.trim().length > 0 && draft.advancedFieldKeys.length > 0)
  );
}

function priceDraftsFromSeries(series: EventSeries): PriceDraft[] {
  if (series.priceOptions && series.priceOptions.length > 0) {
    return series.priceOptions.map((price) => ({
      id: price.id,
      label: price.label,
      amount: String(price.amount),
      currency: price.currency,
      notes: price.notes ?? '',
    }));
  }
  if (series.defaultAmountOwed !== undefined) {
    return [
      {
        id: series.defaultPriceOptionId ?? `price_${series.id}_standard`,
        label: 'Standard',
        amount: String(series.defaultAmountOwed),
        currency: series.defaultCurrency,
        notes: '',
      },
    ];
  }
  return [
    {
      id: `price_${series.id}_standard`,
      label: 'Standard',
      amount: '',
      currency: series.defaultCurrency,
      notes: '',
    },
  ];
}

function normalizePrices(prices: PriceDraft[]): EventPriceOption[] {
  return prices
    .map((price) => ({
      id: price.id,
      label: price.label.trim(),
      amount: Number(price.amount),
      currency: price.currency.trim().toUpperCase() || 'EUR',
      notes: price.notes.trim() || undefined,
    }))
    .filter((price) => price.label && Number.isFinite(price.amount));
}

function getYear(occurrence: EventOccurrence) {
  return occurrence.date?.slice(0, 4) ?? 'No date';
}

function getEventMembers(
  occurrence: EventOccurrence,
  contacts: Contact[],
  participations: EventParticipation[]
) {
  const manualIds = new Set(occurrence.contactIds ?? []);
  participations
    .filter((participation) => participation.occurrenceId === occurrence.id)
    .forEach((participation) => manualIds.add(participation.contactId));
  return contacts
    .filter((contact) => manualIds.has(contact.id))
    .sort((a, b) => getContactName(a).localeCompare(getContactName(b)));
}

export function EventsView({
  contacts,
  groups,
  customFields,
  groupColorClasses,
  eventSeries,
  eventOccurrences,
  participations,
  activeOccurrenceId: requestedActiveOccurrenceId,
  onCreateEvent,
  onUpdateEvent,
  onAddParticipants,
  onRemoveParticipant,
  onSetParticipantPrice,
  onAddPayment,
  onSelectContact,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [activeOccurrenceId, setActiveOccurrenceId] = useState<string | null>(
    eventOccurrences[0]?.id ?? null
  );
  const [draft, setDraft] = useState({
    name: '',
    date: '',
    recurrence: 'none' as EventRecurrence,
    defaultAmountOwed: '',
  });

  const groupedOccurrences = useMemo(() => {
    const groupsByYear = new Map<string, EventOccurrence[]>();
    eventOccurrences
      .slice()
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
      .forEach((occurrence) => {
        const year = getYear(occurrence);
        groupsByYear.set(year, [...(groupsByYear.get(year) ?? []), occurrence]);
      });
    return Array.from(groupsByYear.entries());
  }, [eventOccurrences]);

  const activeOccurrence =
    eventOccurrences.find((occurrence) => occurrence.id === activeOccurrenceId) ??
    eventOccurrences[0];
  const activeSeries = activeOccurrence
    ? eventSeries.find((series) => series.id === activeOccurrence.seriesId)
    : undefined;

  useEffect(() => {
    if (
      requestedActiveOccurrenceId &&
      eventOccurrences.some((occurrence) => occurrence.id === requestedActiveOccurrenceId)
    ) {
      setActiveOccurrenceId(requestedActiveOccurrenceId);
    }
  }, [eventOccurrences, requestedActiveOccurrenceId]);

  function submit() {
    if (!draft.name.trim()) return;
    const amount = draft.defaultAmountOwed ? Number(draft.defaultAmountOwed) : undefined;
    onCreateEvent({
      name: draft.name.trim(),
      date: draft.date || undefined,
      recurrence: draft.recurrence,
      defaultAmountOwed: Number.isFinite(amount) ? amount : undefined,
    });
    setDraft({ name: '', date: '', recurrence: 'none', defaultAmountOwed: '' });
    setShowForm(false);
  }

  return (
    <div className="flex-1 overflow-hidden flex">
      <aside className="w-[340px] border-r border-border bg-card flex flex-col">
        <header className="px-5 py-4 border-b border-border flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Events</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {eventOccurrences.length} occurrence{eventOccurrences.length === 1 ? '' : 's'} in{' '}
              {eventSeries.length} series
            </p>
          </div>
          <Button size="sm" onClick={() => setShowForm((value) => !value)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            New Event
          </Button>
        </header>

        {showForm && (
          <div className="p-4 border-b border-border space-y-3">
            <div>
              <Label className="text-xs">Event name</Label>
              <Input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                className="mt-1.5"
                placeholder="Retreat Weekend"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">First date</Label>
                <Input
                  type="date"
                  value={draft.date}
                  onChange={(event) => setDraft({ ...draft, date: event.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-xs">Repeats</Label>
                <select
                  value={draft.recurrence}
                  onChange={(event) =>
                    setDraft({ ...draft, recurrence: event.target.value as EventRecurrence })
                  }
                  className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="none">No</option>
                  <option value="yearly">Yearly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Standard price</Label>
              <Input
                type="number"
                step="0.01"
                value={draft.defaultAmountOwed}
                onChange={(event) => setDraft({ ...draft, defaultAmountOwed: event.target.value })}
                className="mt-1.5"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={submit}>
                Create
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {groupedOccurrences.length === 0 ? (
            <div className="p-8 text-center">
              <CalendarDays className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No events yet.</p>
            </div>
          ) : (
            <div className="py-2">
              {groupedOccurrences.map(([year, occurrences]) => (
                <div key={year} className="py-2">
                  <p className="px-5 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {year}
                  </p>
                  <ul className="divide-y divide-border">
                    {occurrences.map((occurrence) => {
                      const series = eventSeries.find((item) => item.id === occurrence.seriesId);
                      const members = getEventMembers(occurrence, contacts, participations);
                      const eventAccent = getEventAccentClasses(occurrence.id, series?.color);
                      return (
                        <li key={occurrence.id}>
                          <button
                            onClick={() => setActiveOccurrenceId(occurrence.id)}
                            className={cn(
                              'w-full border-l-4 text-left px-5 py-3 transition-colors',
                              eventAccent.border,
                              activeOccurrence?.id === occurrence.id
                                ? eventAccent.card
                                : 'hover:bg-secondary/40'
                            )}
                            style={
                              activeOccurrence?.id === occurrence.id
                                ? { ...eventAccent.borderStyle, ...eventAccent.cardStyle }
                                : eventAccent.borderStyle
                            }
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={cn('h-2.5 w-2.5 rounded-full', eventAccent.dot)}
                                style={eventAccent.dotStyle}
                              />
                              <p className="text-sm font-semibold truncate">{occurrence.name}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {occurrence.date ?? 'No date'} · {series?.name ?? 'Event'}
                            </p>
                            <div className="mt-1.5 flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="text-[10px] capitalize px-1.5 py-0"
                              >
                                {series?.recurrence ?? 'none'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {members.length} people
                              </span>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-background">
        {activeOccurrence && activeSeries ? (
          <EventDetail
            occurrence={activeOccurrence}
            series={activeSeries}
            eventSeries={eventSeries}
            contacts={contacts}
            groups={groups}
            customFields={customFields}
            groupColorClasses={groupColorClasses}
            participations={participations}
            onUpdateEvent={onUpdateEvent}
            onAddParticipants={onAddParticipants}
            onRemoveParticipant={onRemoveParticipant}
            onSetParticipantPrice={onSetParticipantPrice}
            onAddPayment={onAddPayment}
            onSelectContact={onSelectContact}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-center px-6">
            <div>
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <CalendarDays className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold">Pick an event</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Events keep yearly occurrences and their participant rosters separate from payments.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function EventDetail({
  occurrence,
  series,
  eventSeries,
  contacts,
  groups,
  customFields,
  groupColorClasses,
  participations,
  onUpdateEvent,
  onAddParticipants,
  onRemoveParticipant,
  onSetParticipantPrice,
  onAddPayment,
  onSelectContact,
}: {
  occurrence: EventOccurrence;
  series: EventSeries;
  eventSeries: EventSeries[];
  contacts: Contact[];
  groups: Group[];
  customFields: CustomField[];
  groupColorClasses: Record<GroupColor, ColorClass>;
  participations: EventParticipation[];
  onUpdateEvent: (input: UpdateEventOccurrenceInput) => void;
  onAddParticipants: (input: EventParticipantsInput) => void;
  onRemoveParticipant: (input: EventParticipantInput) => void;
  onSetParticipantPrice: (input: EventParticipantPriceInput) => void;
  onAddPayment: (participationId: string, payment: CreatePaymentInput) => void;
  onSelectContact: (contactId: string) => void;
}) {
  const [editingEvent, setEditingEvent] = useState(false);
  const [editingParticipants, setEditingParticipants] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [eventDraft, setEventDraft] = useState({
    name: occurrence.name,
    date: occurrence.date ?? '',
    location: occurrence.location ?? '',
    notes: occurrence.notes ?? '',
    seriesName: series.name,
    recurrence: series.recurrence,
    color: (series as EventSeries).color ?? 'blue',
  });
  const [priceDrafts, setPriceDrafts] = useState<PriceDraft[]>(() => priceDraftsFromSeries(series));
  const [filterDraft, setFilterDraft] = useState<FilterDraft>(EMPTY_DRAFT);
  const [contactSearch, setContactSearch] = useState('');
  const [stagedContactIds, setStagedContactIds] = useState<string[]>([]);
  const [excludedContactIds, setExcludedContactIds] = useState<string[]>([]);
  const [participantPriceDrafts, setParticipantPriceDrafts] = useState<
    Record<string, ParticipantPriceDraft>
  >({});

  const members = useMemo(
    () => getEventMembers(occurrence, contacts, participations),
    [contacts, occurrence, participations]
  );
  const memberIds = useMemo(() => new Set(members.map((contact) => contact.id)), [members]);
  const searchLower = contactSearch.trim().toLowerCase();
  const availableContacts = contacts
    .filter((contact) => !memberIds.has(contact.id) && !stagedContactIds.includes(contact.id))
    .filter((contact) => {
      if (!searchLower) return true;
      return `${contact.firstName} ${contact.lastName} ${contact.email} ${contact.company} ${contact.title}`
        .toLowerCase()
        .includes(searchLower);
    })
    .slice(0, 8);
  const dynamicPreviewContacts = useMemo(() => {
    if (!hasFilterCriteria(filterDraft)) return [];
    const filter = draftToFilter(filterDraft);
    return resolveListMembers(
      {
        id: `preview-${occurrence.id}`,
        name: occurrence.name,
        type: 'dynamic',
        filter,
        createdAt: occurrence.createdAt,
        updatedAt: occurrence.updatedAt,
      },
      contacts,
      customFields
    ).filter((contact) => !memberIds.has(contact.id));
  }, [contacts, customFields, filterDraft, memberIds, occurrence]);
  const previewContacts = useMemo(() => {
    const merged = new Map<string, Contact>();
    dynamicPreviewContacts.forEach((contact) => merged.set(contact.id, contact));
    contacts
      .filter((contact) => stagedContactIds.includes(contact.id) && !memberIds.has(contact.id))
      .forEach((contact) => merged.set(contact.id, contact));
    return Array.from(merged.values()).sort((a, b) =>
      getContactName(a).localeCompare(getContactName(b))
    );
  }, [contacts, dynamicPreviewContacts, memberIds, stagedContactIds]);
  const includedPreviewContacts = previewContacts.filter(
    (contact) => !excludedContactIds.includes(contact.id)
  );
  const priceOptions = useMemo(() => {
    const normalized =
      series.priceOptions && series.priceOptions.length > 0
        ? series.priceOptions
        : normalizePrices(priceDraftsFromSeries(series));
    return normalized;
  }, [series]);

  useEffect(() => {
    setEventDraft({
      name: occurrence.name,
      date: occurrence.date ?? '',
      location: occurrence.location ?? '',
      notes: occurrence.notes ?? '',
      seriesName: series.name,
      recurrence: series.recurrence,
      color: (series as EventSeries).color ?? 'blue',
    });
    setPriceDrafts(priceDraftsFromSeries(series));
    setFilterDraft(EMPTY_DRAFT);
    setContactSearch('');
    setStagedContactIds([]);
    setExcludedContactIds([]);
    setParticipantPriceDrafts({});
  }, [occurrence, series]);

  function saveEvent() {
    const prices = normalizePrices(priceDrafts);
    onUpdateEvent({
      occurrence: {
        ...occurrence,
        name: eventDraft.name.trim() || occurrence.name,
        date: eventDraft.date || undefined,
        location: eventDraft.location.trim() || undefined,
        notes: eventDraft.notes.trim() || undefined,
        updatedAt: Date.now(),
      },
      series: {
        ...series,
        color: eventDraft.color ?? series.color,
        name: eventDraft.seriesName.trim() || series.name,
        recurrence: eventDraft.recurrence,
        defaultAmountOwed: prices[0]?.amount,
        defaultCurrency: prices[0]?.currency ?? series.defaultCurrency,
        priceOptions: prices,
        defaultPriceOptionId: prices[0]?.id,
        updatedAt: Date.now(),
      },
    });
    setEditingEvent(false);
  }

  function addPreviewParticipants() {
    if (includedPreviewContacts.length === 0) return;
    onAddParticipants({
      occurrenceId: occurrence.id,
      contactIds: includedPreviewContacts.map((contact) => contact.id),
    });
    setFilterDraft(EMPTY_DRAFT);
    setContactSearch('');
    setStagedContactIds([]);
    setExcludedContactIds([]);
    setEditingParticipants(false);
  }

  function addDraftPrice() {
    setPriceDrafts((prev) => [
      ...prev,
      {
        id: `price_${Date.now()}`,
        label: 'Discount',
        amount: '',
        currency: series.defaultCurrency,
        notes: '',
      },
    ]);
  }

  function removeMember(contactId: string) {
    onRemoveParticipant({ occurrenceId: occurrence.id, contactId });
  }

  function assignPrice(contactId: string, amount: number, currency: string) {
    if (!Number.isFinite(amount)) return;
    onSetParticipantPrice({ occurrenceId: occurrence.id, contactId, amountOwed: amount, currency });
    setParticipantPriceDrafts((prev) => {
      const next = { ...prev };
      delete next[contactId];
      return next;
    });
  }

  function cancelPriceEdit(contactId: string) {
    setParticipantPriceDrafts((prev) => {
      const next = { ...prev };
      delete next[contactId];
      return next;
    });
  }

  function startPriceEdit(contactId: string, participation: EventParticipation | undefined) {
    const selectedPrice = priceOptions.find(
      (price) =>
        participation &&
        price.amount === participation.amountOwed &&
        price.currency === participation.currency
    );
    setParticipantPriceDrafts((prev) => ({
      ...prev,
      [contactId]: prev[contactId] ?? {
        priceId: selectedPrice?.id ?? 'custom',
        amount: participation?.amountOwed !== undefined ? String(participation.amountOwed) : '',
        currency: participation?.currency ?? priceOptions[0]?.currency ?? 'EUR',
        customAmount: selectedPrice
          ? ''
          : participation?.amountOwed !== undefined
            ? String(participation.amountOwed)
            : '',
      },
    }));
  }

  function settleParticipation(participation: EventParticipation) {
    const balance = getParticipationBalance(participation);
    if (balance.remaining <= 0) return;
    onAddPayment(participation.id, {
      amount: balance.remaining,
      date: new Date().toISOString().slice(0, 10),
      label: 'Settled',
      note: `Settled from ${occurrence.name}`,
    });
  }

  const eventAccent = getEventAccentClasses(occurrence.id, series?.color);
  const eventDraftColorHex = getColorHex(eventDraft.color);
  const otherEventSeries = useMemo(
    () => eventSeries.filter((item) => item.id !== series.id),
    [eventSeries, series.id]
  );
  const existingEventColors = useMemo(
    () =>
      otherEventSeries
        .map((item) => item.color)
        .filter((color): color is GroupColor => isGroupColor(color)),
    [otherEventSeries]
  );
  const existingCustomHexes = useMemo(
    () =>
      otherEventSeries
        .map((item) => item.color)
        .filter((color): color is string => typeof color === 'string' && color.startsWith('#')),
    [otherEventSeries]
  );

  return (
    <div>
      <ColorPickerDialog
        open={colorPickerOpen}
        onOpenChange={setColorPickerOpen}
        value={eventDraftColorHex}
        onChange={(color) => setEventDraft({ ...eventDraft, color })}
        existingEventColors={existingEventColors}
        existingCustomHexes={existingCustomHexes}
      />

      <div
        className={cn(
          'border-b border-l-4 px-8 py-5 flex items-start justify-between gap-4',
          eventAccent.border,
          eventAccent.header
        )}
        style={{ ...eventAccent.borderStyle, ...eventAccent.headerStyle }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn('h-2.5 w-2.5 rounded-full', eventAccent.dot)}
              style={eventAccent.dotStyle}
            />
            <h2 className="text-2xl font-semibold tracking-tight truncate">{occurrence.name}</h2>
            <Badge variant="outline" className="capitalize">
              {series.recurrence}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {occurrence.date ?? 'No date'} · {series.name}
            {occurrence.location ? ` · ${occurrence.location}` : ''}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            {members.length} participant{members.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditingEvent((value) => !value)}
            className="gap-1.5"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit event
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditingParticipants((value) => !value)}
            className="gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Participants
          </Button>
        </div>
      </div>

      <div className="px-8 py-6 space-y-5">
        {editingEvent && (
          <Card className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <Label className="text-xs">Occurrence name</Label>
                <Input
                  value={eventDraft.name}
                  onChange={(event) => setEventDraft({ ...eventDraft, name: event.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={eventDraft.date}
                  onChange={(event) => setEventDraft({ ...eventDraft, date: event.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-xs">Location</Label>
                <Input
                  value={eventDraft.location}
                  onChange={(event) =>
                    setEventDraft({ ...eventDraft, location: event.target.value })
                  }
                  className="mt-1.5"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Series name</Label>
                <Input
                  value={eventDraft.seriesName}
                  onChange={(event) =>
                    setEventDraft({ ...eventDraft, seriesName: event.target.value })
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-xs">Color</Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setColorPickerOpen(true)}
                  className="mt-1.5 w-full justify-start gap-2"
                >
                  <div
                    className="w-4 h-4 rounded-full border border-foreground/20"
                    style={{ backgroundColor: eventDraftColorHex }}
                  />
                  Pick color
                </Button>
              </div>
              <div>
                <Label className="text-xs">Repeats</Label>
                <select
                  value={eventDraft.recurrence}
                  onChange={(event) =>
                    setEventDraft({
                      ...eventDraft,
                      recurrence: event.target.value as EventRecurrence,
                    })
                  }
                  className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="none">No</option>
                  <option value="yearly">Yearly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
            <div className="rounded-md border border-border">
              <div className="px-3 py-2 border-b border-border bg-secondary/30 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold">Prices</p>
                  <p className="text-[11px] text-muted-foreground">
                    Define standard, early booking, discounts, or other event prices.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={addDraftPrice} className="h-8 gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Price
                </Button>
              </div>
              <div className="divide-y divide-border">
                {priceDrafts.map((price, index) => (
                  <div
                    key={price.id}
                    className="grid grid-cols-[1fr_7rem_5rem_1fr_auto] gap-2 p-3 items-center"
                  >
                    <Input
                      value={price.label}
                      onChange={(event) =>
                        setPriceDrafts((prev) =>
                          prev.map((item) =>
                            item.id === price.id ? { ...item, label: event.target.value } : item
                          )
                        )
                      }
                      className="h-8"
                      placeholder="Standard"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={price.amount}
                      onChange={(event) =>
                        setPriceDrafts((prev) =>
                          prev.map((item) =>
                            item.id === price.id ? { ...item, amount: event.target.value } : item
                          )
                        )
                      }
                      className="h-8 text-right"
                      placeholder="0.00"
                    />
                    <Input
                      value={price.currency}
                      onChange={(event) =>
                        setPriceDrafts((prev) =>
                          prev.map((item) =>
                            item.id === price.id
                              ? { ...item, currency: event.target.value.toUpperCase() }
                              : item
                          )
                        )
                      }
                      className="h-8"
                    />
                    <Input
                      value={price.notes}
                      onChange={(event) =>
                        setPriceDrafts((prev) =>
                          prev.map((item) =>
                            item.id === price.id ? { ...item, notes: event.target.value } : item
                          )
                        )
                      }
                      className="h-8"
                      placeholder="Optional note"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={priceDrafts.length === 1}
                      onClick={() =>
                        setPriceDrafts((prev) => prev.filter((item) => item.id !== price.id))
                      }
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="sr-only">Remove price {index + 1}</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={eventDraft.notes}
                onChange={(event) => setEventDraft({ ...eventDraft, notes: event.target.value })}
                className="mt-1.5 min-h-20"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditingEvent(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveEvent}>
                Save event
              </Button>
            </div>
          </Card>
        )}

        {editingParticipants && (
          <Card className="p-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Add participants
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Filter or search, review the preview, then add a static roster.
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditingParticipants(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={addPreviewParticipants}
                  disabled={includedPreviewContacts.length === 0}
                >
                  Add participants
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-4">
              <div className="space-y-3">
                <DynamicFilterBuilder
                  draft={filterDraft}
                  setDraft={setFilterDraft}
                  groups={groups}
                  customFields={customFields}
                  groupColorClasses={groupColorClasses}
                />
                <div>
                  <Label className="text-xs">Individual search</Label>
                  <div className="mt-2 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={contactSearch}
                      onChange={(event) => setContactSearch(event.target.value)}
                      placeholder="Search contacts..."
                      className="pl-9 h-9"
                    />
                  </div>
                  <div className="mt-2 rounded-md border border-border divide-y divide-border max-h-44 overflow-y-auto">
                    {availableContacts.length === 0 ? (
                      <p className="p-3 text-sm text-muted-foreground">No contacts to add.</p>
                    ) : (
                      availableContacts.map((contact) => (
                        <div key={contact.id} className="px-3 py-2 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {getContactName(contact)}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {contact.title}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setStagedContactIds((prev) => [...prev, contact.id]);
                              setExcludedContactIds((prev) =>
                                prev.filter((id) => id !== contact.id)
                              );
                            }}
                          >
                            Add
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-xs">Preview</Label>
                  <span className="text-xs text-muted-foreground">
                    {includedPreviewContacts.length} included · {excludedContactIds.length} excluded
                  </span>
                </div>
                <div className="mt-2 rounded-md border border-border divide-y divide-border max-h-[26rem] overflow-y-auto">
                  {previewContacts.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">No matching contacts yet.</p>
                  ) : (
                    previewContacts.map((contact) => {
                      const excluded = excludedContactIds.includes(contact.id);
                      const fromManual = stagedContactIds.includes(contact.id);
                      return (
                        <label
                          key={contact.id}
                          className={cn(
                            'px-3 py-2 flex items-center gap-3 cursor-pointer',
                            excluded && 'bg-secondary/40 text-muted-foreground'
                          )}
                        >
                          <Checkbox
                            checked={!excluded}
                            onCheckedChange={(checked) => {
                              setExcludedContactIds((prev) =>
                                checked === true
                                  ? prev.filter((id) => id !== contact.id)
                                  : [...new Set([...prev, contact.id])]
                              );
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {getContactName(contact)}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {contact.title}
                            </p>
                          </div>
                          <Badge variant="outline">{fromManual ? 'Manual' : 'Filter'}</Badge>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        <Card className="gap-0 p-0 overflow-hidden">
          <div
            className={cn(
              'px-5 py-4 flex items-center justify-between border-l-4',
              eventAccent.border,
              eventAccent.header
            )}
            style={{ ...eventAccent.borderStyle, ...eventAccent.headerStyle }}
          >
            <div>
              <h3 className="font-semibold">Participants</h3>
              <p className="text-xs text-muted-foreground">
                Static roster. Add participants again to import more people from filters or search.
              </p>
            </div>
            <Badge variant="outline">{members.length} people</Badge>
          </div>
          {members.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No participants yet.
            </div>
          ) : (
            <div
              className={cn('divide-y divide-border border-l-4', eventAccent.border)}
              style={eventAccent.borderStyle}
            >
              {members.map((contact) => {
                const hasPaymentParticipation = participations.some(
                  (participation) =>
                    participation.occurrenceId === occurrence.id &&
                    participation.contactId === contact.id
                );
                const participation = participations.find(
                  (item) => item.occurrenceId === occurrence.id && item.contactId === contact.id
                );
                const selectedPrice = priceOptions.find(
                  (price) =>
                    participation &&
                    price.amount === participation.amountOwed &&
                    price.currency === participation.currency
                );
                const balance = participation ? getParticipationBalance(participation) : null;
                const priceDraft = participantPriceDrafts[contact.id];
                const activePriceId = priceDraft?.priceId ?? selectedPrice?.id ?? 'custom';
                const activeAmount =
                  priceDraft?.amount ??
                  (participation?.amountOwed !== undefined ? String(participation.amountOwed) : '');
                const activeCurrency =
                  priceDraft?.currency ??
                  participation?.currency ??
                  priceOptions[0]?.currency ??
                  'EUR';
                return (
                  <div
                    key={contact.id}
                    className={cn(
                      'px-4 py-3 grid grid-cols-[auto_minmax(0,1fr)_8rem_10rem_7rem_7rem_auto] items-center gap-4',
                      eventAccent.card
                    )}
                    style={eventAccent.cardStyle}
                  >
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {(contact.firstName[0] ?? '') + (contact.lastName[0] ?? '')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => onSelectContact(contact.id)}
                        className="text-sm font-semibold truncate hover:underline text-left"
                      >
                        {getContactName(contact)}
                      </button>
                      <p className="text-xs text-muted-foreground truncate">
                        {contact.title}
                        {contact.title && contact.company && ' · '}
                        {contact.company}
                      </p>
                    </div>
                    <div className="text-right">
                      {balance ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            'capitalize',
                            balance.remaining > 0 && 'border-red-200 bg-red-50 text-red-800',
                            balance.remaining < 0 &&
                              'border-emerald-300 bg-emerald-50 text-emerald-800'
                          )}
                        >
                          {balance.remaining < 0 ? 'Credit' : getPaymentStatusLabel(balance.status)}
                        </Badge>
                      ) : hasPaymentParticipation ? (
                        <Badge variant="secondary">Payment record</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">No balance</span>
                      )}
                      {balance && (
                        <p
                          className={cn(
                            'mt-1 text-xs tabular-nums',
                            balance.remaining > 0 && 'text-red-800',
                            balance.remaining < 0 && 'text-emerald-700'
                          )}
                        >
                          {formatMoney(balance.remaining, participation!.currency)}
                        </p>
                      )}
                    </div>
                    <select
                      value={activePriceId}
                      onChange={(event) => {
                        startPriceEdit(contact.id, participation);
                        const price = priceOptions.find((item) => item.id === event.target.value);
                        if (price) {
                          setParticipantPriceDrafts((prev) => ({
                            ...prev,
                            [contact.id]: {
                              priceId: price.id,
                              amount: String(price.amount),
                              currency: price.currency,
                              customAmount:
                                prev[contact.id]?.customAmount ??
                                (selectedPrice ? '' : activeAmount),
                            },
                          }));
                          return;
                        }
                        setParticipantPriceDrafts((prev) => ({
                          ...prev,
                          [contact.id]: {
                            priceId: 'custom',
                            amount: prev[contact.id]?.customAmount || activeAmount,
                            currency: activeCurrency,
                            customAmount: prev[contact.id]?.customAmount || activeAmount,
                          },
                        }));
                      }}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="custom">Custom price</option>
                      {priceOptions.map((price) => (
                        <option key={price.id} value={price.id}>
                          {price.label}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      step="0.01"
                      value={activeAmount}
                      onChange={(event) => {
                        startPriceEdit(contact.id, participation);
                        setParticipantPriceDrafts((prev) => ({
                          ...prev,
                          [contact.id]: {
                            priceId: 'custom',
                            amount: event.target.value,
                            currency: activeCurrency,
                            customAmount: event.target.value,
                          },
                        }));
                      }}
                      className="h-8 text-right"
                      placeholder="Price"
                    />
                    <div className="flex justify-end gap-1">
                      {priceDraft ? (
                        <>
                          <Button
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() =>
                              assignPrice(
                                contact.id,
                                Number(priceDraft.amount),
                                priceDraft.currency
                              )
                            }
                          >
                            <Check className="w-4 h-4" />
                            <span className="sr-only">Save price</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => cancelPriceEdit(contact.id)}
                          >
                            <X className="w-4 h-4" />
                            <span className="sr-only">Cancel price edit</span>
                          </Button>
                        </>
                      ) : balance && balance.remaining > 0 ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2"
                          onClick={() => settleParticipation(participation!)}
                        >
                          Settle
                        </Button>
                      ) : null}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeMember(contact.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

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
      ...STANDARD_SEARCHABLE_FIELDS.map((field) => ({
        key: field.key as string,
        label: field.label,
        kind: 'standard' as const,
      })),
      ...customFields.map((field) => ({
        key: `cf:${field.id}`,
        label: field.name,
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
        ? draft.advancedFieldKeys.filter((fieldKey) => fieldKey !== key)
        : [...draft.advancedFieldKeys, key],
    });
  }

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <div>
        <Label className="text-xs">Groups</Label>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {groups.map((group) => {
            const color = groupColorClasses[group.color];
            const active = draft.groupIds.includes(group.id);
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                  active
                    ? cn(color.bg, color.text, 'border-transparent')
                    : 'border-border text-muted-foreground hover:bg-secondary'
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full', color.dot)} />
                {group.name}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox
          checked={draft.starredOnly}
          onCheckedChange={(value) => setDraft({ ...draft, starredOnly: value === true })}
        />
        <span className="text-sm">Only starred contacts</span>
      </label>

      <div>
        <Label className="text-xs">Advanced text filter</Label>
        <div className="mt-2 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={draft.advancedQuery}
            onChange={(event) => setDraft({ ...draft, advancedQuery: event.target.value })}
            placeholder="Type any text..."
            className="pl-9"
          />
        </div>
        <div className="mt-3 rounded-md border border-border">
          <div className="px-3 py-2 border-b border-border bg-secondary/30 flex items-center justify-between">
            <span className="text-xs font-semibold">Fields to search</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setDraft({ ...draft, advancedFieldKeys: fieldOptions.map((field) => field.key) })
                }
                className="text-xs text-primary hover:underline"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => setDraft({ ...draft, advancedFieldKeys: [] })}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="p-3 max-h-36 overflow-y-auto space-y-3">
            <FieldPills
              title="Standard fields"
              options={fieldOptions.filter((field) => field.kind === 'standard')}
              selected={draft.advancedFieldKeys}
              onToggle={toggleField}
            />
            {fieldOptions.some((field) => field.kind === 'custom') && (
              <>
                <Separator />
                <FieldPills
                  title="Custom fields"
                  options={fieldOptions.filter((field) => field.kind === 'custom')}
                  selected={draft.advancedFieldKeys}
                  onToggle={toggleField}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldPills({
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
        {options.map((option) => {
          const active = selected.includes(option.key);
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onToggle(option.key)}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors',
                active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-foreground hover:bg-secondary'
              )}
            >
              {active && <Check className="w-3 h-3" />}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
