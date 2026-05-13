"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CalendarDays,
  Check,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserPlus,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import type {
  Contact,
  ContactList,
  CustomField,
  EventOccurrence,
  EventParticipation,
  EventRecurrence,
  EventSeries,
  Group,
  GroupColor,
} from "@/lib/contacts-data"
import { resolveListMembers, STANDARD_SEARCHABLE_FIELDS } from "@/lib/contacts-data"
import { getContactName } from "@/lib/payments"
import { cn } from "@/lib/utils"

type ColorClass = { dot: string; bg: string; text: string; ring: string }

export type CreateEventOccurrenceInput = {
  name: string
  date?: string
  recurrence: EventRecurrence
  defaultAmountOwed?: number
}

export type UpdateEventOccurrenceInput = {
  occurrence: EventOccurrence
  series: EventSeries
}

export type EventParticipantInput = {
  occurrenceId: string
  contactId: string
}

export type EventParticipantsInput = {
  occurrenceId: string
  contactIds: string[]
}

type FilterDraft = {
  starredOnly: boolean
  groupIds: string[]
  advancedQuery: string
  advancedFieldKeys: string[]
}

const EMPTY_DRAFT: FilterDraft = {
  starredOnly: false,
  groupIds: [],
  advancedQuery: "",
  advancedFieldKeys: [],
}

type Props = {
  contacts: Contact[]
  groups: Group[]
  customFields: CustomField[]
  groupColorClasses: Record<GroupColor, ColorClass>
  eventSeries: EventSeries[]
  eventOccurrences: EventOccurrence[]
  participations: EventParticipation[]
  onCreateEvent: (input: CreateEventOccurrenceInput) => void
  onUpdateEvent: (input: UpdateEventOccurrenceInput) => void
  onAddParticipants: (input: EventParticipantsInput) => void
  onRemoveParticipant: (input: EventParticipantInput) => void
}

function draftToFilter(draft: FilterDraft): NonNullable<ContactList["filter"]> {
  const filter: NonNullable<ContactList["filter"]> = {}
  if (draft.starredOnly) filter.starred = true
  if (draft.groupIds.length > 0) filter.groupIds = draft.groupIds
  if (draft.advancedQuery.trim() && draft.advancedFieldKeys.length > 0) {
    filter.advancedSearch = {
      query: draft.advancedQuery.trim(),
      fieldKeys: draft.advancedFieldKeys,
    }
  }
  return filter
}

function hasFilterCriteria(draft: FilterDraft) {
  return (
    draft.starredOnly ||
    draft.groupIds.length > 0 ||
    (draft.advancedQuery.trim().length > 0 && draft.advancedFieldKeys.length > 0)
  )
}

function getYear(occurrence: EventOccurrence) {
  return occurrence.date?.slice(0, 4) ?? "No date"
}

function getEventMembers(
  occurrence: EventOccurrence,
  contacts: Contact[],
  participations: EventParticipation[],
) {
  const manualIds = new Set(occurrence.contactIds ?? [])
  participations
    .filter((participation) => participation.occurrenceId === occurrence.id)
    .forEach((participation) => manualIds.add(participation.contactId))
  return contacts
    .filter((contact) => manualIds.has(contact.id))
    .sort((a, b) => getContactName(a).localeCompare(getContactName(b)))
}

