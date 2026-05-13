"use client"

import { useMemo, useState } from "react"
import { CalendarDays, CreditCard, Plus, Trash2 } from "lucide-react"

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
  EventRecurrence,
  EventSeries,
} from "@/lib/contacts-data"
import {
  formatMoney,
  getParticipationBalance,
  getParticipationLabel,
} from "@/lib/payments"

export type CreateParticipationInput = {
  contactId: string
  eventName: string
  date?: string
  amountOwed: number
  currency: CurrencyCode
  recurrence: EventRecurrence
  notes?: string
}

export type CreatePaymentInput = {
  amount: number
  date?: string
  label?: string
  note?: string
}

type Props = {
  contact: Contact
  eventSeries: EventSeries[]
  eventOccurrences: EventOccurrence[]
  participations: EventParticipation[]
  onCreateParticipation: (input: CreateParticipationInput) => void
  onAddPayment: (participationId: string, payment: CreatePaymentInput) => void
  onDeletePayment: (participationId: string, paymentId: string) => void
}

export function ParticipationSection({
  contact,
  eventSeries,
  eventOccurrences,
  participations,
  onCreateParticipation,
  onAddPayment,
  onDeletePayment,
}: Props) {
  const contactParticipations = useMemo(
    () => participations.filter((participation) => participation.contactId === contact.id),
    [contact.id, participations],
  )
  const [showEventForm, setShowEventForm] = useState(false)
  const [eventDraft, setEventDraft] = useState({
    eventName: "",
    date: "",
    amountOwed: "",
    currency: "EUR",
    recurrence: "none" as EventRecurrence,
    notes: "",
  })
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, { amount: string; date: string; label: string; note: string }>>({})
  const [activePaymentForm, setActivePaymentForm] = useState<string | null>(null)

  function submitEvent() {
    const amount = Number(eventDraft.amountOwed)
    if (!eventDraft.eventName.trim() || !Number.isFinite(amount)) return

    onCreateParticipation({
      contactId: contact.id,
      eventName: eventDraft.eventName.trim(),
      date: eventDraft.date || undefined,
      amountOwed: amount,
      currency: eventDraft.currency,
      recurrence: eventDraft.recurrence,
      notes: eventDraft.notes.trim() || undefined,
    })
    setEventDraft({ eventName: "", date: "", amountOwed: "", currency: "EUR", recurrence: "none", notes: "" })
    setShowEventForm(false)
  }

  function submitPayment(participationId: string) {
    const draft = paymentDrafts[participationId] ?? { amount: "", date: "", label: "", note: "" }
    const amount = Number(draft.amount)
    if (!Number.isFinite(amount) || amount <= 0) return

    onAddPayment(participationId, {
      amount,
      date: draft.date || undefined,
      label: draft.label.trim() || undefined,
      note: draft.note.trim() || undefined,
    })
    setPaymentDrafts((prev) => ({ ...prev, [participationId]: { amount: "", date: "", label: "", note: "" } }))
    setActivePaymentForm(null)
  }

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
        <Button size="sm" variant="outline" onClick={() => setShowEventForm((value) => !value)} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Add event
        </Button>
      </div>

      {showEventForm && (
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Event name</Label>
              <Input
                value={eventDraft.eventName}
                onChange={(event) => setEventDraft({ ...eventDraft, eventName: event.target.value })}
                className="mt-1.5"
                placeholder="Retreat Weekend"
              />
            </div>
            <div>
              <Label className="text-xs">Event date</Label>
              <Input
                type="date"
                value={eventDraft.date}
                onChange={(event) => setEventDraft({ ...eventDraft, date: event.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-xs">Amount owed</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={eventDraft.amountOwed}
                onChange={(event) => setEventDraft({ ...eventDraft, amountOwed: event.target.value })}
                className="mt-1.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Currency</Label>
                <Input
                  value={eventDraft.currency}
                  onChange={(event) => setEventDraft({ ...eventDraft, currency: event.target.value.toUpperCase() })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-xs">Repeats</Label>
                <select
                  value={eventDraft.recurrence}
                  onChange={(event) => setEventDraft({ ...eventDraft, recurrence: event.target.value as EventRecurrence })}
                  className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="none">No</option>
                  <option value="yearly">Yearly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={eventDraft.notes}
              onChange={(event) => setEventDraft({ ...eventDraft, notes: event.target.value })}
              className="mt-1.5 min-h-16"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowEventForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={submitEvent}>
              Add event
            </Button>
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
            const draft = paymentDrafts[participation.id] ?? { amount: "", date: "", label: "", note: "" }

            return (
              <Card key={participation.id} className="p-4 space-y-3">
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
                  </div>
                </div>

                <div className="rounded-md border border-border overflow-hidden text-sm">
                  <div className="grid grid-cols-[1fr_auto] gap-4 px-3 py-2 bg-secondary/50">
                    <span>Total</span>
                    <span className="font-medium tabular-nums">{formatMoney(balance.total, participation.currency)}</span>
                  </div>
                  {participation.payments.map((payment) => (
                    <div key={payment.id} className="grid grid-cols-[7rem_1fr_auto_auto] gap-3 px-3 py-2 border-t border-border items-center">
                      <span className="text-muted-foreground tabular-nums">{payment.date || "No date"}</span>
                      <span className="truncate">{payment.label || payment.note || "Payment"}</span>
                      <span className="tabular-nums text-emerald-700">-{formatMoney(payment.amount, participation.currency)}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => onDeletePayment(participation.id, payment.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="sr-only">Delete payment</span>
                      </Button>
                    </div>
                  ))}
                  <div className="grid grid-cols-[1fr_auto] gap-4 px-3 py-2 border-t border-border bg-background">
                    <span className="font-medium">Remaining</span>
                    <span className="font-semibold tabular-nums">{formatMoney(balance.remaining, participation.currency)}</span>
                  </div>
                </div>

                {activePaymentForm === participation.id ? (
                  <div className="rounded-md border border-border p-3 space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">Amount</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.amount}
                          onChange={(event) =>
                            setPaymentDrafts((prev) => ({
                              ...prev,
                              [participation.id]: { ...draft, amount: event.target.value },
                            }))
                          }
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Date</Label>
                        <Input
                          type="date"
                          value={draft.date}
                          onChange={(event) =>
                            setPaymentDrafts((prev) => ({
                              ...prev,
                              [participation.id]: { ...draft, date: event.target.value },
                            }))
                          }
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Label</Label>
                        <Input
                          value={draft.label}
                          onChange={(event) =>
                            setPaymentDrafts((prev) => ({
                              ...prev,
                              [participation.id]: { ...draft, label: event.target.value },
                            }))
                          }
                          className="mt-1.5"
                          placeholder="Down payment"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setActivePaymentForm(null)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={() => submitPayment(participation.id)}>
                        Save payment
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActivePaymentForm(participation.id)}
                    className="gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Add payment
                  </Button>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </section>
  )
}
