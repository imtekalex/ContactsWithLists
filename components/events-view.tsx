"use client"

import { CalendarDays, Plus } from "lucide-react"
import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type {
  Contact,
  CurrencyCode,
  EventOccurrence,
  EventParticipation,
  EventRecurrence,
  EventSeries,
} from "@/lib/contacts-data"
import { formatMoney, getContactName, getEventBalance, getParticipationBalance } from "@/lib/payments"

export type CreateEventOccurrenceInput = {
  name: string
  date?: string
  recurrence: EventRecurrence
  currency: CurrencyCode
  defaultAmountOwed?: number
}

type Props = {
  contacts: Contact[]
  eventSeries: EventSeries[]
  eventOccurrences: EventOccurrence[]
  participations: EventParticipation[]
  onCreateEvent: (input: CreateEventOccurrenceInput) => void
}

export function EventsView({
  contacts,
  eventSeries,
  eventOccurrences,
  participations,
  onCreateEvent,
}: Props) {
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState({
    name: "",
    date: "",
    recurrence: "none" as EventRecurrence,
    currency: "EUR",
    defaultAmountOwed: "",
  })

  const totalRemaining = useMemo(
    () =>
      participations.reduce(
        (sum, participation) => sum + getParticipationBalance(participation).remaining,
        0,
      ),
    [participations],
  )

  function submit() {
    if (!draft.name.trim()) return
    const amount = draft.defaultAmountOwed ? Number(draft.defaultAmountOwed) : undefined
    onCreateEvent({
      name: draft.name.trim(),
      date: draft.date || undefined,
      recurrence: draft.recurrence,
      currency: draft.currency,
      defaultAmountOwed: Number.isFinite(amount) ? amount : undefined,
    })
    setDraft({ name: "", date: "", recurrence: "none", currency: "EUR", defaultAmountOwed: "" })
    setShowForm(false)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-8 py-6 border-b border-border flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Events</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Recurring event series, concrete dates, participants, and event balances.
          </p>
        </div>
        <Button onClick={() => setShowForm((value) => !value)} className="gap-2">
          <Plus className="w-4 h-4" />
          New event
        </Button>
      </div>

      <div className="px-8 py-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Stat label="Series" value={eventSeries.length} />
          <Stat label="Occurrences" value={eventOccurrences.length} />
          <Stat label="Participations" value={participations.length} />
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="text-2xl font-semibold tabular-nums mt-1">{formatMoney(totalRemaining, "EUR")}</p>
          </Card>
        </div>

        {showForm && (
          <Card className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="md:col-span-2">
                <Label className="text-xs">Event name</Label>
                <Input
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  className="mt-1.5"
                  placeholder="Retreat Weekend 2027"
                />
              </div>
              <div>
                <Label className="text-xs">Date</Label>
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
              <div>
                <Label className="text-xs">Default amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={draft.defaultAmountOwed}
                  onChange={(event) => setDraft({ ...draft, defaultAmountOwed: event.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={submit}>
                Create event
              </Button>
            </div>
          </Card>
        )}

        <div className="space-y-3">
          {eventOccurrences.map((occurrence) => {
            const series = eventSeries.find((item) => item.id === occurrence.seriesId)
            const eventParticipations = participations.filter((item) => item.occurrenceId === occurrence.id)
            const balance = getEventBalance(eventParticipations)

            return (
              <Card key={occurrence.id} className="p-5">
                <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-muted-foreground" />
                      <h3 className="font-semibold">{occurrence.name}</h3>
                      {series && <Badge variant="outline">{series.recurrence}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {occurrence.date || "No date"} · {series?.name ?? "Standalone event"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 xl:gap-6 text-left md:text-right text-sm">
                    <Metric label="People" value={String(balance.participantCount)} />
                    <Metric label="Total" value={formatMoney(balance.total, series?.defaultCurrency ?? "EUR")} />
                    <Metric label="Paid" value={formatMoney(balance.paid, series?.defaultCurrency ?? "EUR")} />
                    <Metric label="Open" value={formatMoney(balance.remaining, series?.defaultCurrency ?? "EUR")} />
                  </div>
                </div>

                {eventParticipations.length > 0 && (
                  <div className="mt-4 rounded-md border border-border divide-y divide-border">
                    {eventParticipations.map((participation) => {
                      const contact = contacts.find((item) => item.id === participation.contactId)
                      const participationBalance = getParticipationBalance(participation)
                      return (
                        <div key={participation.id} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 md:gap-4 px-3 py-2 text-sm">
                          <span>{getContactName(contact)}</span>
                          <span className="text-muted-foreground">{participation.status}</span>
                          <span className="font-medium tabular-nums">
                            {formatMoney(participationBalance.remaining, participation.currency)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums mt-1">{value}</p>
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold tabular-nums mt-0.5">{value}</p>
    </div>
  )
}
