"use client"

import { useEffect, useId, useRef, useState } from "react"
import {
  CalendarDays,
  FileText,
  Globe,
  Mail,
  MapPin,
  Minus,
  Phone,
  Plus,
  Star,
  SlidersHorizontal,
  Tag,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { ContactCustomFields, hasCustomValuesToShow } from "@/components/contact-custom-fields"
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
  const [showCustomFields, setShowCustomFields] = useState(false)
  const [showAllNameFields, setShowAllNameFields] = useState(false)

  useEffect(() => {
    setDraft(ensureEditableContact(contact))
    setDirty(false)
    setShowCustomFields(false)
    setShowAllNameFields(false)
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
  const shouldShowCustomFields = showCustomFields || hasCustomValuesToShow(draft, customFields)
  const visibleNameFields = getVisibleNameFields(draft, showAllNameFields)

  return (
    <div className="h-full bg-slate-50/70">
      <div className="space-y-4 px-4 py-5 md:px-8">
        <section className="mx-auto max-w-6xl">
          <div className="space-y-5">
            <div className="flex flex-col gap-5 md:flex-row md:items-start">
              <ContactPhotoPicker
                firstName={draft.firstName}
                lastName={draft.lastName}
                photoUrl={draft.photoUrl}
                size="lg"
                onChange={(photoUrl) => updateDraft({ ...draft, photoUrl })}
              />
              <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-2xl font-semibold tracking-tight">{name}</h2>
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
            </div>

            <div className="space-y-4">
              <div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {visibleNameFields.map((field) => (
                    <CompactInput
                      key={field.key}
                      label={field.label}
                      value={field.value}
                      onChange={(value) => updateDraft({ ...draft, [field.key]: value })}
                    />
                  ))}
                </div>
                <div className="mt-2">
                  <Button type="button" variant="secondary" size="sm" className="h-8 rounded-full gap-2 px-4" onClick={() => setShowAllNameFields((value) => !value)}>
                    {showAllNameFields ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {showAllNameFields ? "Hide unused name fields" : "Show all name fields"}
                  </Button>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <CompactInput label="Title" value={draft.title} onChange={(value) => updateDraft({ ...draft, title: value })} />
                  <CompactInput label="Company" value={draft.company} onChange={(value) => updateDraft({ ...draft, company: value })} />
                  <CompactInput label="Department" value={draft.department ?? ""} onChange={(value) => updateDraft({ ...draft, department: value })} />
                </div>
              </div>

              <RecordRow label="Tags" icon={Tag}>
                <TagEditor
                  tags={draft.tags}
                  suggestions={tagSuggestions}
                  onChange={(tags) => updateDraft({ ...draft, tags })}
                />
              </RecordRow>

              {groups.length > 0 && (
                <RecordRow label="Groups" icon={Users}>
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
                            active ? cn(color.bg, color.text, "border-transparent") : "border-border bg-background text-muted-foreground hover:bg-secondary",
                          )}
                        >
                          <span className={cn("h-2 w-2 rounded-full", active ? color.dot : "bg-muted-foreground/50")} />
                          {group.name}
                        </button>
                      )
                    })}
                  </div>
                </RecordRow>
              )}

              <RecordGroup>
                <InlineRows
                  items={draft.phones ?? []}
                  valueLabel="Phone"
                  valueType="tel"
                  addLabel="Add phone"
                  labelSuggestions={labelSuggestions.phone}
                  onChange={(phones) => updateDraft(syncLegacyFields({ ...draft, phones }))}
                />
                <InlineRows
                  items={draft.emails ?? []}
                  valueLabel="Email"
                  valueType="email"
                  addLabel="Add email"
                  labelSuggestions={labelSuggestions.email}
                  onChange={(emails) => updateDraft(syncLegacyFields({ ...draft, emails }))}
                />
                <InlineRows
                  items={draft.websites ?? []}
                  valueLabel="Website"
                  valueType="url"
                  addLabel="Add website"
                  labelSuggestions={labelSuggestions.website}
                  onChange={(websites) => updateDraft(syncLegacyFields({ ...draft, websites }))}
                />
              </RecordGroup>

              <AddressRows
                items={draft.addresses ?? []}
                labelSuggestions={labelSuggestions.address}
                onChange={(addresses) => updateDraft(syncLegacyFields({ ...draft, addresses }))}
                compact
              />

              <RecordRow
                icon={CalendarDays}
                labelNode={<StaticLabel text="Birthday" />}
              >
                <DatePartsRow
                  item={{ ...birthdayParts, id: "birthday", label: "Birthday" }}
                  lockedLabel
                  labelSuggestions={labelSuggestions.date}
                  onChange={(birthday) => updateDraft({ ...draft, birthday: hasDateValue(birthday) ? datePartsToString(birthday) : undefined })}
                  compact
                  hideLabel
                />
              </RecordRow>

              <DateRows
                items={draft.significantDates ?? []}
                labelSuggestions={labelSuggestions.date}
                onChange={(significantDates) => updateDraft(syncLegacyFields({ ...draft, significantDates }))}
                compact
              />

              <RelatedRows
                items={draft.relatedPeople ?? []}
                labelSuggestions={labelSuggestions.relationship}
                onChange={(relatedPeople) => updateDraft(syncLegacyFields({ ...draft, relatedPeople }))}
                compact
              />

              <RecordRow label="Notes" icon={FileText}>
                <Textarea
                  value={draft.notes}
                  onChange={(event) => updateDraft({ ...draft, notes: event.target.value })}
                  className="min-h-[76px] rounded-md border-0 bg-transparent px-1 pt-1 shadow-none hover:bg-secondary/50 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Notes"
                />
              </RecordRow>

              <RecordRow label="Custom" icon={SlidersHorizontal}>
                {shouldShowCustomFields ? (
                  <div className="max-w-[42rem]">
                    <ContactCustomFields contact={draft} fields={customFields} onChange={handleCustomChange} />
                  </div>
                ) : (
                  <Button type="button" variant="secondary" className="h-8 rounded-full gap-2" onClick={() => setShowCustomFields(true)}>
                    <Plus className="h-4 w-4" />
                    Add custom fields
                  </Button>
                )}
              </RecordRow>
            </div>
          </div>
        </section>

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

