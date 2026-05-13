"use client"

import { CreditCard } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import type { Contact, EventOccurrence, EventParticipation, EventSeries } from "@/lib/contacts-data"
import {
  formatMoney,
  getContactName,
  getParticipationBalance,
  getParticipationLabel,
} from "@/lib/payments"

type Props = {
  contacts: Contact[]
  eventSeries: EventSeries[]
  eventOccurrences: EventOccurrence[]
  participations: EventParticipation[]
}

export function PaymentsView({ contacts, eventSeries, eventOccurrences, participations }: Props) {
  const rows = participations.map((participation) => {
    const contact = contacts.find((item) => item.id === participation.contactId)
    const balance = getParticipationBalance(participation)
    const label = getParticipationLabel(participation, eventOccurrences, eventSeries)

    return { participation, contact, balance, label }
  })
  const openRows = rows.filter((row) => row.balance.remaining > 0)
  const settledRows = rows.filter((row) => row.balance.remaining <= 0)
  const totalOpen = openRows.reduce((sum, row) => sum + row.balance.remaining, 0)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-8 py-6 border-b border-border">
        <h2 className="text-2xl font-semibold tracking-tight">Payments</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Outstanding balances and settled event participation across all contacts.
        </p>
      </div>
      <div className="px-8 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="text-2xl font-semibold tabular-nums mt-1">{formatMoney(totalOpen, "EUR")}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Open items</p>
            <p className="text-2xl font-semibold tabular-nums mt-1">{openRows.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Settled items</p>
            <p className="text-2xl font-semibold tabular-nums mt-1">{settledRows.length}</p>
          </Card>
        </div>

        <PaymentTable title="Outstanding" rows={openRows} />
        <PaymentTable title="Settled / overpaid" rows={settledRows} />
      </div>
    </div>
  )
}

type PaymentRow = {
  participation: EventParticipation
  contact: Contact | undefined
  balance: ReturnType<typeof getParticipationBalance>
  label: ReturnType<typeof getParticipationLabel>
}

function PaymentTable({ title, rows }: { title: string; rows: PaymentRow[] }) {
  return (
    <section>
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      {rows.length === 0 ? (
        <Card className="p-8 text-center">
          <CreditCard className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No payments here yet.</p>
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {rows.map(({ participation, contact, balance, label }) => (
            <div key={participation.id} className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr_auto_auto] gap-3 md:gap-4 px-4 py-3 md:items-center text-sm">
              <div>
                <p className="font-medium">{getContactName(contact)}</p>
                <p className="text-xs text-muted-foreground">{label.eventName}</p>
              </div>
              <div className="text-muted-foreground">
                <p>{label.date || "No date"}</p>
                <p className="text-xs">{participation.payments.length} payment{participation.payments.length === 1 ? "" : "s"}</p>
              </div>
              <Badge variant={balance.status === "paid" ? "secondary" : "outline"} className="capitalize">
                {balance.status}
              </Badge>
              <div className="text-right tabular-nums">
                <p className="font-semibold">{formatMoney(balance.remaining, participation.currency)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatMoney(balance.paid, participation.currency)} paid
                </p>
              </div>
            </div>
          ))}
        </Card>
      )}
    </section>
  )
}
