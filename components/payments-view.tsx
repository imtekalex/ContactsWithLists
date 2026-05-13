"use client"

import { useMemo, useState } from "react"
import { CalendarDays, Check, CreditCard, Pencil, Plus, Trash2, UserRound, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { Contact, EventOccurrence, EventParticipation, EventSeries } from "@/lib/contacts-data"
import {
  formatMoney,
  getContactName,
  getParticipationBalance,
  getParticipationLabel,
} from "@/lib/payments"
import type { CreatePaymentInput, UpdatePaymentInput } from "@/components/participation-section"
import { cn } from "@/lib/utils"

type Props = {
  contacts: Contact[]
  eventSeries: EventSeries[]
  eventOccurrences: EventOccurrence[]
  participations: EventParticipation[]
  onAddPayment: (participationId: string, payment: CreatePaymentInput) => void
  onUpdatePayment: (participationId: string, paymentId: string, payment: UpdatePaymentInput) => void
  onDeletePayment: (participationId: string, paymentId: string) => void
}

type PaymentDraft = { amount: string; date: string; label: string; note: string }
type ViewMode = "events" | "people"

type PaymentRow = {
  participation: EventParticipation
  contact: Contact | undefined
  balance: ReturnType<typeof getParticipationBalance>
  label: ReturnType<typeof getParticipationLabel>
}

type MoneySummary = Record<string, { due: number; credit: number; net: number; paid: number; total: number }>

function getTodayIso() {
  return new Date().toISOString().slice(0, 10)
}

function emptyPaymentDraft(): PaymentDraft {
  return { amount: "", date: getTodayIso(), label: "", note: "" }
}

function addToSummary(summary: MoneySummary, currency: string, values: Partial<MoneySummary[string]>) {
  const current = summary[currency] ?? { due: 0, credit: 0, net: 0, paid: 0, total: 0 }
  summary[currency] = {
    due: current.due + (values.due ?? 0),
    credit: current.credit + (values.credit ?? 0),
    net: current.net + (values.net ?? 0),
    paid: current.paid + (values.paid ?? 0),
    total: current.total + (values.total ?? 0),
  }
}

function formatSummary(summary: MoneySummary, key: keyof MoneySummary[string]) {
  const entries = Object.entries(summary)
  if (entries.length === 0) return formatMoney(0, "EUR")
  return entries.map(([currency, values]) => formatMoney(values[key], currency)).join(" / ")
}

function formatNetDue(summary: MoneySummary) {
  const entries = Object.entries(summary)
  if (entries.length === 0) return formatMoney(0, "EUR")
  return entries.map(([currency, values]) => formatMoney(Math.max(values.net, 0), currency)).join(" / ")
}

export function PaymentsView({
  contacts,
  eventSeries,
  eventOccurrences,
  participations,
  onAddPayment,
  onUpdatePayment,
  onDeletePayment,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("events")
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, PaymentDraft>>({})
  const [addingForParticipationId, setAddingForParticipationId] = useState<string | null>(null)
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)

  const rows = useMemo<PaymentRow[]>(
    () =>
      participations.map((participation) => {
        const contact = contacts.find((item) => item.id === participation.contactId)
        const balance = getParticipationBalance(participation)
        const label = getParticipationLabel(participation, eventOccurrences, eventSeries)
        return { participation, contact, balance, label }
      }),
    [contacts, eventOccurrences, eventSeries, participations],
  )

  const peopleGroups = useMemo(() => {
    const groups = new Map<string, { contact: Contact | undefined; rows: PaymentRow[]; summary: MoneySummary }>()

    rows.forEach((row) => {
      const key = row.participation.contactId
      const group = groups.get(key) ?? { contact: row.contact, rows: [], summary: {} }
      group.rows.push(row)
      groups.set(key, group)
    })

    return Array.from(groups.entries())
      .map(([contactId, group]) => {
        group.rows.forEach((row) => {
          addToSummary(group.summary, row.participation.currency, {
            due: Math.max(row.balance.remaining, 0),
            credit: Math.max(-row.balance.remaining, 0),
            net: row.balance.remaining,
            paid: row.balance.paid,
            total: row.balance.total,
          })
        })
        return { contactId, ...group }
      })
      .sort((a, b) => getContactName(a.contact).localeCompare(getContactName(b.contact)))
  }, [rows])

  const eventGroups = useMemo(() => {
    const groups = new Map<string, { occurrence: EventOccurrence | undefined; series: EventSeries | undefined; rows: PaymentRow[]; summary: MoneySummary }>()

    rows.forEach((row) => {
      const occurrence = eventOccurrences.find((item) => item.id === row.participation.occurrenceId)
      const series = occurrence ? eventSeries.find((item) => item.id === occurrence.seriesId) : undefined
      const key = row.participation.occurrenceId
      const group = groups.get(key) ?? { occurrence, series, rows: [], summary: {} }
      group.rows.push(row)
      addToSummary(group.summary, row.participation.currency, {
        due: Math.max(row.balance.remaining, 0),
        credit: Math.max(-row.balance.remaining, 0),
        net: row.balance.remaining,
        paid: row.balance.paid,
        total: row.balance.total,
      })
      groups.set(key, group)
    })

    return Array.from(groups.entries())
      .map(([occurrenceId, group]) => ({ occurrenceId, ...group }))
      .sort((a, b) => (a.occurrence?.date ?? "9999-99-99").localeCompare(b.occurrence?.date ?? "9999-99-99"))
  }, [eventOccurrences, eventSeries, rows])

  const overview = useMemo(() => {
    const gross: MoneySummary = {}
    const netByPerson: MoneySummary = {}

    rows.forEach((row) => {
      addToSummary(gross, row.participation.currency, {
        due: Math.max(row.balance.remaining, 0),
        credit: Math.max(-row.balance.remaining, 0),
        net: row.balance.remaining,
        paid: row.balance.paid,
        total: row.balance.total,
      })
    })

    peopleGroups.forEach((group) => {
      Object.entries(group.summary).forEach(([currency, summary]) => {
        addToSummary(netByPerson, currency, {
          due: Math.max(summary.net, 0),
          credit: summary.credit,
          net: Math.max(summary.net, 0),
        })
      })
    })

    return { gross, netByPerson }
  }, [peopleGroups, rows])

  function startAddingPayment(participationId: string) {
    setEditingPaymentId(null)
    setPaymentDrafts((prev) => ({ ...prev, [participationId]: prev[participationId] ?? emptyPaymentDraft() }))
    setAddingForParticipationId(participationId)
  }

  function startEditingPayment(paymentId: string, payment: EventParticipation["payments"][number]) {
    setAddingForParticipationId(null)
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
    setAddingForParticipationId(null)
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

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-8 py-6 border-b border-border flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Payments</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Event balances, individual payment history, and person-level credit offsets.
          </p>
        </div>
        <div className="inline-flex rounded-md border border-border p-0.5">
          <Button
            size="sm"
            variant={viewMode === "events" ? "secondary" : "ghost"}
            onClick={() => setViewMode("events")}
            className="h-8 gap-1.5"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Events
          </Button>
          <Button
            size="sm"
            variant={viewMode === "people" ? "secondary" : "ghost"}
            onClick={() => setViewMode("people")}
            className="h-8 gap-1.5"
          >
            <UserRound className="w-3.5 h-3.5" />
            People
          </Button>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Stat label="Net due after credits" value={formatSummary(overview.netByPerson, "net")} />
          <Stat label="Gross outstanding" value={formatSummary(overview.gross, "due")} />
          <Stat label="Available credit" value={formatSummary(overview.gross, "credit")} />
          <Stat label="Payments received" value={formatSummary(overview.gross, "paid")} />
        </div>

        {viewMode === "events" ? (
          <section className="space-y-4">
            {eventGroups.length === 0 ? (
              <EmptyPayments />
            ) : (
              eventGroups.map((group) => (
                <EventPaymentGroup
                  key={group.occurrenceId}
                  group={group}
                  paymentDrafts={paymentDrafts}
                  addingForParticipationId={addingForParticipationId}
                  editingPaymentId={editingPaymentId}
                  onStartAdd={startAddingPayment}
                  onStartEdit={startEditingPayment}
                  onDraftChange={setPaymentDrafts}
                  onSubmitAdd={submitPayment}
                  onSubmitEdit={submitPaymentEdit}
                  onCancelAdd={() => setAddingForParticipationId(null)}
                  onCancelEdit={() => setEditingPaymentId(null)}
                  onDeletePayment={onDeletePayment}
                />
              ))
            )}
          </section>
        ) : (
          <section className="space-y-4">
            {peopleGroups.length === 0 ? (
              <EmptyPayments />
            ) : (
              peopleGroups.map((group) => (
                <PersonPaymentGroup
                  key={group.contactId}
                  group={group}
                  paymentDrafts={paymentDrafts}
                  addingForParticipationId={addingForParticipationId}
                  editingPaymentId={editingPaymentId}
                  onStartAdd={startAddingPayment}
                  onStartEdit={startEditingPayment}
                  onDraftChange={setPaymentDrafts}
                  onSubmitAdd={submitPayment}
                  onSubmitEdit={submitPaymentEdit}
                  onCancelAdd={() => setAddingForParticipationId(null)}
                  onCancelEdit={() => setEditingPaymentId(null)}
                  onDeletePayment={onDeletePayment}
                />
              ))
            )}
          </section>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums mt-1">{value}</p>
    </Card>
  )
}

function EmptyPayments() {
  return (
    <Card className="p-8 text-center">
      <CreditCard className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">No payments here yet.</p>
    </Card>
  )
}

type GroupControls = {
  paymentDrafts: Record<string, PaymentDraft>
  addingForParticipationId: string | null
  editingPaymentId: string | null
  onStartAdd: (participationId: string) => void
  onStartEdit: (paymentId: string, payment: EventParticipation["payments"][number]) => void
  onDraftChange: React.Dispatch<React.SetStateAction<Record<string, PaymentDraft>>>
  onSubmitAdd: (participationId: string) => void
  onSubmitEdit: (participationId: string, paymentId: string) => void
  onCancelAdd: () => void
  onCancelEdit: () => void
  onDeletePayment: (participationId: string, paymentId: string) => void
}

function EventPaymentGroup({
  group,
  ...controls
}: {
  group: {
    occurrenceId: string
    occurrence: EventOccurrence | undefined
    series: EventSeries | undefined
    rows: PaymentRow[]
    summary: MoneySummary
  }
} & GroupControls) {
  return (
    <Card className="p-0 overflow-hidden">
      <GroupHeader
        icon={CalendarDays}
        title={group.occurrence?.name ?? "Unknown event"}
        subtitle={`${group.occurrence?.date ?? "No date"} · ${group.series?.name ?? "Standalone event"}`}
        summary={group.summary}
      />
      <div className="divide-y divide-border">
        {group.rows.map((row) => (
          <ParticipationPaymentBlock
            key={row.participation.id}
            row={row}
            title={getContactName(row.contact)}
            subtitle={row.label.eventName}
            {...controls}
          />
        ))}
      </div>
    </Card>
  )
}

function PersonPaymentGroup({
  group,
  ...controls
}: {
  group: {
    contactId: string
    contact: Contact | undefined
    rows: PaymentRow[]
    summary: MoneySummary
  }
} & GroupControls) {
  return (
    <Card className="p-0 overflow-hidden">
      <GroupHeader
        icon={UserRound}
        title={getContactName(group.contact)}
        subtitle={`${group.rows.length} participation${group.rows.length === 1 ? "" : "s"}`}
        summary={group.summary}
        showCreditOffset
      />
      <div className="divide-y divide-border">
        {group.rows.map((row) => (
          <ParticipationPaymentBlock
            key={row.participation.id}
            row={row}
            title={row.label.eventName}
            subtitle={row.label.date ?? "No date"}
            {...controls}
          />
        ))}
      </div>
    </Card>
  )
}

function GroupHeader({
  icon: Icon,
  title,
  subtitle,
  summary,
  showCreditOffset = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle: string
  summary: MoneySummary
  showCreditOffset?: boolean
}) {
  return (
    <div className="px-5 py-4 bg-secondary/40 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-md bg-background border border-border flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold truncate">{title}</h3>
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-5 text-sm xl:text-right">
        <Metric label={showCreditOffset ? "Net due" : "Open"} value={showCreditOffset ? formatNetDue(summary) : formatSummary(summary, "due")} />
        <Metric label="Credit" value={formatSummary(summary, "credit")} />
        <Metric label="Paid" value={formatSummary(summary, "paid")} />
      </div>
    </div>
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

function ParticipationPaymentBlock({
  row,
  title,
  subtitle,
  paymentDrafts,
  addingForParticipationId,
  editingPaymentId,
  onStartAdd,
  onStartEdit,
  onDraftChange,
  onSubmitAdd,
  onSubmitEdit,
  onCancelAdd,
  onCancelEdit,
  onDeletePayment,
}: {
  row: PaymentRow
  title: string
  subtitle: string
} & GroupControls) {
  const { participation, balance } = row
  const newPaymentDraft = paymentDrafts[participation.id] ?? emptyPaymentDraft()
  const paymentGridClass =
    "grid min-w-[52rem] grid-cols-[7rem_minmax(8rem,1fr)_minmax(10rem,1.2fr)_8rem_5rem] gap-3"

  return (
    <div className="px-5 py-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{title}</p>
            <Badge variant={balance.status === "paid" ? "secondary" : "outline"} className="capitalize">
              {balance.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <div className="grid grid-cols-3 gap-5 text-right text-sm">
          <Metric label="Total" value={formatMoney(balance.total, participation.currency)} />
          <Metric label="Paid" value={formatMoney(balance.paid, participation.currency)} />
          <Metric label={balance.remaining < 0 ? "Credit" : "Open"} value={formatMoney(Math.abs(balance.remaining), participation.currency)} />
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

        {participation.payments.length === 0 && addingForParticipationId !== participation.id && (
          <div className="px-3 py-4 border-t border-border text-sm text-muted-foreground">
            No individual payments recorded yet.
          </div>
        )}

        {participation.payments.map((payment) => {
          const editDraft = paymentDrafts[payment.id] ?? {
            amount: String(payment.amount),
            date: payment.date ?? getTodayIso(),
            label: payment.label ?? "",
            note: payment.note ?? "",
          }

          if (editingPaymentId === payment.id) {
            return (
              <PaymentEditRow
                key={payment.id}
                draft={editDraft}
                gridClass={paymentGridClass}
                onChange={(next) => onDraftChange((prev) => ({ ...prev, [payment.id]: next }))}
                onSubmit={() => onSubmitEdit(participation.id, payment.id)}
                onCancel={onCancelEdit}
              />
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
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground"
                  onClick={() => onStartEdit(payment.id, payment)}
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
              </div>
            </div>
          )
        })}

        {addingForParticipationId === participation.id ? (
          <PaymentEditRow
            draft={newPaymentDraft}
            gridClass={paymentGridClass}
            onChange={(next) => onDraftChange((prev) => ({ ...prev, [participation.id]: next }))}
            onSubmit={() => onSubmitAdd(participation.id)}
            onCancel={onCancelAdd}
          />
        ) : (
          <div className="border-t border-border px-3 py-2">
            <Button size="sm" variant="ghost" onClick={() => onStartAdd(participation.id)} className="h-8 gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Add payment
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function PaymentEditRow({
  draft,
  gridClass,
  onChange,
  onSubmit,
  onCancel,
}: {
  draft: PaymentDraft
  gridClass: string
  onChange: (draft: PaymentDraft) => void
  onSubmit: () => void
  onCancel: () => void
}) {
  return (
    <div className={cn(gridClass, "px-3 py-2 border-t border-border items-center")}>
      <Input
        type="date"
        value={draft.date}
        aria-label="Payment date"
        onChange={(event) => onChange({ ...draft, date: event.target.value })}
        className="h-8"
      />
      <Input
        value={draft.label}
        aria-label="Payment label"
        onChange={(event) => onChange({ ...draft, label: event.target.value })}
        className="h-8"
        placeholder="Payment"
      />
      <Input
        value={draft.note}
        aria-label="Payment note"
        onChange={(event) => onChange({ ...draft, note: event.target.value })}
        className="h-8"
        placeholder="Note"
      />
      <Input
        type="number"
        min="0"
        step="0.01"
        value={draft.amount}
        aria-label="Payment amount"
        onChange={(event) => onChange({ ...draft, amount: event.target.value })}
        className="h-8 text-right"
      />
      <div className="flex justify-end gap-1">
        <Button size="sm" className="h-8 w-8 p-0" onClick={onSubmit}>
          <Check className="w-4 h-4" />
          <span className="sr-only">Save payment</span>
        </Button>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onCancel}>
          <X className="w-4 h-4" />
          <span className="sr-only">Cancel payment</span>
        </Button>
      </div>
    </div>
  )
}
