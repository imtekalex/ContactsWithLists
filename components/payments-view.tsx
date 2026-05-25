'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Check, CreditCard, Pencil, Plus, Trash2, UserRound, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type {
  Contact,
  EventOccurrence,
  EventParticipation,
  EventSeries,
} from '@/lib/contacts-data';
import {
  formatMoney,
  getContactName,
  getParticipationBalance,
  getParticipationLabel,
} from '@/lib/payments';
import type { CreatePaymentInput, UpdatePaymentInput } from '@/components/participation-section';
import { cn } from '@/lib/utils';

type Props = {
  contacts: Contact[];
  eventSeries: EventSeries[];
  eventOccurrences: EventOccurrence[];
  participations: EventParticipation[];
  activeOccurrenceId?: string | null;
  onAddPayment: (participationId: string, payment: CreatePaymentInput) => void;
  onUpdatePayment: (
    participationId: string,
    paymentId: string,
    payment: UpdatePaymentInput
  ) => void;
  onDeletePayment: (participationId: string, paymentId: string) => void;
  onSelectContact: (contactId: string) => void;
  onSelectEvent: (occurrenceId: string) => void;
};

type PaymentDraft = { amount: string; date: string; label: string; note: string };
type ViewMode = 'events' | 'people';

type PaymentRow = {
  participation: EventParticipation;
  contact: Contact | undefined;
  balance: ReturnType<typeof getParticipationBalance>;
  label: ReturnType<typeof getParticipationLabel>;
};

type MoneySummary = Record<
  string,
  { due: number; credit: number; net: number; paid: number; total: number }
>;

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

function emptyPaymentDraft(): PaymentDraft {
  return { amount: '', date: getTodayIso(), label: '', note: '' };
}

function addToSummary(
  summary: MoneySummary,
  currency: string,
  values: Partial<MoneySummary[string]>
) {
  const current = summary[currency] ?? { due: 0, credit: 0, net: 0, paid: 0, total: 0 };
  summary[currency] = {
    due: current.due + (values.due ?? 0),
    credit: current.credit + (values.credit ?? 0),
    net: current.net + (values.net ?? 0),
    paid: current.paid + (values.paid ?? 0),
    total: current.total + (values.total ?? 0),
  };
}

function formatSummary(summary: MoneySummary, key: keyof MoneySummary[string]) {
  const entries = Object.entries(summary);
  if (entries.length === 0) return formatMoney(0, 'EUR');
  return entries.map(([currency, values]) => formatMoney(values[key], currency)).join(' / ');
}

function formatNetDue(summary: MoneySummary) {
  const entries = Object.entries(summary);
  if (entries.length === 0) return formatMoney(0, 'EUR');
  return entries
    .map(([currency, values]) => formatMoney(Math.max(values.net, 0), currency))
    .join(' / ');
}

function hasOpenBalance(summary: MoneySummary) {
  return Object.values(summary).some((value) => value.net > 0);
}

function compareRows(a: PaymentRow, b: PaymentRow) {
  const aSettled = a.balance.remaining <= 0;
  const bSettled = b.balance.remaining <= 0;
  if (aSettled !== bSettled) return aSettled ? 1 : -1;
  return (b.label.date ?? '0000-00-00').localeCompare(a.label.date ?? '0000-00-00');
}

const eventToneKeys = [
  'sky',
  'emerald',
  'amber',
  'violet',
  'rose',
  'cyan',
  'fuchsia',
  'lime',
  'indigo',
  'orange',
  'teal',
  'pink',
] as const;

type EventToneKey = (typeof eventToneKeys)[number];

const eventToneClasses: Record<
  EventToneKey,
  { headerBg: string; iconBg: string; rowHeaderBg: string; cardBg: string }
