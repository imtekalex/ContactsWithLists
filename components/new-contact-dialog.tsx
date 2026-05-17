"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type {
  Contact,
  CurrencyCode,
  CustomField,
  CustomFieldValue,
  EventOccurrence,
  EventPriceOption,
  EventSeries,
  Group,
  ParticipationStatus,
} from "@/lib/contacts-data"
import { ContactCustomFields } from "@/components/contact-custom-fields"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, Trash2, Plus } from "lucide-react"

type ColorClass = { dot: string; bg: string; text: string; ring: string }

const CUSTOM_PRICE_ID = "__custom__"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: Group[]
  groupColorClasses: Record<Group["color"], ColorClass>
  customFields: CustomField[]
  eventOccurrences?: EventOccurrence[]
  eventSeries?: EventSeries[]
  onCreate: (
    contact: Omit<Contact, "id" | "createdAt" | "updatedAt">,
    participations: NewContactParticipationInput[],
  ) => void
}

const empty = {
  firstName: "",
  lastName: "",
  email: "",
  email2: "",
  phone: "",
  phone2: "",
  company: "",
  title: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  zip: "",
  country: "",
  website: "",
  notes: "",
  starred: false,
  tags: [] as string[],
  groupIds: [] as string[],
  customValues: {} as Record<string, CustomFieldValue>,
}

type ParticipationDraft = {
  occurrenceId: string
  status: ParticipationStatus
  priceOptionId: string
  amountOwed: string
  currency: CurrencyCode
  notes: string
}

type PaymentDraft = {
  amount: string
  date: string
  label: string
  note: string
}

export type NewContactPaymentInput = {
  amount: number
  date?: string
  label?: string
  note?: string
}

export type NewContactParticipationInput = {
  occurrenceId: string
  status: ParticipationStatus
  amountOwed: number
  currency: CurrencyCode
  notes?: string
  payments: NewContactPaymentInput[]
}

function getTodayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function NewContactDialog({
  open,
  onOpenChange,
  groups,
  groupColorClasses,
  customFields,
  eventOccurrences = [],
  eventSeries = [],
  onCreate,
}: Props) {
  const [form, setForm] = useState(empty)
  const [participationDrafts, setParticipationDrafts] = useState<ParticipationDraft[]>([])
  const [paymentDrafts, setPaymentDrafts] = useState<PaymentDraft[][]>([])
  const [formMessage, setFormMessage] = useState<string | null>(null)

  function reset() {
    setForm(empty)
    setParticipationDrafts([])
    setPaymentDrafts([])
    setFormMessage(null)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.firstName.trim() && !form.lastName.trim()) return

    const participations = buildParticipationInputs()
    if (!participations) return

    onCreate(form, participations)
    reset()
    onOpenChange(false)
  }

  function toggleGroup(id: string) {
    setForm((f) =>
      f.groupIds.includes(id)
        ? { ...f, groupIds: f.groupIds.filter((g) => g !== id) }
        : { ...f, groupIds: [...f.groupIds, id] },
    )
  }

  // Build a Contact-shaped object so ContactCustomFields can determine
  // visibility and orphan handling using the same rules as the detail view.
  const formAsContact: Contact = {
    id: "__new__",
    firstName: form.firstName,
    lastName: form.lastName,
    email: form.email,
    email2: form.email2 || undefined,
    phone: form.phone,
    phone2: form.phone2 || undefined,
    company: form.company,
    title: form.title,
    addressLine1: form.addressLine1 || undefined,
    addressLine2: form.addressLine2 || undefined,
    city: form.city,
    zip: form.zip || undefined,
    country: form.country,
    website: form.website,
    notes: form.notes,
    starred: form.starred,
    tags: form.tags,
    groupIds: form.groupIds,
    customValues: form.customValues,
    createdAt: 0,
    updatedAt: 0,
  }

  function addParticipation() {
    const newParticipation: ParticipationDraft = {
      occurrenceId: "",
      status: "registered",
      priceOptionId: "",
      amountOwed: "",
      currency: "EUR",
      notes: "",
    }
    setParticipationDrafts([...participationDrafts, newParticipation])
    setPaymentDrafts([...paymentDrafts, []])
    setFormMessage(null)
  }

  function removeParticipation(idx: number) {
    setParticipationDrafts(participationDrafts.filter((_, i) => i !== idx))
    setPaymentDrafts(paymentDrafts.filter((_, i) => i !== idx))
    setFormMessage(null)
  }

  function updateParticipation(idx: number, updates: Partial<ParticipationDraft>) {
    const newDrafts = [...participationDrafts]
    newDrafts[idx] = { ...newDrafts[idx], ...updates }
    setParticipationDrafts(newDrafts)
    setFormMessage(null)
  }

  function addPayment(participationIdx: number) {
    const newPayment: PaymentDraft = {
      amount: "",
      date: getTodayIso(),
      label: "",
      note: "",
    }
    setPaymentDrafts(
      paymentDrafts.map((payments, idx) =>
        idx === participationIdx ? [...payments, newPayment] : payments,
      ),
    )
    setFormMessage(null)
  }

  function updatePayment(participationIdx: number, paymentIdx: number, updates: Partial<PaymentDraft>) {
    setPaymentDrafts(
      paymentDrafts.map((payments, idx) => {
        if (idx !== participationIdx) return payments
        return payments.map((payment, pidx) =>
          pidx === paymentIdx ? { ...payment, ...updates } : payment,
        )
      }),
    )
    setFormMessage(null)
  }

  function removePayment(participationIdx: number, paymentIdx: number) {
    setPaymentDrafts(
      paymentDrafts.map((payments, idx) =>
        idx === participationIdx ? payments.filter((_, i) => i !== paymentIdx) : payments,
      ),
    )
    setFormMessage(null)
  }

  function getOccurrenceName(occurrenceId: string): string {
    const occ = eventOccurrences.find(o => o.id === occurrenceId)
    if (!occ) return "Unknown"
    return `${occ.name}${occ.date ? ` (${occ.date})` : ""}`
  }

  function getSeriesForOccurrence(occurrenceId: string) {
    const occ = eventOccurrences.find(o => o.id === occurrenceId)
    return occ ? eventSeries.find(s => s.id === occ.seriesId) : undefined
  }

  function getPriceOptionsForOccurrence(occurrenceId: string): EventPriceOption[] {
    const series = getSeriesForOccurrence(occurrenceId)
    if (!series) return []
    if (series.priceOptions && series.priceOptions.length > 0) return series.priceOptions
    if (series.defaultAmountOwed === undefined) return []
    return [
      {
        id: series.defaultPriceOptionId ?? `price_${series.id}_standard`,
        label: "Standard",
        amount: series.defaultAmountOwed,
        currency: series.defaultCurrency,
      },
    ]
  }

  function getDefaultPriceOption(occurrenceId: string) {
    const series = getSeriesForOccurrence(occurrenceId)
    const options = getPriceOptionsForOccurrence(occurrenceId)
    return options.find((option) => option.id === series?.defaultPriceOptionId) ?? options[0]
  }

  function updateParticipationEvent(idx: number, occurrenceId: string) {
    if (!occurrenceId) {
      updateParticipation(idx, {
        occurrenceId: "",
        priceOptionId: "",
        amountOwed: "",
        currency: "EUR",
      })
      return
    }

    const series = getSeriesForOccurrence(occurrenceId)
    const defaultPrice = getDefaultPriceOption(occurrenceId)
    updateParticipation(idx, {
      occurrenceId,
      priceOptionId: defaultPrice?.id ?? CUSTOM_PRICE_ID,
      amountOwed: defaultPrice ? String(defaultPrice.amount) : "",
      currency: defaultPrice?.currency ?? series?.defaultCurrency ?? "EUR",
    })
  }

  function updateParticipationPriceChoice(idx: number, priceOptionId: string) {
    const participation = participationDrafts[idx]
    if (!participation) return
    if (priceOptionId === CUSTOM_PRICE_ID) {
      updateParticipation(idx, { priceOptionId: CUSTOM_PRICE_ID })
      return
    }

    const price = getPriceOptionsForOccurrence(participation.occurrenceId).find(
      (option) => option.id === priceOptionId,
    )
    if (!price) return
    updateParticipation(idx, {
      priceOptionId: price.id,
      amountOwed: String(price.amount),
      currency: price.currency,
    })
  }

  function getPriceOptionLabel(price: EventPriceOption) {
    return `${price.label} - ${price.amount} ${price.currency}`
  }

  function buildParticipationInputs(): NewContactParticipationInput[] | null {
    const seenOccurrenceIds = new Set<string>()
    const inputs: NewContactParticipationInput[] = []

    for (const [idx, draft] of participationDrafts.entries()) {
      if (!draft.occurrenceId) {
        setFormMessage(`Choose an event for participation ${idx + 1}.`)
        return null
      }
      if (seenOccurrenceIds.has(draft.occurrenceId)) {
        setFormMessage(`Participation ${idx + 1} uses an event that is already selected.`)
        return null
      }
      seenOccurrenceIds.add(draft.occurrenceId)

      const amountOwed = Number(draft.amountOwed)
      if (!Number.isFinite(amountOwed) || amountOwed < 0) {
        setFormMessage(`Enter a valid price for participation ${idx + 1}.`)
        return null
      }

      const payments: NewContactPaymentInput[] = []
      for (const [paymentIdx, paymentDraft] of (paymentDrafts[idx] ?? []).entries()) {
        const hasPaymentData = Boolean(
          paymentDraft.amount.trim() ||
            paymentDraft.date.trim() ||
            paymentDraft.label.trim() ||
            paymentDraft.note.trim(),
        )
        if (!hasPaymentData) continue

        const amount = Number(paymentDraft.amount)
        if (!Number.isFinite(amount) || amount <= 0) {
          setFormMessage(`Enter a valid payment amount for payment ${paymentIdx + 1} in participation ${idx + 1}.`)
          return null
        }

        payments.push({
          amount,
          date: paymentDraft.date || undefined,
          label: paymentDraft.label.trim() || undefined,
          note: paymentDraft.note.trim() || undefined,
        })
      }

      inputs.push({
        occurrenceId: draft.occurrenceId,
        status: draft.status,
        amountOwed,
        currency: draft.currency,
        notes: draft.notes.trim() || undefined,
        payments,
      })
    }

    setFormMessage(null)
    return inputs
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) reset()
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>New contact</DialogTitle>
            <DialogDescription>Add someone new to your network.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            {/* Basic Info Section */}
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-secondary/50 rounded-lg transition-colors">
                <h3 className="text-sm font-semibold text-foreground">Basic Information</h3>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 pb-4 px-3 space-y-4">
                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Name
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName" className="text-xs">
                        First name
                      </Label>
                      <Input
                        id="firstName"
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                        className="mt-1.5"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="text-xs">
                        Last name
                      </Label>
                      <Input
                        id="lastName"
                        value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Contact information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone" className="text-xs">
                        Phone 1 (primary)
                      </Label>
                      <Input
                        id="phone"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone2" className="text-xs">
                        Phone 2 (secondary)
                      </Label>
                      <Input
                        id="phone2"
                        value={form.phone2}
                        onChange={(e) => setForm({ ...form, phone2: e.target.value })}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-xs">
                        Email 1 (primary)
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email2" className="text-xs">
                        Email 2 (secondary)
                      </Label>
                      <Input
                        id="email2"
                        type="email"
                        value={form.email2}
                        onChange={(e) => setForm({ ...form, email2: e.target.value })}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="company" className="text-xs">
                        Company
                      </Label>
                      <Input
                        id="company"
                        value={form.company}
                        onChange={(e) => setForm({ ...form, company: e.target.value })}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="title" className="text-xs">
                        Title
                      </Label>
                      <Input
                        id="title"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        className="mt-1.5"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="website" className="text-xs">
                        Website
                      </Label>
                      <Input
                        id="website"
                        value={form.website}
                        onChange={(e) => setForm({ ...form, website: e.target.value })}
                        className="mt-1.5"
                        placeholder="https://"
                      />
                    </div>
                  </div>
                </section>
              </CollapsibleContent>
            </Collapsible>

            {/* Address Section */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-secondary/50 rounded-lg transition-colors">
                <h3 className="text-sm font-semibold text-foreground">Address</h3>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 pb-4 px-3">
                <section className="space-y-3">
                  <div>
                    <Label htmlFor="addressLine1" className="text-xs">
                      Street address line 1
                    </Label>
                    <Input
                      id="addressLine1"
                      value={form.addressLine1}
                      onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="addressLine2" className="text-xs">
                      Street address line 2
                    </Label>
                    <Input
                      id="addressLine2"
                      value={form.addressLine2}
                      onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
                      className="mt-1.5"
                      placeholder="Apt, suite, building, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="city" className="text-xs">
                      City
                    </Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="zip" className="text-xs">
                      ZIP / Postal code
                    </Label>
                    <Input
                      id="zip"
                      value={form.zip}
                      onChange={(e) => setForm({ ...form, zip: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="country" className="text-xs">
                      Country
                    </Label>
                    <Input
                      id="country"
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                </section>
              </CollapsibleContent>
            </Collapsible>

            {/* Notes Section */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-secondary/50 rounded-lg transition-colors">
                <h3 className="text-sm font-semibold text-foreground">Notes</h3>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 pb-4 px-3">
                <section>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="min-h-[80px]"
                  />
                </section>
              </CollapsibleContent>
            </Collapsible>

            {/* Groups Section */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-secondary/50 rounded-lg transition-colors">
                <h3 className="text-sm font-semibold text-foreground">Groups & Custom Fields</h3>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 pb-4 px-3 space-y-4">
                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Groups
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {groups.map((g) => {
                      const c = groupColorClasses[g.color]
                      const active = form.groupIds.includes(g.id)
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => toggleGroup(g.id)}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                            active
                              ? cn(c.bg, c.text, "border-transparent")
                              : "border-border text-muted-foreground hover:bg-secondary",
                          )}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />
                          {g.name}
                        </button>
                      )
                    })}
                  </div>
                  {customFields.some((f) => !f.isGlobal) && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Some custom fields are scoped to specific groups and will appear
                      below once you select the matching group.
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <Checkbox
                      id="starred"
                      checked={form.starred}
                      onCheckedChange={(v) => setForm({ ...form, starred: v === true })}
                    />
                    <Label htmlFor="starred" className="text-sm font-normal cursor-pointer">
                      Mark as starred
                    </Label>
                  </div>
                </section>

                {customFields.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        Custom fields
                      </h3>
                      <ContactCustomFields
                        contact={formAsContact}
                        fields={customFields}
                        onChange={(fieldId, value) => {
                          setForm((prev) => {
                            const next = { ...prev.customValues }
                            if (value === undefined) delete next[fieldId]
                            else next[fieldId] = value
                            return { ...prev, customValues: next }
                          })
                        }}
                      />
                    </div>
                  </>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Participation Section */}
            {eventOccurrences && eventOccurrences.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-secondary/50 rounded-lg transition-colors">
                  <h3 className="text-sm font-semibold text-foreground">Participation & Events {participationDrafts.length > 0 && `(${participationDrafts.length})`}</h3>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 pb-4 px-3 space-y-4">
                  {participationDrafts.map((p, idx) => (
                    <div key={idx} className="p-3 border border-border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-muted-foreground">Participation {idx + 1}</div>
                        <button
                          type="button"
                          onClick={() => removeParticipation(idx)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`event-${idx}`} className="text-xs">
                            Event
                          </Label>
                          <select
                            id={`event-${idx}`}
                            value={p.occurrenceId}
                            onChange={(e) => updateParticipationEvent(idx, e.target.value)}
                            className="w-full mt-1.5 px-2 py-1.5 rounded border border-border bg-background text-sm"
                          >
                            <option value="">Select an event</option>
                            {eventOccurrences.map((o) => (
                              <option key={o.id} value={o.id}>
                                {getOccurrenceName(o.id)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label htmlFor={`status-${idx}`} className="text-xs">
                            Status
                          </Label>
                          <select
                            id={`status-${idx}`}
                            value={p.status}
                            onChange={(e) => updateParticipation(idx, { status: e.target.value as ParticipationStatus })}
                            className="w-full mt-1.5 px-2 py-1.5 rounded border border-border bg-background text-sm"
                          >
                            <option value="invited">Invited</option>
                            <option value="registered">Registered</option>
                            <option value="attended">Attended</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="waitlist">Waitlist</option>
                          </select>
                        </div>
                        <div>
                          <Label htmlFor={`price-choice-${idx}`} className="text-xs">
                            Price Choice
                          </Label>
                          <select
                            id={`price-choice-${idx}`}
                            value={p.priceOptionId || CUSTOM_PRICE_ID}
                            onChange={(e) => updateParticipationPriceChoice(idx, e.target.value)}
                            disabled={!p.occurrenceId}
                            className="w-full mt-1.5 px-2 py-1.5 rounded border border-border bg-background text-sm disabled:opacity-50"
                          >
                            <option value={CUSTOM_PRICE_ID}>Custom price</option>
                            {getPriceOptionsForOccurrence(p.occurrenceId).map((price) => (
                              <option key={price.id} value={price.id}>
                                {getPriceOptionLabel(price)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label htmlFor={`amount-${idx}`} className="text-xs">
                            Price amount
                          </Label>
                          <Input
                            id={`amount-${idx}`}
                            type="number"
                            step="0.01"
                            min="0"
                            value={p.amountOwed}
                            onChange={(e) =>
                              updateParticipation(idx, {
                                amountOwed: e.target.value,
                                priceOptionId: CUSTOM_PRICE_ID,
                              })
                            }
                            disabled={!p.occurrenceId}
                            className="mt-1.5"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`currency-${idx}`} className="text-xs">
                            Currency
                          </Label>
                          <select
                            id={`currency-${idx}`}
                            value={p.currency}
                            onChange={(e) =>
                              updateParticipation(idx, {
                                currency: e.target.value as CurrencyCode,
                                priceOptionId: CUSTOM_PRICE_ID,
                              })
                            }
                            disabled={!p.occurrenceId}
                            className="w-full mt-1.5 px-2 py-1.5 rounded border border-border bg-background text-sm disabled:opacity-50"
                          >
                            <option value="EUR">EUR</option>
                            <option value="USD">USD</option>
                            <option value="GBP">GBP</option>
                            <option value="CHF">CHF</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor={`notes-${idx}`} className="text-xs">
                          Notes (optional)
                        </Label>
                        <Textarea
                          id={`notes-${idx}`}
                          value={p.notes}
                          onChange={(e) => updateParticipation(idx, { notes: e.target.value })}
                          className="mt-1.5 min-h-[50px]"
                          placeholder="Optional notes about this participation"
                        />
                      </div>

                      {/* Payments for this participation */}
                      {(paymentDrafts[idx] || []).length > 0 && (
                        <div className="pt-2 border-t border-border space-y-2">
                          <div className="text-xs font-semibold text-muted-foreground">Payments ({paymentDrafts[idx]?.length || 0})</div>
                          {(paymentDrafts[idx] || []).map((payment, pidx) => (
                            <div key={pidx} className="p-2 bg-secondary/30 rounded space-y-2">
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <Label htmlFor={`pay-amount-${idx}-${pidx}`} className="text-xs">
                                    Amount
                                  </Label>
                                  <Input
                                    id={`pay-amount-${idx}-${pidx}`}
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={payment.amount}
                                    onChange={(e) => updatePayment(idx, pidx, { amount: e.target.value })}
                                    className="mt-1 text-xs h-8"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`pay-date-${idx}-${pidx}`} className="text-xs">
                                    Date
                                  </Label>
                                  <Input
                                    id={`pay-date-${idx}-${pidx}`}
                                    type="date"
                                    value={payment.date}
                                    onChange={(e) => updatePayment(idx, pidx, { date: e.target.value })}
                                    className="mt-1 text-xs h-8"
                                  />
                                </div>
                                <div className="flex items-end justify-between gap-1">
                                  <div className="flex-1">
                                    <Label htmlFor={`pay-label-${idx}-${pidx}`} className="text-xs">
                                      Label
                                    </Label>
                                    <Input
                                      id={`pay-label-${idx}-${pidx}`}
                                      value={payment.label}
                                      onChange={(e) => updatePayment(idx, pidx, { label: e.target.value })}
                                      className="mt-1 text-xs h-8"
                                      placeholder="e.g., Down payment"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removePayment(idx, pidx)}
                                    className="text-muted-foreground hover:text-destructive transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              <div>
                                <Label htmlFor={`pay-note-${idx}-${pidx}`} className="text-xs">
                                  Note (optional)
                                </Label>
                                <Input
                                  id={`pay-note-${idx}-${pidx}`}
                                  value={payment.note}
                                  onChange={(e) => updatePayment(idx, pidx, { note: e.target.value })}
                                  className="mt-1 text-xs h-8"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addPayment(idx)}
                        className="w-full gap-2"
                      >
                        <Plus className="w-3 h-3" /> Add Payment
                      </Button>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addParticipation}
                    className="w-full gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Event
                  </Button>
                  {formMessage && (
                    <p className="text-xs text-destructive">{formMessage}</p>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create contact</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
  }
