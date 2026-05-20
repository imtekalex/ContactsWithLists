"use client"

import { useEffect, useId, useState } from "react"
import {
  CalendarDays,
  ChevronDown,
  Globe,
  Mail,
  MapPin,
  NotebookText,
  Plus,
  Star,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
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
} from "@/lib/contacts-data"
import { ContactCustomFields } from "@/components/contact-custom-fields"
import { ContactPhotoPicker } from "@/components/contact-avatar"
import {
  ParticipationSection,
  type CreateParticipationInput,
  type CreatePaymentInput,
  type UpdatePaymentInput,
} from "@/components/participation-section"

type ColorClass = { dot: string; bg: string; text: string; ring: string }

interface Props {
  contact: Contact
  groups: Group[]
  groupColorClasses: Record<Group["color"], ColorClass>
  tagSuggestions: string[]
  customFields: CustomField[]
  eventSeries: EventSeries[]
  eventOccurrences: EventOccurrence[]
  participations: EventParticipation[]
  onUpdate: (contact: Contact) => void
  onDelete: (id: string) => void
  onToggleStar: (id: string) => void
  onCreateParticipation: (input: CreateParticipationInput) => void
  onAddPayment: (participationId: string, payment: CreatePaymentInput) => void
  onUpdatePayment: (participationId: string, paymentId: string, payment: UpdatePaymentInput) => void
  onDeleteParticipation: (participationId: string) => void
  onDeletePayment: (participationId: string, paymentId: string) => void
  onSelectEventPayments: (occurrenceId: string) => void
}