> = {
  sky: {
    headerBg: 'bg-sky-50/80',
    iconBg: 'bg-sky-100 border border-sky-200 text-sky-700',
    rowHeaderBg: 'bg-sky-100/70',
    cardBg: 'bg-sky-50/80 ring-1 ring-sky-100 border border-sky-100/70 rounded-2xl',
  },
  emerald: {
    headerBg: 'bg-emerald-50/80',
    iconBg: 'bg-emerald-100 border border-emerald-200 text-emerald-700',
    rowHeaderBg: 'bg-emerald-100/70',
    cardBg: 'bg-emerald-50/80 ring-1 ring-emerald-100 border border-emerald-100/70 rounded-2xl',
  },
  amber: {
    headerBg: 'bg-amber-50/80',
    iconBg: 'bg-amber-100 border border-amber-200 text-amber-700',
    rowHeaderBg: 'bg-amber-100/70',
    cardBg: 'bg-amber-50/80 ring-1 ring-amber-100 border border-amber-100/70 rounded-2xl',
  },
  violet: {
    headerBg: 'bg-violet-50/80',
    iconBg: 'bg-violet-100 border border-violet-200 text-violet-700',
    rowHeaderBg: 'bg-violet-100/70',
    cardBg: 'bg-violet-50/80 ring-1 ring-violet-100 border border-violet-100/70 rounded-2xl',
  },
  rose: {
    headerBg: 'bg-rose-50/80',
    iconBg: 'bg-rose-100 border border-rose-200 text-rose-700',
    rowHeaderBg: 'bg-rose-100/70',
    cardBg: 'bg-rose-50/80 ring-1 ring-rose-100 border border-rose-100/70 rounded-2xl',
  },
  cyan: {
    headerBg: 'bg-cyan-50/80',
    iconBg: 'bg-cyan-100 border border-cyan-200 text-cyan-700',
    rowHeaderBg: 'bg-cyan-100/70',
    cardBg: 'bg-cyan-50/80 ring-1 ring-cyan-100 border border-cyan-100/70 rounded-2xl',
  },
  fuchsia: {
    headerBg: 'bg-fuchsia-50/80',
    iconBg: 'bg-fuchsia-100 border border-fuchsia-200 text-fuchsia-700',
    rowHeaderBg: 'bg-fuchsia-100/70',
    cardBg: 'bg-fuchsia-50/80 ring-1 ring-fuchsia-100 border border-fuchsia-100/70 rounded-2xl',
  },
  lime: {
    headerBg: 'bg-lime-50/80',
    iconBg: 'bg-lime-100 border border-lime-200 text-lime-700',
    rowHeaderBg: 'bg-lime-100/70',
    cardBg: 'bg-lime-50/80 ring-1 ring-lime-100 border border-lime-100/70 rounded-2xl',
  },
  indigo: {
    headerBg: 'bg-indigo-50/80',
    iconBg: 'bg-indigo-100 border border-indigo-200 text-indigo-700',
    rowHeaderBg: 'bg-indigo-100/70',
    cardBg: 'bg-indigo-50/80 ring-1 ring-indigo-100 border border-indigo-100/70 rounded-2xl',
  },
  orange: {
    headerBg: 'bg-orange-50/80',
    iconBg: 'bg-orange-100 border border-orange-200 text-orange-700',
    rowHeaderBg: 'bg-orange-100/70',
    cardBg: 'bg-orange-50/80 ring-1 ring-orange-100 border border-orange-100/70 rounded-2xl',
  },
  teal: {
    headerBg: 'bg-teal-50/80',
    iconBg: 'bg-teal-100 border border-teal-200 text-teal-700',
    rowHeaderBg: 'bg-teal-100/70',
    cardBg: 'bg-teal-50/80 ring-1 ring-teal-100 border border-teal-100/70 rounded-2xl',
  },
  pink: {
    headerBg: 'bg-pink-50/80',
    iconBg: 'bg-pink-100 border border-pink-200 text-pink-700',
    rowHeaderBg: 'bg-pink-100/70',
    cardBg: 'bg-pink-50/80 ring-1 ring-pink-100 border border-pink-100/70 rounded-2xl',
  },
};

