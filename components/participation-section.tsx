"use client"

import { useMemo, useRef, useState } from "react"
import { CalendarDays, Check, CreditCard, Pencil, Plus, Trash2, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type {
  Contact,
  CurrencyCode,
  EventOccurrence,
  EventParticipation,
  EventSeries,
} from "@/lib/contacts-data"
import { formatMoney, getParticipationBalance, getParticipationLabel } from "@/lib/payments"
import { cn } from "@/lib/utils"

export type CreateParticipationInput = {
  contactId: string
  occurrenceId: string
  eventName?: string
  amountOwed: number
  currency: CurrencyCode
  notes?: string
  initialPayment?: CreatePaymentInput
}

export type CreatePaymentInput = {
  amount: number
  date?: string
  label?: string
  note?: string
}

export type UpdatePaymentInput = CreatePaymentInput

type PaymentDraft = { amount: string; date: string; label: string; note: string }

type Props = {
  contact: Contact
  eventSeries: EventSeries[]
  eventOccurrences: EventOccurrence[]
  participations: EventParticipation[]
  canEdit: boolean
  onCreateParticipation: (input: CreateParticipationInput) => void
  onAddPayment: (participationId: string, payment: CreatePaymentInput) => void
  onUpdatePayment: (participationId: string, paymentId: string, payment: UpdatePaymentInput) => void
  onDeleteParticipation: (participationId: string) => void
  onDeletePayment: (participationId: string, paymentId: string) => void
}

function getTodayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function ParticipationSection({
  contact,
  eventSeries,
  eventOccurrences,
  participations,
  canEdit,
  onCreateParticipation,
  onAddPayment,
  onUpdatePayment,
  onDeleteParticipation,
  onDeletePayment,
}: Props) {
  const contactParticipations = useMemo(
    () => participations.filter((participation) => participation.contactId === contact.id),
    [contact.id, participations],
  )
  const balanceSummary = useMemo(() => {
    return contactParticipations.reduce<Record<string, { total: number; paid: number; remaining: number }>>(
      (summary, participation) => {
        const balance = getParticipationBalance(participation)
        const current = summary[participation.currency] ?? { total: 0, paid: 0, remaining: 0 }
        summary[participation.currency] = {
          total: current.total + balance.total,
          paid: current.paid + balance.paid,
          remaining: current.remaining + balance.remaining,
        }
        return summary
      },
      {},
    )
  }, [contactParticipations])
  const eventOptions = useMemo(
    () =>
      eventOccurrences
        .map((occurrence) => {
          const series = eventSeries.find((item) => item.id === occurrence.seriesId)
          return {
            id: occurrence.id,
            label: `${occurrence.name}${occurrence.date ? ` (${occurrence.date})` : ""}`,
            occurrence,
            series,
          }
        })
        .sort((a, b) => a.label.localeCompare(b.label)),
    [eventOccurrences, eventSeries],
  )

  const participationNodes = useRef<Record<string, HTMLDivElement | null>>({})
  const highlightTimer = useRef<number | null>(null)
  const [highlightedParticipationId, setHighlightedParticipationId] = useState<string | null>(null)
  const [formMessage, setFormMessage] = useState<string | null>(null)
  const [showParticipationForm, setShowParticipationForm] = useState(false)
  const [participationDraft, setParticipationDraft] = useState({
    occurrenceId: "",
    amountOwed: "",
    notes: "",
    downPaymentAmount: "",
    downPaymentDate: getTodayIso(),
    downPaymentLabel: "Down payment",
    downPaymentNote: "",
  })
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, PaymentDraft>>({})
  const [activePaymentForm, setActivePaymentForm] = useState<string | null>(null)
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)

  function emptyPaymentDraft(): PaymentDraft {
    return { amount: "", date: getTodayIso(), label: "", note: "" }
  }

  function resetParticipationDraft() {
    setParticipationDraft({
      occurrenceId: "",
      amountOwed: "",
      notes: "",
      downPaymentAmount: "",
      downPaymentDate: getTodayIso(),
      downPaymentLabel: "Down payment",
      downPaymentNote: "",
    })
    setFormMessage(null)
  }

  function scrollToParticipation(participationId: string) {
    participationNodes.current[participationId]?.scrollIntoView({ behavior: "smooth", block: "center" })
    setHighlightedParticipationId(participationId)
    if (highlightTimer.current) window.clearTimeout(highlightTimer.current)
    highlightTimer.current = window.setTimeout(() => setHighlightedParticipationId(null), 1800)
  }

  function submitParticipation() {
    const selectedEvent = eventOptions.find((item) => item.id === participationDraft.occurrenceId)
    if (!selectedEvent) {
      setFormMessage("Choose an event before adding participation.")
      return
    }

    const existingParticipation = contactParticipations.find(
      (participation) => participation.occurrenceId === selectedEvent.id,
    )
    if (existingParticipation) {
      setFormMessage(`${selectedEvent.occurrence.name} is already assigned to this contact.`)
      scrollToParticipation(existingParticipation.id)
      return
    }

    const amount = Number(participationDraft.amountOwed)
    if (!Number.isFinite(amount) || amount < 0) {
      setFormMessage("Enter a valid amount owed.")
      return
    }

    const downPaymentAmount = Number(participationDraft.downPaymentAmount)
    const initialPayment =
      Number.isFinite(downPaymentAmount) && downPaymentAmount > 0
        ? {
            amount: downPaymentAmount,
            date: participationDraft.downPaymentDate || getTodayIso(),
            label: participationDraft.downPaymentLabel.trim() || "Down payment",
            note: participationDraft.downPaymentNote.trim() || undefined,
          }
        : undefined

    onCreateParticipation({
      contactId: contact.id,
      occurrenceId: selectedEvent.id,
      eventName: selectedEvent.occurrence.name,
      amountOwed: amount,
      currency: selectedEvent.series?.priceOptions?.[0]?.currency ?? selectedEvent.series?.defaultCurrency ?? "EUR",
      notes: participationDraft.notes.trim() || undefined,
      initialPayment,
    })
    resetParticipationDraft()
    setShowParticipationForm(false)
  }

  function submitPayment(participationId: string) {
    const draft = paymentDrafts[participationId] ?? emptyPaymentDraft()
    const amount = Number(draft.amount)
    if (!Number.isFinite(amount) || amount <= 0) return

    onAddPayment(participationId, {
      amount,
      date: draft.date || undefined,
      label: draft.label.trim() || undefined,
      note: draft.note.trim() || undefined,
    })
    setPaymentDrafts((prev) => ({ ...prev, [participationId]: emptyPaymentDraft() }))
    setActivePaymentForm(null)
  }

  function startAddingPayment(participationId: string) {
    setEditingPaymentId(null)
    setPaymentDrafts((prev) => ({
      ...prev,
      [participationId]: prev[participationId] ?? emptyPaymentDraft(),
    }))
    setActivePaymentForm(participationId)
  }

  function startEditingPayment(paymentId: string, payment: EventParticipation["payments"][number]) {
    setActivePaymentForm(null)
    setEditingPaymentId(paymentId)
    setPaymentDrafts((prev) => ({
      ...prev,
      [paymentId]: {
        amount: String(payment.amount),
        date: payment.date ?? getTodayIso(),
        label: payment.label ?? "",
        note: payment.note ?? "",
      },
    }))
  }

  function submitPaymentEdit(participationId: string, paymentId: string) {
    const draft = paymentDrafts[paymentId] ?? emptyPaymentDraft()
    const amount = Number(draft.amount)
    if (!Number.isFinite(amount) || amount <= 0) return

    onUpdatePayment(participationId, paymentId, {
      amount,
      date: draft.date || undefined,
      label: draft.label.trim() || undefined,
      note: draft.note.trim() || undefined,
    })
    setEditingPaymentId(null)
  }

  function deleteParticipation(participation: EventParticipation) {
    const balance = getParticipationBalance(participation)
    if (balance.remaining > 0) return
    onDeleteParticipation(participation.id)
  }

  const selectedEventOption = eventOptions.find((item) => item.id === participationDraft.occurrenceId)
  const summaryEntries = Object.entries(balanceSummary)
  const paymentGridClass =
    "grid min-w-[46rem] grid-cols-[7rem_minmax(8rem,1fr)_minmax(10rem,1.2fr)_8rem_5rem] gap-3"

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Participation & payments
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Event history, payment records, and unsettled balances for this contact.
          </p>
        </div>
        {canEdit && (
          <Button
            size="sm"
            variant="outline"
            disabled={eventOptions.length === 0}
            onClick={() => {
              setShowParticipationForm((value) => !value)
              setFormMessage(null)
            }}
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add participation
          </Button>
        )}
      </div>

      {canEdit && showParticipationForm && (
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Event</Label>
              <select
                value={participationDraft.occurrenceId}
                onChange={(event) => {
                  const option = eventOptions.find((item) => item.id === event.target.value)
                  setParticipationDraft({
                    ...participationDraft,
                    occurrenceId: event.target.value,
                    amountOwed:
                      option?.series?.priceOptions?.[0]?.amount !== undefined
                        ? String(option.series.priceOptions[0].amount)
                        : option?.series?.defaultAmountOwed !== undefined
                          ? String(option.series.defaultAmountOwed)
                          : participationDraft.amountOwed,
                  })
                  setFormMessage(null)
                }}
                className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select event</option>
                {eventOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Amount owed</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={participationDraft.amountOwed}
                onChange={(event) => setParticipationDraft({ ...participationDraft, amountOwed: event.target.value })}
                className="mt-1.5"
              />
            </div>
          </div>
          {selectedEventOption?.series?.description && (
            <p className="text-xs text-muted-foreground">{selectedEventOption.series.description}</p>
          )}
          <div className="rounded-md border border-border p-3 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Optional down payment</p>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label className="text-xs">Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={participationDraft.downPaymentAmount}
                  onChange={(event) =>
                    setParticipationDraft({ ...participationDraft, downPaymentAmount: event.target.value })
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={participationDraft.downPaymentDate}
                  onChange={(event) =>
                    setParticipationDraft({ ...participationDraft, downPaymentDate: event.target.value })
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-xs">Label</Label>
                <Input
                  value={participationDraft.downPaymentLabel}
                  onChange={(event) =>
                    setParticipationDraft({ ...participationDraft, downPaymentLabel: event.target.value })
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-xs">Note</Label>
                <Input
                  value={participationDraft.downPaymentNote}
                  onChange={(event) =>
                    setParticipationDraft({ ...participationDraft, downPaymentNote: event.target.value })
                  }
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>
          <div>
            <Label className="text-xs">Participation notes</Label>
            <Textarea
              value={participationDraft.notes}
              onChange={(event) => setParticipationDraft({ ...participationDraft, notes: event.target.value })}
              className="mt-1.5 min-h-16"
            />
          </div>
          {formMessage && <p className="text-sm text-destructive">{formMessage}</p>}
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                resetParticipationDraft()
                setShowParticipationForm(false)
              }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={submitParticipation}>
              Add participation
            </Button>
          </div>
        </Card>
      )}

      {contactParticipations.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total outstanding</p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {summaryEntries.map(([currency, summary]) => (
                  <span key={currency} className="text-xl font-semibold tabular-nums">
                    {formatMoney(summary.remaining, currency)}
                  </span>
                ))}
              </div>
            </div>
            <div className="hidden md:grid grid-cols-2 gap-6 text-right text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Total owed</p>
                <p className="font-medium tabular-nums">
                  {summaryEntries.map(([currency, summary]) => formatMoney(summary.total, currency)).join(" / ")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="font-medium tabular-nums">
                  {summaryEntries.map(([currency, summary]) => formatMoney(summary.paid, currency)).join(" / ")}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {contactParticipations.length === 0 ? (
        <Card className="p-5 text-center">
          <CalendarDays className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No event participation yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {contactParticipations.map((participation) => {
            const balance = getParticipationBalance(participation)
            const label = getParticipationLabel(participation, eventOccurrences, eventSeries)
            const newPaymentDraft = paymentDrafts[participation.id] ?? emptyPaymentDraft()

            return (
              <div
                key={participation.id}
                ref={(node) => {
                  participationNodes.current[participation.id] = node
                }}
              >
                <Card
                  className={cn(
                    "p-4 space-y-3 transition-shadow",
                    highlightedParticipationId === participation.id && "ring-2 ring-primary ring-offset-2",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold truncate">{label.eventName}</h4>
                        <Badge variant={balance.status === "paid" ? "secondary" : "outline"} className="capitalize">
                          {balance.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {label.date || "No date"} · {label.seriesName} · {participation.status}
                      </p>
                    </div>
                    <div className="text-right text-sm tabular-nums">
                      <p>
                        <span className="text-muted-foreground">Owes </span>
                        <span className={balance.remaining > 0 ? "font-semibold" : "text-muted-foreground"}>
                          {formatMoney(balance.remaining, participation.currency)}
                        </span>
                      </p>
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={balance.remaining > 0}
                          title={balance.remaining > 0 ? "Settle this participation before deleting it." : "Delete participation"}
                          onClick={() => deleteParticipation(participation)}
                          className="mt-2 h-7 px-2 text-muted-foreground hover:text-destructive disabled:hover:text-muted-foreground"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="sr-only">Delete participation</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="rounded-md border border-border overflow-x-auto text-sm">
                    <div className={cn(paymentGridClass, "px-3 py-2 bg-secondary/50 text-xs font-medium text-muted-foreground")}>
                      <span>Date</span>
                      <span>Label</span>
                      <span>Note</span>
                      <span className="text-right">Amount</span>
                      <span />
                    </div>
                    <div className={cn(paymentGridClass, "px-3 py-2 border-t border-border items-center")}>
                      <span className="font-medium">Total</span>
                      <span />
                      <span />
                      <span className="font-medium tabular-nums text-right">
                        {formatMoney(balance.total, participation.currency)}
                      </span>
                      <span />
                    </div>

                    {participation.payments.map((payment) => {
                      const editDraft = paymentDrafts[payment.id] ?? {
                        amount: String(payment.amount),
                        date: payment.date ?? getTodayIso(),
                        label: payment.label ?? "",
                        note: payment.note ?? "",
                      }

                      if (editingPaymentId === payment.id && canEdit) {
                        return (
                          <div key={payment.id} className={cn(paymentGridClass, "px-3 py-2 border-t border-border items-center")}>
                            <Input
                              type="date"
                              value={editDraft.date}
                              aria-label="Payment date"
                              onChange={(event) =>
                                setPaymentDrafts((prev) => ({
                                  ...prev,
                                  [payment.id]: { ...editDraft, date: event.target.value },
                                }))
                              }
                              className="h-8"
                            />
                            <Input
                              value={editDraft.label}
                              aria-label="Payment label"
                              onChange={(event) =>
                                setPaymentDrafts((prev) => ({
                                  ...prev,
                                  [payment.id]: { ...editDraft, label: event.target.value },
                                }))
                              }
                              className="h-8"
                            />
                            <Input
                              value={editDraft.note}
                              aria-label="Payment note"
                              onChange={(event) =>
                                setPaymentDrafts((prev) => ({
                                  ...prev,
                                  [payment.id]: { ...editDraft, note: event.target.value },
                                }))
                              }
                              className="h-8"
                            />
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editDraft.amount}
                              aria-label="Payment amount"
                              onChange={(event) =>
                                setPaymentDrafts((prev) => ({
                                  ...prev,
                                  [payment.id]: { ...editDraft, amount: event.target.value },
                                }))
                              }
                              className="h-8 text-right"
                            />
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => submitPaymentEdit(participation.id, payment.id)}
                              >
                                <Check className="w-4 h-4" />
                                <span className="sr-only">Save payment</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => setEditingPaymentId(null)}
                              >
                                <X className="w-4 h-4" />
                                <span className="sr-only">Cancel payment edit</span>
                              </Button>
                            </div>
                          </div>
                        )
                      }

                      return (
                        <div key={payment.id} className={cn(paymentGridClass, "px-3 py-2 border-t border-border items-center")}>
                          <span className="text-muted-foreground tabular-nums">{payment.date || "No date"}</span>
                          <span className="truncate">{payment.label || "Payment"}</span>
                          <span className={payment.note ? "truncate" : "truncate text-muted-foreground"}>
                            {payment.note || "No note"}
                          </span>
                          <span className="tabular-nums text-emerald-700 text-right">
                            -{formatMoney(payment.amount, participation.currency)}
                          </span>
                          <div className="flex justify-end gap-1">
                            {canEdit && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-muted-foreground"
                                  onClick={() => startEditingPayment(payment.id, payment)}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  <span className="sr-only">Edit payment</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => onDeletePayment(participation.id, payment.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span className="sr-only">Delete payment</span>
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {canEdit && activePaymentForm === participation.id && (
                      <div className={cn(paymentGridClass, "px-3 py-2 border-t border-border items-center")}>
                        <Input
                          type="date"
                          value={newPaymentDraft.date}
                          aria-label="New payment date"
                          onChange={(event) =>
                            setPaymentDrafts((prev) => ({
                              ...prev,
                              [participation.id]: { ...newPaymentDraft, date: event.target.value },
                            }))
                          }
                          className="h-8"
                        />
                        <Input
                          value={newPaymentDraft.label}
                          aria-label="New payment label"
                          onChange={(event) =>
                            setPaymentDrafts((prev) => ({
                              ...prev,
                              [participation.id]: { ...newPaymentDraft, label: event.target.value },
                            }))
                          }
                          className="h-8"
                          placeholder="Down payment"
                        />
                        <Input
                          value={newPaymentDraft.note}
                          aria-label="New payment note"
                          onChange={(event) =>
                            setPaymentDrafts((prev) => ({
                              ...prev,
                              [participation.id]: { ...newPaymentDraft, note: event.target.value },
                            }))
                          }
                          className="h-8"
                          placeholder="Note"
                        />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newPaymentDraft.amount}
                          aria-label="New payment amount"
                          onChange={(event) =>
                            setPaymentDrafts((prev) => ({
                              ...prev,
                              [participation.id]: { ...newPaymentDraft, amount: event.target.value },
                            }))
                          }
                          className="h-8 text-right"
                        />
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => submitPayment(participation.id)}
                          >
                            <Check className="w-4 h-4" />
                            <span className="sr-only">Save payment</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => setActivePaymentForm(null)}
                          >
                            <X className="w-4 h-4" />
                            <span className="sr-only">Cancel payment</span>
                          </Button>
                        </div>
                      </div>
                    )}

                    {canEdit && activePaymentForm !== participation.id && (
                      <div className="border-t border-border px-3 py-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startAddingPayment(participation.id)}
                          className="h-8 gap-1.5"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          Add payment
                        </Button>
                      </div>
                    )}

                    <div className={cn(paymentGridClass, "px-3 py-2 border-t border-border bg-background items-center")}>
                      <span className="font-medium">Remaining</span>
                      <span />
                      <span />
                      <span className="font-semibold tabular-nums text-right">
                        {formatMoney(balance.remaining, participation.currency)}
                      </span>
                      <span />
                    </div>
                  </div>
                </Card>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