export function EventsView({
  contacts,
  groups,
  customFields,
  groupColorClasses,
  eventSeries,
  eventOccurrences,
  participations,
  onCreateEvent,
  onUpdateEvent,
  onAddParticipants,
  onRemoveParticipant,
}: Props) {
  const [showForm, setShowForm] = useState(false)
  const [activeOccurrenceId, setActiveOccurrenceId] = useState<string | null>(eventOccurrences[0]?.id ?? null)
  const [draft, setDraft] = useState({
    name: "",
    date: "",
    recurrence: "none" as EventRecurrence,
    defaultAmountOwed: "",
  })

  const groupedOccurrences = useMemo(() => {
    const groupsByYear = new Map<string, EventOccurrence[]>()
    eventOccurrences
      .slice()
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
      .forEach((occurrence) => {
        const year = getYear(occurrence)
        groupsByYear.set(year, [...(groupsByYear.get(year) ?? []), occurrence])
      })
    return Array.from(groupsByYear.entries())
  }, [eventOccurrences])

  const activeOccurrence = eventOccurrences.find((occurrence) => occurrence.id === activeOccurrenceId) ?? eventOccurrences[0]
  const activeSeries = activeOccurrence ? eventSeries.find((series) => series.id === activeOccurrence.seriesId) : undefined

  function submit() {
    if (!draft.name.trim()) return
    const amount = draft.defaultAmountOwed ? Number(draft.defaultAmountOwed) : undefined
    onCreateEvent({
      name: draft.name.trim(),
      date: draft.date || undefined,
      recurrence: draft.recurrence,
      defaultAmountOwed: Number.isFinite(amount) ? amount : undefined,
    })
    setDraft({ name: "", date: "", recurrence: "none", defaultAmountOwed: "" })
    setShowForm(false)
  }

  return (
    <div className="flex-1 overflow-hidden flex">
      <aside className="w-[340px] border-r border-border bg-card flex flex-col">
        <header className="px-5 py-4 border-b border-border flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Events</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {eventOccurrences.length} occurrence{eventOccurrences.length === 1 ? "" : "s"} in {eventSeries.length} series
            </p>
          </div>
          <Button size="sm" onClick={() => setShowForm((value) => !value)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            New
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
                  onChange={(event) => setDraft({ ...draft, recurrence: event.target.value as EventRecurrence })}
                  className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="none">No</option>
                  <option value="yearly">Yearly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Default amount for Payments</Label>
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
                      const series = eventSeries.find((item) => item.id === occurrence.seriesId)
                      const members = getEventMembers(occurrence, contacts, participations)
                      return (
                        <li key={occurrence.id}>
                          <button
                            onClick={() => setActiveOccurrenceId(occurrence.id)}
                            className={cn(
                              "w-full text-left px-5 py-3 transition-colors",
                              activeOccurrence?.id === occurrence.id ? "bg-secondary" : "hover:bg-secondary/40",
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                              <p className="text-sm font-semibold truncate">{occurrence.name}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {occurrence.date ?? "No date"} · {series?.name ?? "Event"}
                            </p>
                            <div className="mt-1.5 flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] capitalize px-1.5 py-0">
                                {series?.recurrence ?? "none"}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {members.length} people
                              </span>
                            </div>
                          </button>
                        </li>
                      )
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
            contacts={contacts}
            groups={groups}
            customFields={customFields}
            groupColorClasses={groupColorClasses}
            participations={participations}
            onUpdateEvent={onUpdateEvent}
            onAddParticipants={onAddParticipants}
            onRemoveParticipant={onRemoveParticipant}
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
  )
}

function EventDetail({
  occurrence,
  series,
  contacts,
  groups,
  customFields,
  groupColorClasses,
  participations,
  onUpdateEvent,
  onAddParticipants,
  onRemoveParticipant,
}: {
  occurrence: EventOccurrence
  series: EventSeries
  contacts: Contact[]
  groups: Group[]
  customFields: CustomField[]
  groupColorClasses: Record<GroupColor, ColorClass>
  participations: EventParticipation[]
  onUpdateEvent: (input: UpdateEventOccurrenceInput) => void
  onAddParticipants: (input: EventParticipantsInput) => void
  onRemoveParticipant: (input: EventParticipantInput) => void
}) {
  const [editingEvent, setEditingEvent] = useState(false)
  const [editingParticipants, setEditingParticipants] = useState(false)
  const [eventDraft, setEventDraft] = useState({
    name: occurrence.name,
    date: occurrence.date ?? "",
    location: occurrence.location ?? "",
    notes: occurrence.notes ?? "",
    seriesName: series.name,
    recurrence: series.recurrence,
    defaultAmountOwed: series.defaultAmountOwed?.toString() ?? "",
  })
  const [filterDraft, setFilterDraft] = useState<FilterDraft>(EMPTY_DRAFT)
  const [contactSearch, setContactSearch] = useState("")
  const [stagedContactIds, setStagedContactIds] = useState<string[]>([])
  const [excludedContactIds, setExcludedContactIds] = useState<string[]>([])

  const members = useMemo(
    () => getEventMembers(occurrence, contacts, participations),
    [contacts, occurrence, participations],
  )
  const memberIds = new Set(members.map((contact) => contact.id))
  const searchLower = contactSearch.trim().toLowerCase()
  const availableContacts = contacts
    .filter((contact) => !memberIds.has(contact.id) && !stagedContactIds.includes(contact.id))
    .filter((contact) => {
      if (!searchLower) return true
      return `${contact.firstName} ${contact.lastName} ${contact.email} ${contact.company} ${contact.title}`.toLowerCase().includes(searchLower)
    })
    .slice(0, 8)
  const dynamicPreviewContacts = useMemo(() => {
    if (!hasFilterCriteria(filterDraft)) return []
    const filter = draftToFilter(filterDraft)
    return resolveListMembers(
      {
        id: `preview-${occurrence.id}`,
        name: occurrence.name,
        type: "dynamic",
        filter,
        createdAt: occurrence.createdAt,
        updatedAt: occurrence.updatedAt,
      },
      contacts,
      customFields,
    ).filter((contact) => !memberIds.has(contact.id))
  }, [contacts, customFields, filterDraft, memberIds, occurrence])
  const previewContacts = useMemo(() => {
    const merged = new Map<string, Contact>()
    dynamicPreviewContacts.forEach((contact) => merged.set(contact.id, contact))
    contacts
      .filter((contact) => stagedContactIds.includes(contact.id) && !memberIds.has(contact.id))
      .forEach((contact) => merged.set(contact.id, contact))
    return Array.from(merged.values()).sort((a, b) => getContactName(a).localeCompare(getContactName(b)))
  }, [contacts, dynamicPreviewContacts, memberIds, stagedContactIds])
  const includedPreviewContacts = previewContacts.filter((contact) => !excludedContactIds.includes(contact.id))

  useEffect(() => {
    setEventDraft({
      name: occurrence.name,
      date: occurrence.date ?? "",
      location: occurrence.location ?? "",
      notes: occurrence.notes ?? "",
      seriesName: series.name,
      recurrence: series.recurrence,
      defaultAmountOwed: series.defaultAmountOwed?.toString() ?? "",
    })
    setFilterDraft(EMPTY_DRAFT)
    setContactSearch("")
    setStagedContactIds([])
    setExcludedContactIds([])
  }, [occurrence, series])

  function saveEvent() {
    const amount = eventDraft.defaultAmountOwed ? Number(eventDraft.defaultAmountOwed) : undefined
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
        name: eventDraft.seriesName.trim() || series.name,
        recurrence: eventDraft.recurrence,
        defaultAmountOwed: Number.isFinite(amount) ? amount : undefined,
        updatedAt: Date.now(),
      },
    })
    setEditingEvent(false)
  }

  function addPreviewParticipants() {
    if (includedPreviewContacts.length === 0) return
    onAddParticipants({
      occurrenceId: occurrence.id,
      contactIds: includedPreviewContacts.map((contact) => contact.id),
    })
    setFilterDraft(EMPTY_DRAFT)
    setContactSearch("")
    setStagedContactIds([])
    setExcludedContactIds([])
    setEditingParticipants(false)
  }

  function removeMember(contactId: string) {
    onRemoveParticipant({ occurrenceId: occurrence.id, contactId })
  }

  return (
    <div>
      <div className="px-8 py-5 border-b border-border flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold tracking-tight truncate">{occurrence.name}</h2>
            <Badge variant="outline" className="capitalize">{series.recurrence}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {occurrence.date ?? "No date"} · {series.name}
            {occurrence.location ? ` · ${occurrence.location}` : ""}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            {members.length} participant{members.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditingEvent((value) => !value)} className="gap-1.5">
            <Pencil className="w-3.5 h-3.5" />
            Edit event
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditingParticipants((value) => !value)} className="gap-1.5">
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
                <Input value={eventDraft.name} onChange={(event) => setEventDraft({ ...eventDraft, name: event.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-xs">Date</Label>
                <Input type="date" value={eventDraft.date} onChange={(event) => setEventDraft({ ...eventDraft, date: event.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-xs">Location</Label>
                <Input value={eventDraft.location} onChange={(event) => setEventDraft({ ...eventDraft, location: event.target.value })} className="mt-1.5" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Series name</Label>
                <Input value={eventDraft.seriesName} onChange={(event) => setEventDraft({ ...eventDraft, seriesName: event.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-xs">Repeats</Label>
                <select value={eventDraft.recurrence} onChange={(event) => setEventDraft({ ...eventDraft, recurrence: event.target.value as EventRecurrence })} className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="none">No</option>
                  <option value="yearly">Yearly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Default amount for Payments</Label>
                <Input type="number" step="0.01" value={eventDraft.defaultAmountOwed} onChange={(event) => setEventDraft({ ...eventDraft, defaultAmountOwed: event.target.value })} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea value={eventDraft.notes} onChange={(event) => setEventDraft({ ...eventDraft, notes: event.target.value })} className="mt-1.5 min-h-20" />
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditingEvent(false)}>Cancel</Button>
              <Button size="sm" onClick={saveEvent}>Save event</Button>
            </div>
          </Card>
        )}

        {editingParticipants && (
          <Card className="p-5 space-y-5">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Find participants</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Use filters and individual search to build a preview. Pressing Add participants saves that preview as a static roster.
              </p>
            </div>
            <DynamicFilterBuilder
              draft={filterDraft}
              setDraft={setFilterDraft}
              groups={groups}
              customFields={customFields}
              groupColorClasses={groupColorClasses}
            />
            <Separator />
            <div>
              <Label className="text-xs">Add people individually</Label>
              <div className="mt-2 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={contactSearch} onChange={(event) => setContactSearch(event.target.value)} placeholder="Search contacts..." className="pl-9" />
              </div>
              <div className="mt-2 rounded-md border border-border divide-y divide-border max-h-64 overflow-y-auto">
                {availableContacts.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">No contacts to add.</p>
                ) : (
                  availableContacts.map((contact) => (
                    <div key={contact.id} className="px-3 py-2 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold">
                        {(contact.firstName[0] ?? "") + (contact.lastName[0] ?? "")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{getContactName(contact)}</p>
                        <p className="text-xs text-muted-foreground truncate">{contact.title}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setStagedContactIds((prev) => [...prev, contact.id])
                          setExcludedContactIds((prev) => prev.filter((id) => id !== contact.id))
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between gap-3">
                <Label className="text-xs">Preview to add</Label>
                <span className="text-xs text-muted-foreground">
                  {includedPreviewContacts.length} included · {excludedContactIds.length} excluded
                </span>
              </div>
              <div className="mt-2 rounded-md border border-border divide-y divide-border max-h-72 overflow-y-auto">
                {previewContacts.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">No matching contacts yet.</p>
                ) : (
                  previewContacts.map((contact) => {
                    const excluded = excludedContactIds.includes(contact.id)
                    const fromManual = stagedContactIds.includes(contact.id)
                    return (
                      <label
                        key={contact.id}
                        className={cn(
                          "px-3 py-2 flex items-center gap-3 cursor-pointer",
                          excluded && "bg-secondary/40 text-muted-foreground",
                        )}
                      >
                        <Checkbox
                          checked={!excluded}
                          onCheckedChange={(checked) => {
                            setExcludedContactIds((prev) =>
                              checked === true
                                ? prev.filter((id) => id !== contact.id)
                                : [...new Set([...prev, contact.id])],
                            )
                          }}
                        />
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold">
                          {(contact.firstName[0] ?? "") + (contact.lastName[0] ?? "")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{getContactName(contact)}</p>
                          <p className="text-xs text-muted-foreground truncate">{contact.title}</p>
                        </div>
                        <Badge variant="outline">{fromManual ? "Manual" : "Filter"}</Badge>
                      </label>
                    )
                  })
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditingParticipants(false)}>Cancel</Button>
              <Button size="sm" onClick={addPreviewParticipants} disabled={includedPreviewContacts.length === 0}>
                Add participants
              </Button>
            </div>
          </Card>
        )}

        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 bg-secondary/40 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Participants</h3>
              <p className="text-xs text-muted-foreground">
                Static roster. Add participants again to import more people from filters or search.
              </p>
            </div>
            <Badge variant="outline">{members.length} people</Badge>
          </div>
          {members.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No participants yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {members.map((contact) => {
                const cgroups = groups.filter((group) => contact.groupIds.includes(group.id))
                const hasPaymentParticipation = participations.some(
                  (participation) => participation.occurrenceId === occurrence.id && participation.contactId === contact.id,
                )
                return (
                  <div key={contact.id} className="px-4 py-3 flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {(contact.firstName[0] ?? "") + (contact.lastName[0] ?? "")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{getContactName(contact)}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {contact.title}
                        {contact.title && contact.company && " · "}
                        {contact.company}
                      </p>
                    </div>
                    <div className="hidden md:flex flex-wrap gap-1 max-w-[36%] justify-end">
                      {hasPaymentParticipation && <Badge variant="secondary">Payment record</Badge>}
                      {cgroups.map((group) => {
                        const color = groupColorClasses[group.color]
                        return (
                          <span key={group.id} className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium", color.bg, color.text)}>
                            <span className={cn("w-1 h-1 rounded-full", color.dot)} />
                            {group.name}
                          </span>
                        )
                      })}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeMember(contact.id)} className="text-muted-foreground hover:text-destructive">
                      Remove
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function DynamicFilterBuilder({
  draft,
  setDraft,
  groups,
  customFields,
  groupColorClasses,
}: {
  draft: FilterDraft
  setDraft: (next: FilterDraft) => void
  groups: Group[]
  customFields: CustomField[]
  groupColorClasses: Record<GroupColor, ColorClass>
}) {
  const fieldOptions = useMemo(
    () => [
      ...STANDARD_SEARCHABLE_FIELDS.map((field) => ({ key: field.key as string, label: field.label, kind: "standard" as const })),
      ...customFields.map((field) => ({ key: `cf:${field.id}`, label: field.name, kind: "custom" as const })),
    ],
    [customFields],
  )

  function toggleGroup(id: string) {
    setDraft({
      ...draft,
      groupIds: draft.groupIds.includes(id) ? draft.groupIds.filter((gid) => gid !== id) : [...draft.groupIds, id],
    })
  }

  function toggleField(key: string) {
    setDraft({
      ...draft,
      advancedFieldKeys: draft.advancedFieldKeys.includes(key)
        ? draft.advancedFieldKeys.filter((fieldKey) => fieldKey !== key)
        : [...draft.advancedFieldKeys, key],
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-xs">Groups</Label>
        <p className="text-xs text-muted-foreground mt-0.5">Match any selected group. Leave empty to match all groups.</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {groups.map((group) => {
            const color = groupColorClasses[group.color]
            const active = draft.groupIds.includes(group.id)
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                  active ? cn(color.bg, color.text, "border-transparent") : "border-border text-muted-foreground hover:bg-secondary",
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", color.dot)} />
                {group.name}
              </button>
            )
          })}
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox checked={draft.starredOnly} onCheckedChange={(value) => setDraft({ ...draft, starredOnly: value === true })} />
        <span className="text-sm">Only starred contacts</span>
      </label>

      <Separator />

      <div>
        <Label className="text-xs">Advanced text filter</Label>
        <p className="text-xs text-muted-foreground mt-0.5">Find contacts where any selected field contains this text.</p>
        <div className="mt-2 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={draft.advancedQuery} onChange={(event) => setDraft({ ...draft, advancedQuery: event.target.value })} placeholder="Type any text..." className="pl-9" />
        </div>
        <div className="mt-3 rounded-md border border-border">
          <div className="px-3 py-2 border-b border-border bg-secondary/30 flex items-center justify-between">
            <span className="text-xs font-semibold">Fields to search</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDraft({ ...draft, advancedFieldKeys: fieldOptions.map((field) => field.key) })} className="text-xs text-primary hover:underline">Select all</button>
              <button type="button" onClick={() => setDraft({ ...draft, advancedFieldKeys: [] })} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
            </div>
          </div>
          <div className="p-3 max-h-48 overflow-y-auto space-y-3">
            <FieldPills title="Standard fields" options={fieldOptions.filter((field) => field.kind === "standard")} selected={draft.advancedFieldKeys} onToggle={toggleField} />
            {fieldOptions.some((field) => field.kind === "custom") && (
              <>
                <Separator />
                <FieldPills title="Custom fields" options={fieldOptions.filter((field) => field.kind === "custom")} selected={draft.advancedFieldKeys} onToggle={toggleField} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FieldPills({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string
  options: { key: string; label: string }[]
  selected: string[]
  onToggle: (key: string) => void
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = selected.includes(option.key)
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onToggle(option.key)}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors",
                active ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:bg-secondary",
              )}
            >
              {active && <Check className="w-3 h-3" />}
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