function RecordGroup({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1.5">{children}</div>
}

function TagEditor({
  tags,
  suggestions,
  onChange,
}: {
  tags: string[]
  suggestions: string[]
  onChange: (tags: string[]) => void
}) {
  const [draft, setDraft] = useState("")
  const listId = useId()

  function addTag(value: string) {
    const tag = value.trim()
    if (!tag) return
    onChange(uniqueStrings([...tags, tag]))
    setDraft("")
  }

  function handleChange(value: string) {
    if (value.includes(",")) {
      const parts = value.split(",")
      const complete = parts.slice(0, -1)
      const rest = parts.at(-1) ?? ""
      onChange(uniqueStrings([...tags, ...complete]))
      setDraft(rest)
    } else {
      setDraft(value)
    }
  }

  return (
    <div className="flex min-h-7 flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <button
          type="button"
          key={tag}
          onClick={() => onChange(tags.filter((item) => item !== tag))}
          className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
        >
          {tag}
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      ))}
      <Input
        value={draft}
        list={listId}
        placeholder={tags.length > 0 ? "Add tag" : "Tags"}
        aria-label="Add tag"
        onChange={(event) => handleChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            addTag(draft)
          }
        }}
        onBlur={() => addTag(draft)}
        className="h-7 min-w-24 flex-1 rounded-md border-0 bg-transparent px-1 text-sm shadow-none placeholder:text-muted-foreground/45 hover:bg-secondary/50 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring"
      />
      <datalist id={listId}>
        {suggestions.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
    </div>
  )
}