export function ContactDetail({
  contact,
  groups,
  groupColorClasses,
  tagSuggestions,
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
  const [draft, setDraft] = useState<Contact>(() => ensureEditableContact(contact))
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setDraft(ensureEditableContact(contact))
    setDirty(false)
  }, [contact.id])

  function updateDraft(next: Contact) {
    setDraft(ensureEditableContact(next))
    setDirty(true)
  }

  function save() {
    onUpdate(syncLegacyFields(draft))
    setDirty(false)
  }

  function cancel() {
    setDraft(ensureEditableContact(contact))
    setDirty(false)
  }

  function handleCustomChange(fieldId: string, value: CustomFieldValue | undefined) {
    const next = { ...(draft.customValues ?? {}) }
    if (value === undefined) delete next[fieldId]
    else next[fieldId] = value
    updateDraft({ ...draft, customValues: next })
  }

  const name = displayName(draft)
  const subtitle = [draft.title, draft.department, draft.company].filter(Boolean).join(" - ")
  const birthdayParts = draft.birthday ? dateStringToParts(draft.birthday) : newDateWithLabel("Birthday")
  const labelSuggestions = buildLabelSuggestions(draft)

  return (
    <div className="h-full bg-slate-50/70">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-slate-50/95 px-4 py-3 backdrop-blur md:px-8">
        <Card className="overflow-hidden rounded-lg border-border bg-card px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <ContactPhotoPicker
              firstName={draft.firstName}
              lastName={draft.lastName}
              photoUrl={draft.photoUrl}
              size="md"
              onChange={(photoUrl) => updateDraft({ ...draft, photoUrl })}
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-xl font-semibold tracking-tight">{name}</h2>
                <button
                  onClick={() => onToggleStar(contact.id)}
                  className="flex-shrink-0 text-muted-foreground transition-colors hover:text-amber-400"
                  aria-label={contact.starred ? "Unstar contact" : "Star contact"}
                >
                  <Star className={cn("h-5 w-5", contact.starred && "fill-amber-400 text-amber-400")} />
                </button>
              </div>
              <p className="truncate text-sm text-muted-foreground">{subtitle || "Add company, title, or department below"}</p>
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
        </Card>
      </header>

      <div className="grid grid-cols-1 gap-4 px-4 py-5 md:px-8 lg:grid-cols-2">
        <EditSection icon={UserRound} title="Identity" defaultOpen className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(5rem,0.55fr)_minmax(8rem,1fr)_minmax(8rem,1fr)_minmax(8rem,1fr)_minmax(5rem,0.55fr)]">
                <FieldInput label="Prefix" value={draft.namePrefix ?? ""} onChange={(value) => updateDraft({ ...draft, namePrefix: value })} />
                <FieldInput label="First name" value={draft.firstName} onChange={(value) => updateDraft({ ...draft, firstName: value })} />
                <FieldInput label="Middle name" value={draft.middleName ?? ""} onChange={(value) => updateDraft({ ...draft, middleName: value })} />
                <FieldInput label="Last name" value={draft.lastName} onChange={(value) => updateDraft({ ...draft, lastName: value })} />
                <FieldInput label="Suffix" value={draft.nameSuffix ?? ""} onChange={(value) => updateDraft({ ...draft, nameSuffix: value })} />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <FieldInput label="Nickname" value={draft.nickname ?? ""} onChange={(value) => updateDraft({ ...draft, nickname: value })} />
                <FieldInput
                  label="Tags"
                  value={draft.tags.join(", ")}
                  suggestions={tagSuggestions}
                  onChange={(value) =>
                    updateDraft({
                      ...draft,
                      tags: value.split(",").map((tag) => tag.trim()).filter(Boolean),
                    })
                  }
                />
              </div>
            </div>
            {groups.length > 0 && (
              <div className="min-w-0">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Groups</p>
                <div className="flex flex-wrap gap-1.5">
                  {groups.map((group) => {
                    const color = groupColorClasses[group.color]
                    const active = draft.groupIds.includes(group.id)
                    return (
                      <button
                        type="button"
                        key={group.id}
                        onClick={() => {
                          updateDraft({
                            ...draft,
                            groupIds: active
                              ? draft.groupIds.filter((id) => id !== group.id)
                              : [...draft.groupIds, group.id],
                          })
                        }}
                        className={cn(
                          "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors",
                          active ? cn(color.bg, color.text, "border-transparent") : "border-border text-muted-foreground hover:bg-secondary",
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", active ? color.dot : "bg-muted-foreground/50")} />
                        {group.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </EditSection>

        <EditSection icon={Users} title="Work & organizations" defaultOpen>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <FieldInput label="Company" value={draft.company} onChange={(value) => updateDraft({ ...draft, company: value })} />
            <FieldInput label="Job title" value={draft.title} onChange={(value) => updateDraft({ ...draft, title: value })} />
            <FieldInput label="Department" value={draft.department ?? ""} onChange={(value) => updateDraft({ ...draft, department: value })} />
          </div>
        </EditSection>

        <EditSection icon={Mail} title="Contact methods" defaultOpen>
          <RepeatableValueRows
            items={draft.emails ?? []}
            valuePlaceholder="Email"
            labelPlaceholder="Label"
            inputType="email"
            addLabel="Add email"
            labelSuggestions={labelSuggestions}
            onChange={(emails) => updateDraft(syncLegacyFields({ ...draft, emails }))}
          />
          <div className="mt-4">
            <RepeatableValueRows
              items={draft.phones ?? []}
              valuePlaceholder="Phone"
              labelPlaceholder="Label"
              inputType="tel"
              addLabel="Add phone"
              labelSuggestions={labelSuggestions}
              onChange={(phones) => updateDraft(syncLegacyFields({ ...draft, phones }))}
            />
          </div>
        </EditSection>

        <EditSection icon={MapPin} title="Addresses" defaultOpen={hasAnyAddress(draft.addresses ?? [])} className="lg:col-span-2">
          <AddressRows
            items={draft.addresses ?? []}
            labelSuggestions={labelSuggestions}
            onChange={(addresses) => updateDraft(syncLegacyFields({ ...draft, addresses }))}
          />
        </EditSection>

        <EditSection icon={Globe} title="Web & social" defaultOpen={Boolean(draft.website)}>
          <div className="grid grid-cols-1 gap-3">
            <FieldInput label="Website" type="url" value={draft.website} onChange={(website) => updateDraft({ ...draft, website })} />
          </div>
        </EditSection>

        <EditSection icon={CalendarDays} title="Dates & reminders" defaultOpen>
          <div className="space-y-4">
            <DatePartsRow
              item={{ ...birthdayParts, id: "birthday", label: "Birthday" }}
              lockedLabel
              labelSuggestions={labelSuggestions}
              onChange={(birthday) => updateDraft({ ...draft, birthday: hasDateValue(birthday) ? datePartsToString(birthday) : undefined })}
            />
            <DateRows
              items={draft.significantDates ?? []}
              labelSuggestions={labelSuggestions}
              onChange={(significantDates) => updateDraft(syncLegacyFields({ ...draft, significantDates }))}
            />
          </div>
        </EditSection>

        <EditSection icon={Users} title="Relationships" defaultOpen={hasAnyRelationship(draft.relatedPeople ?? [])}>
          <RelatedRows
            items={draft.relatedPeople ?? []}
            labelSuggestions={labelSuggestions}
            onChange={(relatedPeople) => updateDraft(syncLegacyFields({ ...draft, relatedPeople }))}
          />
        </EditSection>

        <EditSection icon={UserRound} title="Custom fields" defaultOpen={customFields.length > 0}>
          <ContactCustomFields contact={draft} fields={customFields} onChange={handleCustomChange} />
        </EditSection>

        <EditSection icon={NotebookText} title="Notes" defaultOpen={Boolean(draft.notes.trim())} className="lg:col-span-2">
          <Textarea
            value={draft.notes}
            onChange={(event) => updateDraft({ ...draft, notes: event.target.value })}
            className="min-h-[120px]"
            placeholder="Notes"
          />
        </EditSection>

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
      </div>
    </div>
  )
}

function RepeatableValueRows({
  items,
  valuePlaceholder,
  labelPlaceholder,
  inputType,
  addLabel,
  labelSuggestions,
  onChange,
}: {
  items: ContactLabeledValue[]
  valuePlaceholder: string
  labelPlaceholder: string
  inputType: string
  addLabel: string
  labelSuggestions: string[]
  onChange: (items: ContactLabeledValue[]) => void
}) {
  const rows = items.length > 0 ? items : [newLabeledValue("")]
  return (
    <div className="space-y-3">
      {rows.map((item, index) => (
        <div key={item.id} className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(10rem,1fr)_minmax(7rem,0.45fr)_2rem] sm:items-end">
          <FieldInput
            label={index === 0 ? valuePlaceholder : `${valuePlaceholder} ${index + 1}`}
            type={inputType}
            value={item.value}
            onChange={(value) => onChange(replaceAt(rows, index, { ...item, value }))}
          />
          <FieldInput
            label={labelPlaceholder}
            value={item.label}
            suggestions={labelSuggestions}
            onChange={(label) => onChange(replaceAt(rows, index, { ...item, label }))}
          />
          {rows.length > 1 && (
            <IconButton className="sm:self-end" label="Remove" onClick={() => onChange(rows.filter((row) => row.id !== item.id))}>
              <X className="h-4 w-4" />
            </IconButton>
          )}
        </div>
      ))}
      <Button type="button" variant="secondary" className="w-full rounded-full gap-2" onClick={() => onChange([...rows, newLabeledValue(defaultLabel(addLabel))])}>
        <Plus className="h-4 w-4" />
        {addLabel}
      </Button>
    </div>
  )
}

function AddressRows({
  items,
  labelSuggestions,
  onChange,
}: {
  items: ContactAddress[]
  labelSuggestions: string[]
  onChange: (items: ContactAddress[]) => void
}) {
  const rows = items.length > 0 ? items : [newAddress()]
  return (
    <div className="space-y-4">
      {rows.map((item, index) => (
        <div key={item.id} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(12rem,1fr)_minmax(8rem,0.35fr)_2rem] md:items-end">
            <FieldInput label={index === 0 ? "Address line 1" : `Address line 1 ${index + 1}`} value={item.addressLine1 ?? ""} onChange={(addressLine1) => onChange(replaceAt(rows, index, { ...item, addressLine1 }))} />
            <FieldInput label="Label" value={item.label} suggestions={labelSuggestions} onChange={(label) => onChange(replaceAt(rows, index, { ...item, label }))} />
            {rows.length > 1 && (
              <IconButton className="md:self-end" label="Remove" onClick={() => onChange(rows.filter((row) => row.id !== item.id))}>
                <X className="h-4 w-4" />
              </IconButton>
            )}
          </div>
          <FieldInput label="Address line 2" value={item.addressLine2 ?? ""} onChange={(addressLine2) => onChange(replaceAt(rows, index, { ...item, addressLine2 }))} />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <FieldInput label="City" value={item.city ?? ""} onChange={(city) => onChange(replaceAt(rows, index, { ...item, city }))} />
            <FieldInput label="ZIP / Postal code" value={item.zip ?? ""} onChange={(zip) => onChange(replaceAt(rows, index, { ...item, zip }))} />
            <FieldInput label="Country" value={item.country ?? ""} onChange={(country) => onChange(replaceAt(rows, index, { ...item, country }))} />
          </div>
        </div>
      ))}
      <Button type="button" variant="secondary" className="w-full rounded-full gap-2" onClick={() => onChange([...rows, newAddress()])}>
        <Plus className="h-4 w-4" />
        Add address
      </Button>
    </div>
  )
}

function DateRows({
  items,
  labelSuggestions,
  onChange,
}: {
  items: ContactDate[]
  labelSuggestions: string[]
  onChange: (items: ContactDate[]) => void
}) {
  const rows = items.length > 0 ? items : [newDate()]
  return (
    <div className="space-y-3">
      {rows.map((item, index) => (
        <DatePartsRow
          key={item.id}
          item={item}
          labelSuggestions={labelSuggestions}
          onChange={(date) => onChange(replaceAt(rows, index, date))}
          trailing={
            rows.length > 1 ? (
              <IconButton className="sm:self-end" label="Remove" onClick={() => onChange(rows.filter((row) => row.id !== item.id))}>
                <X className="h-4 w-4" />
              </IconButton>
            ) : (
              <span aria-hidden="true" />
            )
          }
        />
      ))}
      <Button type="button" variant="secondary" className="w-full rounded-full gap-2" onClick={() => onChange([...rows, newDate()])}>
        <Plus className="h-4 w-4" />
        Add significant date
      </Button>
    </div>
  )
}

function RelatedRows({
  items,
  labelSuggestions,
  onChange,
}: {
  items: ContactRelatedPerson[]
  labelSuggestions: string[]
  onChange: (items: ContactRelatedPerson[]) => void
}) {
  const rows = items.length > 0 ? items : [newRelatedPerson()]
  return (
    <div className="space-y-3">
      {rows.map((item, index) => (
        <div key={item.id} className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(10rem,1fr)_minmax(8rem,0.45fr)_2rem] sm:items-end">
          <FieldInput label={index === 0 ? "Related person" : `Related person ${index + 1}`} value={item.name} onChange={(name) => onChange(replaceAt(rows, index, { ...item, name }))} />
          <FieldInput label="Relationship" value={item.label} suggestions={labelSuggestions} onChange={(label) => onChange(replaceAt(rows, index, { ...item, label }))} />
          {rows.length > 1 && (
            <IconButton className="sm:self-end" label="Remove" onClick={() => onChange(rows.filter((row) => row.id !== item.id))}>
              <X className="h-4 w-4" />
            </IconButton>
          )}
        </div>
      ))}
      <Button type="button" variant="secondary" className="w-full rounded-full gap-2" onClick={() => onChange([...rows, newRelatedPerson()])}>
        <Plus className="h-4 w-4" />
        Add related person
      </Button>
    </div>
  )
}

function DatePartsRow({
  item,
  onChange,
  lockedLabel = false,
  labelSuggestions = [],
  trailing = <span aria-hidden="true" />,
}: {
  item: ContactDate
  onChange: (item: ContactDate) => void
  lockedLabel?: boolean
  labelSuggestions?: string[]
  trailing?: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(4.5rem,0.65fr)_minmax(4.5rem,0.55fr)_minmax(6.5rem,0.85fr)_minmax(8rem,1fr)_2rem] sm:items-end">
      <FieldInput label="Month" value={item.month} onChange={(month) => onChange({ ...item, month })} />
      <FieldInput label="Day" value={item.day} onChange={(day) => onChange({ ...item, day })} />
      <FieldInput label="Year (optional)" value={item.year ?? ""} onChange={(year) => onChange({ ...item, year })} />
      <FieldInput
        label="Label"
        value={item.label}
        suggestions={labelSuggestions}
        onChange={(label) => {
          if (!lockedLabel) onChange({ ...item, label })
        }}
        disabled={lockedLabel}
      />
      {trailing}
    </div>
  )
}

function EditSection({
  icon: Icon,
  title,
  children,
  defaultOpen = false,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(defaultOpen)

  useEffect(() => {
    if (defaultOpen) setOpen(true)
  }, [defaultOpen])

  return (
    <Card className={cn("overflow-hidden rounded-lg border-border bg-card p-0 shadow-sm", className)}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-left transition-colors hover:bg-secondary/40 [&[data-state=open]_.section-chevron]:rotate-180">
          <span className="flex items-center gap-3 text-sm font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </span>
            {title}
          </span>
          <ChevronDown className="section-chevron h-4 w-4 text-muted-foreground transition-transform" />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-5 pt-1">{children}</CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

function FieldInput({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
  suggestions = [],
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  disabled?: boolean
  suggestions?: string[]
}) {
  const generatedListId = useId()
  const listId = suggestions.length > 0 ? generatedListId : undefined
  return (
    <div className="min-w-0 space-y-0.5">
      <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Input
        type={type}
        value={value}
        list={listId}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-8 min-w-0 rounded-none border-x-0 border-t-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
      />
      {listId && (
        <datalist id={listId}>
          {suggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      )}
    </div>
  )
}

function IconButton({ label, onClick, children, className }: { label: string; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <Button type="button" variant="ghost" size="icon-sm" onClick={onClick} className={cn("self-end text-muted-foreground", className)}>
      {children}
      <span className="sr-only">{label}</span>
    </Button>
  )
}

function replaceAt<T>(items: T[], index: number, value: T) {
  return items.map((item, idx) => (idx === index ? value : item))
}

function ensureEditableContact(contact: Contact): Contact {
  const next = syncLegacyFields(contact)
  return {
    ...next,
    emails: next.emails && next.emails.length > 0 ? next.emails : [newLabeledValue("Work", next.email)],
    phones: next.phones && next.phones.length > 0 ? next.phones : [newLabeledValue("Mobile", next.phone)],
    addresses: next.addresses && next.addresses.length > 0 ? next.addresses : [newAddress(next)],
    significantDates: next.significantDates && next.significantDates.length > 0 ? next.significantDates : [newDate()],
    relatedPeople: next.relatedPeople && next.relatedPeople.length > 0 ? next.relatedPeople : [newRelatedPerson()],
  }
}

function syncLegacyFields(contact: Contact): Contact {
  const emails = contact.emails ?? []
  const phones = contact.phones ?? []
  const addresses = contact.addresses ?? []
  const significantDates = contact.significantDates ?? []
  const relatedPeople = contact.relatedPeople ?? []
  const address = addresses.find(hasAddressValue) ?? addresses[0]
  const significantDate = significantDates.find(hasDateValue) ?? significantDates[0]
  const relatedPerson = relatedPeople.find((item) => item.name.trim()) ?? relatedPeople[0]

  return {
    ...contact,
    emails,
    email: emails[0]?.value ?? "",
    email2: emails[1]?.value || undefined,
    phones,
    phone: phones[0]?.value ?? "",
    phone2: phones[1]?.value || undefined,
    addresses,
    addressLine1: address?.addressLine1,
    addressLine2: address?.addressLine2,
    city: address?.city ?? "",
    zip: address?.zip,
    country: address?.country ?? "",
    significantDates,
    significantDate: significantDate && hasDateValue(significantDate) ? datePartsToString(significantDate) : undefined,
    significantDateLabel: significantDate?.label,
    relatedPeople,
    relatedPerson: relatedPerson?.name,
    relationLabel: relatedPerson?.label,
  }
}

function hasAddressValue(item: ContactAddress) {
  return Boolean(item.addressLine1 || item.addressLine2 || item.city || item.zip || item.country)
}

function hasDateValue(item: ContactDate) {
  return Boolean(item.month || item.day || item.year)
}

function newLabeledValue(label: string, value = ""): ContactLabeledValue {
  return { id: `value_${Date.now()}_${Math.random().toString(36).slice(2)}`, label, value }
}

function newAddress(contact?: Contact): ContactAddress {
  return {
    id: `address_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    label: "Home",
    addressLine1: contact?.addressLine1 ?? "",
    addressLine2: contact?.addressLine2 ?? "",
    city: contact?.city ?? "",
    zip: contact?.zip ?? "",
    country: contact?.country ?? "",
  }
}

function newDate(): ContactDate {
  return newDateWithLabel("Anniversary")
}

function newDateWithLabel(label: string): ContactDate {
  return { id: `date_${Date.now()}_${Math.random().toString(36).slice(2)}`, label, month: "", day: "", year: "" }
}

function newRelatedPerson(): ContactRelatedPerson {
  return { id: `related_${Date.now()}_${Math.random().toString(36).slice(2)}`, label: "Spouse", name: "" }
}

function defaultLabel(addLabel: string) {
  if (addLabel.includes("email")) return "Work"
  if (addLabel.includes("phone")) return "Mobile"
  return ""
}

function displayName(contact: Contact) {
  const parts = [contact.namePrefix, contact.firstName, contact.middleName, contact.lastName, contact.nameSuffix].filter(Boolean)
  return parts.join(" ") || contact.nickname || "Unnamed contact"
}

function datePartsToString(value: ContactDate) {
  const rawMonth = value.month.trim()
  const rawDay = value.day.trim()
  if (!rawMonth || !rawDay) return ""
  const month = rawMonth.padStart(2, "0")
  const day = rawDay.padStart(2, "0")
  return value.year ? `${value.year}-${month}-${day}` : `${month}-${day}`
}

function hasAnyAddress(addresses: ContactAddress[]) {
  return addresses.some(hasAddressValue)
}

function hasAnyRelationship(people: ContactRelatedPerson[]) {
  return people.some((person) => person.name.trim().length > 0)
}

function buildLabelSuggestions(contact: Contact) {
  return uniqueStrings([
    "Home",
    "Work",
    "Personal",
    "Mobile",
    "Main",
    "Other",
    "Billing",
    "Shipping",
    "Anniversary",
    "First met",
    "Follow-up",
    "Spouse",
    "Family",
    "Manager",
    "Assistant",
    "Colleague",
    "Client",
    "Referred by",
    ...(contact.emails ?? []).map((item) => item.label),
    ...(contact.phones ?? []).map((item) => item.label),
    ...(contact.addresses ?? []).map((item) => item.label),
    ...(contact.significantDates ?? []).map((item) => item.label),
    ...(contact.relatedPeople ?? []).map((item) => item.label),
  ])
}

function uniqueStrings(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))
}

function dateStringToParts(value: string): ContactDate {
  const parts = value.split("-")
  if (parts.length === 2) return { ...newDateWithLabel("Birthday"), month: parts[0] ?? "", day: parts[1] ?? "" }
  const [year, month, day] = parts
  return { ...newDateWithLabel("Birthday"), month: month ?? "", day: day ?? "", year: year ?? "" }
}