function getEventToneKey(occurrenceId: string): EventToneKey {
  let hash = 0;
  for (let i = 0; i < occurrenceId.length; i += 1) {
    hash = ((hash << 5) - hash + occurrenceId.charCodeAt(i)) >>> 0;
  }
  return eventToneKeys[hash % eventToneKeys.length];
}

export function PaymentsView({
  contacts,
  eventSeries,
  eventOccurrences,
  participations,
  activeOccurrenceId,
  onAddPayment,
  onUpdatePayment,
  onDeletePayment,
  onSelectContact,
  onSelectEvent,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('events');
  const groupNodes = useRef<Record<string, HTMLDivElement | null>>({});
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, PaymentDraft>>({});
  const [addingForParticipationId, setAddingForParticipationId] = useState<string | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);

  const rows = useMemo<PaymentRow[]>(
    () =>
      participations.map((participation) => {
        const contact = contacts.find((item) => item.id === participation.contactId);
        const balance = getParticipationBalance(participation);
        const label = getParticipationLabel(participation, eventOccurrences, eventSeries);
        return { participation, contact, balance, label };
      }),
    [contacts, eventOccurrences, eventSeries, participations]
  );

  const peopleGroups = useMemo(() => {
    const groups = new Map<
      string,
      { contact: Contact | undefined; rows: PaymentRow[]; summary: MoneySummary }
    >();

    rows.forEach((row) => {
      const key = row.participation.contactId;
      const group = groups.get(key) ?? { contact: row.contact, rows: [], summary: {} };
      group.rows.push(row);
      groups.set(key, group);
    });

    return Array.from(groups.entries())
      .map(([contactId, group]) => {
        group.rows.forEach((row) => {
          addToSummary(group.summary, row.participation.currency, {
            due: Math.max(row.balance.remaining, 0),
            credit: Math.max(-row.balance.remaining, 0),
            net: row.balance.remaining,
            paid: row.balance.paid,
            total: row.balance.total,
          });
        });
        group.rows.sort(compareRows);
        return { contactId, ...group };
      })
      .sort((a, b) => {
        const aOpen = hasOpenBalance(a.summary);
        const bOpen = hasOpenBalance(b.summary);
        if (aOpen !== bOpen) return aOpen ? -1 : 1;
        return getContactName(a.contact).localeCompare(getContactName(b.contact));
      });
  }, [rows]);

  const eventGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        occurrence: EventOccurrence | undefined;
        series: EventSeries | undefined;
        rows: PaymentRow[];
        summary: MoneySummary;
      }
    >();

    rows.forEach((row) => {
      const occurrence = eventOccurrences.find(
        (item) => item.id === row.participation.occurrenceId
      );
      const series = occurrence
        ? eventSeries.find((item) => item.id === occurrence.seriesId)
        : undefined;
      const key = row.participation.occurrenceId;
      const group = groups.get(key) ?? { occurrence, series, rows: [], summary: {} };
      group.rows.push(row);
      addToSummary(group.summary, row.participation.currency, {
        due: Math.max(row.balance.remaining, 0),
        credit: Math.max(-row.balance.remaining, 0),
        net: row.balance.remaining,
        paid: row.balance.paid,
        total: row.balance.total,
      });
      groups.set(key, group);
    });

    return Array.from(groups.entries())
      .map(([occurrenceId, group]) => ({ occurrenceId, ...group }))
      .map((group) => {
        group.rows.sort(compareRows);
        return group;
      })
      .sort((a, b) => {
        const aOpen = hasOpenBalance(a.summary);
        const bOpen = hasOpenBalance(b.summary);
        if (aOpen !== bOpen) return aOpen ? -1 : 1;
        return (b.occurrence?.date ?? '0000-00-00').localeCompare(
          a.occurrence?.date ?? '0000-00-00'
        );
      });
  }, [eventOccurrences, eventSeries, rows]);

  const overview = useMemo(() => {
    const gross: MoneySummary = {};
    const netByPerson: MoneySummary = {};

    rows.forEach((row) => {
      addToSummary(gross, row.participation.currency, {
        due: Math.max(row.balance.remaining, 0),
        credit: Math.max(-row.balance.remaining, 0),
        net: row.balance.remaining,
        paid: row.balance.paid,
        total: row.balance.total,
      });
    });

    peopleGroups.forEach((group) => {
      Object.entries(group.summary).forEach(([currency, summary]) => {
        addToSummary(netByPerson, currency, {
          due: Math.max(summary.net, 0),
          credit: summary.credit,
          net: Math.max(summary.net, 0),
        });
      });
    });

    return { gross, netByPerson };
  }, [peopleGroups, rows]);

  function startAddingPayment(participationId: string) {
    setEditingPaymentId(null);
    setPaymentDrafts((prev) => ({
      ...prev,
      [participationId]: prev[participationId] ?? emptyPaymentDraft(),
    }));
    setAddingForParticipationId(participationId);
  }

  function startEditingPayment(paymentId: string, payment: EventParticipation['payments'][number]) {
    setAddingForParticipationId(null);
    setEditingPaymentId(paymentId);
    setPaymentDrafts((prev) => ({
      ...prev,
      [paymentId]: {
        amount: String(payment.amount),
        date: payment.date ?? getTodayIso(),
        label: payment.label ?? '',
        note: payment.note ?? '',
      },
    }));
  }

  function submitPayment(participationId: string) {
    const draft = paymentDrafts[participationId] ?? emptyPaymentDraft();
    const amount = Number(draft.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;

    onAddPayment(participationId, {
      amount,
      date: draft.date || undefined,
      label: draft.label.trim() || undefined,
      note: draft.note.trim() || undefined,
    });
    setPaymentDrafts((prev) => ({ ...prev, [participationId]: emptyPaymentDraft() }));
    setAddingForParticipationId(null);
  }

  function submitPaymentEdit(participationId: string, paymentId: string) {
    const draft = paymentDrafts[paymentId] ?? emptyPaymentDraft();
    const amount = Number(draft.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;

    onUpdatePayment(participationId, paymentId, {
      amount,
      date: draft.date || undefined,
      label: draft.label.trim() || undefined,
      note: draft.note.trim() || undefined,
    });
    setEditingPaymentId(null);
  }

  useEffect(() => {
    if (!activeOccurrenceId) return;
    setViewMode('events');
    window.requestAnimationFrame(() => {
      groupNodes.current[activeOccurrenceId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  }, [activeOccurrenceId]);

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
            variant={viewMode === 'events' ? 'secondary' : 'ghost'}
            onClick={() => setViewMode('events')}
            className="h-8 gap-1.5"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Events
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'people' ? 'secondary' : 'ghost'}
            onClick={() => setViewMode('people')}
            className="h-8 gap-1.5"
          >
            <UserRound className="w-3.5 h-3.5" />
            People
          </Button>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Stat label="Net due after credits" value={formatSummary(overview.netByPerson, 'net')} />
          <Stat label="Gross outstanding" value={formatSummary(overview.gross, 'due')} />
          <Stat label="Available credit" value={formatSummary(overview.gross, 'credit')} />
          <Stat label="Payments received" value={formatSummary(overview.gross, 'paid')} />
        </div>

        {viewMode === 'events' ? (
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
                  onSelectContact={onSelectContact}
                  onSelectEvent={onSelectEvent}
                  activeOccurrenceId={activeOccurrenceId}
                  setGroupNode={(node) => {
                    groupNodes.current[group.occurrenceId] = node;
                  }}
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
                  onSelectContact={onSelectContact}
                  onSelectEvent={onSelectEvent}
                />
              ))
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums mt-1">{value}</p>
    </Card>
  );
}

function EmptyPayments() {
  return (
    <Card className="p-8 text-center">
      <CreditCard className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">No payments here yet.</p>
    </Card>
  );
}

type GroupControls = {
  paymentDrafts: Record<string, PaymentDraft>;
  addingForParticipationId: string | null;
  editingPaymentId: string | null;
  onStartAdd: (participationId: string) => void;
  onStartEdit: (paymentId: string, payment: EventParticipation['payments'][number]) => void;
  onDraftChange: React.Dispatch<React.SetStateAction<Record<string, PaymentDraft>>>;
  onSubmitAdd: (participationId: string) => void;
  onSubmitEdit: (participationId: string, paymentId: string) => void;
  onCancelAdd: () => void;
  onCancelEdit: () => void;
  onDeletePayment: (participationId: string, paymentId: string) => void;
  onSelectContact: (contactId: string) => void;
  onSelectEvent: (occurrenceId: string) => void;
};

function EventPaymentGroup({
  group,
  activeOccurrenceId,
  setGroupNode,
  ...controls
}: {
  group: {
    occurrenceId: string;
    occurrence: EventOccurrence | undefined;
    series: EventSeries | undefined;
    rows: PaymentRow[];
    summary: MoneySummary;
  };
  activeOccurrenceId?: string | null;
  setGroupNode: (node: HTMLDivElement | null) => void;
} & GroupControls) {
  return (
    <Card
      ref={setGroupNode}
      className={cn(
        'p-0 overflow-hidden transition-shadow',
        activeOccurrenceId === group.occurrenceId && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      <GroupHeader
        icon={CalendarDays}
        title={group.occurrence?.name ?? 'Unknown event'}
        subtitle={`${group.occurrence?.date ?? 'No date'} · ${group.series?.name ?? 'Standalone event'}`}
        summary={group.summary}
        variant="event"
        tone={getEventToneKey(group.occurrenceId)}
        onTitleClick={
          group.occurrence ? () => controls.onSelectEvent(group.occurrence!.id) : undefined
        }
      />
      <div className="divide-y divide-border">
        {group.rows.map((row) => (
          <ParticipationPaymentBlock
            key={row.participation.id}
            row={row}
            title={getContactName(row.contact)}
            subtitle={row.label.eventName}
            contactId={row.contact?.id}
            variant="event"
            tone={getEventToneKey(group.occurrenceId)}
            {...controls}
          />
        ))}
      </div>
    </Card>
  );
}

function PersonPaymentGroup({
  group,
  ...controls
}: {
  group: {
    contactId: string;
    contact: Contact | undefined;
    rows: PaymentRow[];
    summary: MoneySummary;
  };
} & GroupControls) {
  return (
    <Card className="p-0 overflow-hidden">
      <GroupHeader
        icon={UserRound}
        title={getContactName(group.contact)}
        subtitle={`${group.rows.length} participation${group.rows.length === 1 ? '' : 's'}`}
        summary={group.summary}
        showCreditOffset
        onTitleClick={group.contact ? () => controls.onSelectContact(group.contact!.id) : undefined}
      />
      <div className="divide-y divide-border">
        {group.rows.map((row) => (
          <ParticipationPaymentBlock
            key={row.participation.id}
            row={row}
            title={row.label.eventName}
            subtitle={row.label.date ?? 'No date'}
            contactId={undefined}
            {...controls}
          />
        ))}
      </div>
    </Card>
  );
}

function GroupHeader({
  icon: Icon,
  title,
  subtitle,
  summary,
  showCreditOffset = false,
  onTitleClick,
  variant: _variant,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  summary: MoneySummary;
  showCreditOffset?: boolean;
  onTitleClick?: () => void;
  variant?: 'event' | 'person';
  tone?: EventToneKey;
}) {
  const toneClasses = tone ? eventToneClasses[tone] : undefined;

  return (
    <div
      className={cn(
        'px-5 py-4 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4',
        toneClasses?.headerBg ?? 'bg-secondary/40'
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            'w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0',
            toneClasses?.iconBg ?? 'bg-background border border-border text-muted-foreground'
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          {onTitleClick ? (
            <button
              type="button"
              onClick={onTitleClick}
              className="font-semibold truncate hover:underline text-left"
            >
              {title}
            </button>
          ) : (
            <h3 className="font-semibold truncate">{title}</h3>
          )}
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-5 text-sm xl:text-right">
        <Metric
          label={showCreditOffset ? 'Net due' : 'Open'}
          value={showCreditOffset ? formatNetDue(summary) : formatSummary(summary, 'due')}
        />
        <Metric label="Credit" value={formatSummary(summary, 'credit')} />
        <Metric label="Paid" value={formatSummary(summary, 'paid')} />
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'due' | 'credit' }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'font-semibold tabular-nums mt-0.5',
          tone === 'due' && 'text-red-800',
          tone === 'credit' && 'text-emerald-700'
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ParticipationPaymentBlock({
  row,
  title,
  subtitle,
  contactId,
  variant: _variant,
  tone,
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
  onSelectContact,
}: {
  row: PaymentRow;
  title: string;
  subtitle: string;
  contactId: string | undefined;
  variant?: 'event' | 'person';
  tone?: EventToneKey;
} & GroupControls) {
  const { participation, balance } = row;
  const newPaymentDraft = paymentDrafts[participation.id] ?? emptyPaymentDraft();
  const paymentGridClass =
    'grid min-w-[52rem] grid-cols-[7rem_minmax(8rem,1fr)_minmax(10rem,1.2fr)_8rem_5rem] gap-3';
  const toneClasses = tone ? eventToneClasses[tone] : undefined;
  const containerClass = cn('px-5 py-4 space-y-3', toneClasses?.cardBg);

  return (
    <div className={containerClass}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {contactId ? (
              <button
                type="button"
                onClick={() => onSelectContact(contactId)}
                className="font-medium truncate hover:underline text-left"
              >
                {title}
              </button>
            ) : (
              <p className="font-medium truncate">{title}</p>
            )}
            <Badge
              variant={balance.status === 'paid' ? 'secondary' : 'outline'}
              className={cn(
                'capitalize',
                balance.remaining > 0 && 'border-red-200 bg-red-50 text-red-800',
                balance.remaining < 0 && 'border-emerald-300 bg-emerald-50 text-emerald-800'
              )}
            >
              {balance.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <div className="grid grid-cols-3 gap-5 text-right text-sm">
          <Metric label="Total" value={formatMoney(balance.total, participation.currency)} />
          <Metric label="Paid" value={formatMoney(balance.paid, participation.currency)} />
          <Metric
            label={balance.remaining < 0 ? 'Credit' : 'Open'}
            value={formatMoney(Math.abs(balance.remaining), participation.currency)}
            tone={balance.remaining > 0 ? 'due' : balance.remaining < 0 ? 'credit' : undefined}
          />
        </div>
      </div>

      <div className="rounded-md border border-border overflow-x-auto text-sm">
        <div
          className={cn(
            paymentGridClass,
            'px-3 py-2 text-xs font-medium text-muted-foreground',
            toneClasses?.rowHeaderBg ?? 'bg-secondary/50'
          )}
        >
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
            label: payment.label ?? '',
            note: payment.note ?? '',
          };

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
            );
          }

          return (
            <div
              key={payment.id}
              className={cn(paymentGridClass, 'px-3 py-2 border-t border-border items-center')}
            >
              <span className="text-muted-foreground tabular-nums">
                {payment.date || 'No date'}
              </span>
              <span className="truncate">{payment.label || 'Payment'}</span>
              <span className={payment.note ? 'truncate' : 'truncate text-muted-foreground'}>
                {payment.note || 'No note'}
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
          );
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
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onStartAdd(participation.id)}
              className="h-8 gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add payment
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function PaymentEditRow({
  draft,
  gridClass,
  onChange,
  onSubmit,
  onCancel,
}: {
  draft: PaymentDraft;
  gridClass: string;
  onChange: (draft: PaymentDraft) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className={cn(gridClass, 'px-3 py-2 border-t border-border items-center')}>
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
  );
}