function RecordRow({
  label,
  labelNode,
  icon: Icon,
  iconSpacer = false,
  children,
}: {
  label?: string
  labelNode?: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  iconSpacer?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-1 gap-y-1.5 py-1 sm:grid-cols-[1.25rem_7.5rem_minmax(0,1fr)] sm:gap-x-1">
      <div className="hidden h-7 items-center justify-center self-start text-muted-foreground sm:flex">
        {Icon ? <Icon className="h-4 w-4" /> : iconSpacer ? <span className="h-4 w-4" aria-hidden="true" /> : null}
      </div>
      <div className="min-h-7 self-start pr-3">{labelNode ?? <StaticLabel text={label ?? ""} />}</div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function InlineRows({
  items,
  valueLabel,
  valueType,
  addLabel,
  labelSuggestions,
  onChange,
}: {
  items: ContactLabeledValue[]
  valueLabel: string
  valueType: string
  addLabel: string
  labelSuggestions: string[]
  onChange: (items: ContactLabeledValue[]) => void
}) {
  const rows = items.length > 0 ? items : [newLabeledValue(defaultLabel(addLabel))]
  const Icon = iconForValueLabel(valueLabel)
  return (
    <div className="space-y-1.5">
      {rows.map((item, index) => (
        <RecordRow
          key={item.id}
          icon={index === 0 ? Icon : undefined}
          labelNode={
            <LabelInput
              ariaLabel={`${valueLabel} label ${index + 1}`}
              value={item.label}
              placeholder={valueLabel}
              suggestions={labelSuggestions}
              onChange={(label) => onChange(replaceAt(rows, index, { ...item, label }))}
            />
          }
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(12rem,36rem)_2rem] sm:items-center">
            <CompactInput
              ariaLabel={`${valueLabel} ${index + 1}`}
              placeholder={valueLabel}
              type={valueType}
              value={item.value}
              onChange={(value) => onChange(replaceAt(rows, index, { ...item, value }))}
            />
            {rows.length > 1 ? (
              <IconButton label="Remove" onClick={() => onChange(rows.filter((row) => row.id !== item.id))}>
                <X className="h-4 w-4" />
              </IconButton>
            ) : (
              <ActionSpacer />
            )}
          </div>
        </RecordRow>
      ))}
      <RecordRow label="" iconSpacer>
        <Button type="button" variant="secondary" className="h-8 rounded-full gap-2 px-4" onClick={() => onChange([...rows, newLabeledValue(defaultLabel(addLabel))])}>
          <Plus className="h-4 w-4" />
          {addLabel}
        </Button>
      </RecordRow>
    </div>
  )
}

function AddressRows({
  items,
  labelSuggestions,
  onChange,
  compact = false,
}: {
  items: ContactAddress[]
  labelSuggestions: string[]
  onChange: (items: ContactAddress[]) => void
  compact?: boolean
}) {
  const rows = items.length > 0 ? items : [newAddress()]
  if (compact) {
    return (
      <div className="space-y-3">
        {rows.map((item, index) => (
          <RecordRow
            key={item.id}
            icon={index === 0 ? MapPin : undefined}
            labelNode={
              <LabelInput ariaLabel={`Address label ${index + 1}`} value={item.label} placeholder="Address" suggestions={labelSuggestions} onChange={(label) => onChange(replaceAt(rows, index, { ...item, label }))} />
            }
          >
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(14rem,42rem)_2rem] sm:items-center">
                <CompactInput ariaLabel={`Address line 1 ${index + 1}`} placeholder="Address line 1" value={item.addressLine1 ?? ""} onChange={(addressLine1) => onChange(replaceAt(rows, index, { ...item, addressLine1 }))} />
                {rows.length > 1 ? (
                  <IconButton label="Remove" onClick={() => onChange(rows.filter((row) => row.id !== item.id))}>
                    <X className="h-4 w-4" />
                  </IconButton>
                ) : (
                  <ActionSpacer />
                )}
              </div>
              <div className="max-w-[42rem]">
                <CompactInput ariaLabel={`Address line 2 ${index + 1}`} placeholder="Address line 2" value={item.addressLine2 ?? ""} onChange={(addressLine2) => onChange(replaceAt(rows, index, { ...item, addressLine2 }))} />
              </div>
              <div className="grid max-w-[42rem] grid-cols-1 gap-2 md:grid-cols-[minmax(8rem,1fr)_minmax(7rem,0.8fr)_minmax(8rem,1fr)]">
                <CompactInput ariaLabel={`City ${index + 1}`} placeholder="City" value={item.city ?? ""} onChange={(city) => onChange(replaceAt(rows, index, { ...item, city }))} />
                <CompactInput ariaLabel={`ZIP or postal code ${index + 1}`} placeholder="ZIP / postal code" value={item.zip ?? ""} onChange={(zip) => onChange(replaceAt(rows, index, { ...item, zip }))} />
                <CompactInput ariaLabel={`Country ${index + 1}`} placeholder="Country" value={item.country ?? ""} onChange={(country) => onChange(replaceAt(rows, index, { ...item, country }))} />
              </div>
            </div>
          </RecordRow>
        ))}
        <RecordRow label="" iconSpacer>
          <Button type="button" variant="secondary" className="h-8 rounded-full gap-2 px-4" onClick={() => onChange([...rows, newAddress()])}>
            <Plus className="h-4 w-4" />
            Add address
          </Button>
        </RecordRow>
      </div>
    )
  }
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
  compact = false,
}: {
  items: ContactDate[]
  labelSuggestions: string[]
  onChange: (items: ContactDate[]) => void
  compact?: boolean
}) {
  const rows = items.length > 0 ? items : [newDate()]
  if (compact) {
    return (
      <div className="space-y-3">
        {rows.map((item, index) => (
          <RecordRow
            key={item.id}
            icon={index === 0 ? CalendarDays : undefined}
            labelNode={
              <LabelInput ariaLabel={`Date label ${index + 1}`} value={item.label} placeholder="Date" suggestions={labelSuggestions} onChange={(label) => onChange(replaceAt(rows, index, { ...item, label }))} />
            }
          >
            <DatePartsRow
              item={item}
              labelSuggestions={labelSuggestions}
              onChange={(date) => onChange(replaceAt(rows, index, date))}
              compact
              hideLabel
              trailing={
                rows.length > 1 ? (
                  <IconButton label="Remove" onClick={() => onChange(rows.filter((row) => row.id !== item.id))}>
                    <X className="h-4 w-4" />
                  </IconButton>
                ) : (
                  <ActionSpacer />
                )
              }
            />
          </RecordRow>
        ))}
        <RecordRow label="" iconSpacer>
          <Button type="button" variant="secondary" className="h-8 rounded-full gap-2 px-4" onClick={() => onChange([...rows, newDate()])}>
            <Plus className="h-4 w-4" />
            Add significant date
          </Button>
        </RecordRow>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {rows.map((item, index) => (
        <DatePartsRow
          key={item.id}
          item={item}
          labelSuggestions={labelSuggestions}
          onChange={(date) => onChange(replaceAt(rows, index, date))}
          compact={compact}
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
  compact = false,
}: {
  items: ContactRelatedPerson[]
  labelSuggestions: string[]
  onChange: (items: ContactRelatedPerson[]) => void
  compact?: boolean
}) {
  const rows = items.length > 0 ? items : [newRelatedPerson()]
  if (compact) {
    return (
      <div className="space-y-3">
        {rows.map((item, index) => (
          <RecordRow
            key={item.id}
            icon={index === 0 ? UserRound : undefined}
            labelNode={
              <LabelInput ariaLabel={`Relationship ${index + 1}`} value={item.label} placeholder="Relationship" suggestions={labelSuggestions} onChange={(label) => onChange(replaceAt(rows, index, { ...item, label }))} />
            }
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(10rem,30rem)_2rem] sm:items-center">
              <CompactInput ariaLabel={`Related person ${index + 1}`} placeholder="Related person" value={item.name} onChange={(name) => onChange(replaceAt(rows, index, { ...item, name }))} />
              {rows.length > 1 ? (
                <IconButton label="Remove" onClick={() => onChange(rows.filter((row) => row.id !== item.id))}>
                  <X className="h-4 w-4" />
                </IconButton>
              ) : (
                <ActionSpacer />
              )}
            </div>
          </RecordRow>
        ))}
        <RecordRow label="" iconSpacer>
          <Button type="button" variant="secondary" className="h-8 rounded-full gap-2 px-4" onClick={() => onChange([...rows, newRelatedPerson()])}>
            <Plus className="h-4 w-4" />
            Add related person
          </Button>
        </RecordRow>
      </div>
    )
  }
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
  compact = false,
  hideLabel = false,
}: {
  item: ContactDate
  onChange: (item: ContactDate) => void
  lockedLabel?: boolean
  labelSuggestions?: string[]
  trailing?: React.ReactNode
  compact?: boolean
  hideLabel?: boolean
}) {
  if (compact) {
    return (
      <div className={cn("grid grid-cols-1 gap-2 sm:items-center", hideLabel ? "sm:grid-cols-[4.75rem_4.25rem_7rem_2rem_2rem]" : "sm:grid-cols-[4.75rem_4.25rem_7rem_2rem_minmax(8rem,14rem)_2rem]")}>
        <CompactInput ariaLabel="Month" placeholder="Month" value={item.month} onChange={(month) => onChange({ ...item, month })} />
        <CompactInput ariaLabel="Day" placeholder="Day" value={item.day} onChange={(day) => onChange({ ...item, day })} />
        <CompactInput ariaLabel="Year optional" placeholder="Year (optional)" value={item.year ?? ""} onChange={(year) => onChange({ ...item, year })} />
        <DatePickerInput
          value={datePartsToDateInput(item)}
          onChange={(value) => {
            if (value) onChange({ ...item, ...dateInputToParts(value) })
          }}
        />
        {!hideLabel && (
          <CompactInput
            ariaLabel="Label"
            value={item.label}
            suggestions={labelSuggestions}
            onChange={(label) => {
              if (!lockedLabel) onChange({ ...item, label })
            }}
            disabled={lockedLabel}
          />
        )}
        {trailing}
      </div>
    )
  }
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

function CompactInput({
  label,
  ariaLabel,
  placeholder,
  value,
  onChange,
  type = "text",
  disabled = false,
  suggestions = [],
}: {
  label?: string
  ariaLabel?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  type?: string
  disabled?: boolean
  suggestions?: string[]
}) {
  const generatedListId = useId()
  const listId = suggestions.length > 0 ? generatedListId : undefined
  return (
    <div className="min-w-0">
      {label && <Label className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</Label>}
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
  )
}

function DatePickerInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Input
      type="date"
      value={value}
      aria-label="Pick date"
      title="Pick date"
      onChange={(event) => onChange(event.target.value)}
      className="h-7 w-8 rounded-md border-0 bg-transparent px-1 text-transparent shadow-none [color-scheme:light] hover:bg-secondary/50 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70"
    />
  )
}

function LabelInput({
  ariaLabel,
  placeholder,
  value,
  onChange,
  suggestions = [],
}: {
  ariaLabel: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  suggestions?: string[]
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const filteredSuggestions = suggestions.filter((suggestion) => {
    const current = value.trim().toLowerCase()
    return suggestion !== value && (!current || suggestion.toLowerCase().includes(current))
  }).slice(0, 8)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <LabelControl
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onFocus={() => setOpen(filteredSuggestions.length > 0)}
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false)
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
                onChange(suggestion)
                setOpen(false)
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function StaticLabel({ text }: { text: string }) {
  return (
    <span className={cn(labelControlClassName, "pointer-events-none")}>{text}</span>
  )
}

const labelControlClassName =
  "ml-auto flex h-7 w-full min-w-0 items-center justify-start rounded-md border-0 bg-transparent px-1 text-left text-sm font-medium text-muted-foreground shadow-none placeholder:text-muted-foreground/45 hover:bg-secondary/50 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring sm:justify-end sm:text-right"

function LabelControl(props: React.ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      className={cn(
        labelControlClassName,
        props.className,
      )}
    />
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
  return (
    <CompactInput
      label={label}
      value={value}
      onChange={onChange}
      type={type}
      disabled={disabled}
      suggestions={suggestions}
    />
  )
}

function IconButton({ label, onClick, children, className }: { label: string; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <Button type="button" variant="ghost" size="icon-sm" onClick={onClick} className={cn("h-7 w-7 self-center text-muted-foreground", className)}>
      {children}
      <span className="sr-only">{label}</span>
    </Button>
  )
}

function ActionSpacer() {
  return <span className="hidden h-7 w-7 sm:block" aria-hidden="true" />
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
    websites: next.websites && next.websites.length > 0 ? next.websites : [newLabeledValue("Website", next.website)],
    addresses: next.addresses && next.addresses.length > 0 ? next.addresses : [newAddress(next)],
    significantDates: next.significantDates && next.significantDates.length > 0 ? next.significantDates : [newDate()],
    relatedPeople: next.relatedPeople && next.relatedPeople.length > 0 ? next.relatedPeople : [newRelatedPerson()],
  }
}

function syncLegacyFields(contact: Contact): Contact {
  const emails = contact.emails ?? []
  const phones = contact.phones ?? []
  const websites = contact.websites ?? []
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
    websites,
    website: websites[0]?.value ?? "",
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
  if (addLabel.includes("website")) return "Website"
  return ""
}

function iconForValueLabel(valueLabel: string) {
  if (valueLabel === "Phone") return Phone
  if (valueLabel === "Email") return Mail
  if (valueLabel === "Website") return Globe
  return undefined
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

function getVisibleNameFields(contact: Contact, showAll: boolean) {
  const fields: Array<{ key: "namePrefix" | "firstName" | "middleName" | "lastName" | "nameSuffix" | "nickname"; label: string; value: string }> = [
    { key: "namePrefix", label: "Prefix", value: contact.namePrefix ?? "" },
    { key: "firstName", label: "First name", value: contact.firstName },
    { key: "middleName", label: "Middle name", value: contact.middleName ?? "" },
    { key: "lastName", label: "Last name", value: contact.lastName },
    { key: "nameSuffix", label: "Suffix", value: contact.nameSuffix ?? "" },
    { key: "nickname", label: "Nickname", value: contact.nickname ?? "" },
  ]
  if (showAll) return fields
  return fields.filter((field) => field.key === "firstName" || field.key === "lastName" || field.value.trim().length > 0)
}

function datePartsToDateInput(value: ContactDate) {
  const rawMonth = value.month.trim()
  const rawDay = value.day.trim()
  const rawYear = value.year?.trim()
  if (!rawMonth || !rawDay || !rawYear) return ""
  return `${rawYear}-${rawMonth.padStart(2, "0")}-${rawDay.padStart(2, "0")}`
}

function dateInputToParts(value: string) {
  const [year, month, day] = value.split("-")
  return { year: year ?? "", month: month ?? "", day: day ?? "" }
}

function buildLabelSuggestions(contact: Contact) {
  return {
    phone: uniqueStrings([
      "Mobile",
      "Work",
      "Home",
      "Main",
      "Office",
      "Fax",
      "Other",
      ...(contact.phones ?? []).map((item) => item.label),
    ]),
    email: uniqueStrings([
      "Work",
      "Personal",
      "Home",
      "Billing",
      "School",
      "Other",
      ...(contact.emails ?? []).map((item) => item.label),
    ]),
    website: uniqueStrings([
      "Website",
      "Portfolio",
      "LinkedIn",
      "GitHub",
      "Company",
      "Other",
      ...(contact.websites ?? []).map((item) => item.label),
    ]),
    address: uniqueStrings([
      "Home",
      "Work",
      "Billing",
      "Shipping",
      "Other",
      ...(contact.addresses ?? []).map((item) => item.label),
    ]),
    date: uniqueStrings([
      "Anniversary",
      "Birthday",
      "First met",
      "Last contacted",
      "Follow-up",
      "Work anniversary",
      "Other",
      ...(contact.significantDates ?? []).map((item) => item.label),
    ]),
    relationship: uniqueStrings([
      "Spouse",
      "Partner",
      "Family",
      "Parent",
      "Child",
      "Sibling",
      "Friend",
      "Manager",
      "Assistant",
      "Colleague",
      "Client",
      "Vendor",
      "Referred by",
      "Emergency contact",
      "Other",
      ...(contact.relatedPeople ?? []).map((item) => item.label),
    ]),
  }
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
