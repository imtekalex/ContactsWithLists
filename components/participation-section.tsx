'use client';

import { useMemo, useRef, useState } from 'react';
import { CalendarDays, Check, CreditCard, Pencil, Plus, Trash2, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  Contact,
  CurrencyCode,
  EventOccurrence,
  EventParticipation,
  EventSeries,
} from '@/lib/contacts-data';
import { formatMoney, getParticipationBalance, getParticipationLabel } from '@/lib/payments';
import { cn } from '@/lib/utils';

export type CreateParticipationInput = {
  contactId: string;
  occurrenceId: string;
  eventName?: string;
  amountOwed: number;
  currency: CurrencyCode;
  notes?: string;
  initialPayment?: CreatePaymentInput;
};

export type CreatePaymentInput = {
  amount: number;
  date?: string;
  label?: string;
  note?: string;
};

export type UpdatePaymentInput = CreatePaymentInput;

type PaymentDraft = { amount: string; date: string; label: string; note: string };

type Props = {
  contact: Contact;
  eventSeries: EventSeries[];
  eventOccurrences: EventOccurrence[];
  participations: EventParticipation[];
  canEdit: boolean;
  onCreateParticipation: (input: CreateParticipationInput) => void;
  onAddPayment: (participationId: string, payment: CreatePaymentInput) => void;
  onUpdatePayment: (
    participationId: string,
    paymentId: string,
    payment: UpdatePaymentInput
  ) => void;
  onDeleteParticipation: (participationId: string) => void;
  onDeletePayment: (participationId: string, paymentId: string) => void;
  onSelectEventPayments: (occurrenceId: string) => void;
};

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
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
  onSelectEventPayments,
}: Props) {
  const contactParticipations = useMemo(
    () =>
      participations
        .filter((participation) => participation.contactId === contact.id)
        .sort((a, b) => {
          const aBalance = getParticipationBalance(a);
          const bBalance = getParticipationBalance(b);
          const aSettled = aBalance.remaining <= 0;
          const bSettled = bBalance.remaining <= 0;
          if (aSettled !== bSettled) return aSettled ? 1 : -1;

          const aDate =
            getParticipationLabel(a, eventOccurrences, eventSeries).date ?? '0000-00-00';
          const bDate =
            getParticipationLabel(b, eventOccurrences, eventSeries).date ?? '0000-00-00';
          return bDate.localeCompare(aDate);
        }),
    [contact.id, eventOccurrences, eventSeries, participations]
  );
  const balanceSummary = useMemo(() => {
    return contactParticipations.reduce<
      Record<string, { total: number; paid: number; remaining: number }>
    >((summary, participation) => {
      const balance = getParticipationBalance(participation);
      const current = summary[participation.currency] ?? { total: 0, paid: 0, remaining: 0 };
      summary[participation.currency] = {
        total: current.total + balance.total,
        paid: current.paid + balance.paid,
        remaining: current.remaining + balance.remaining,
      };
      return summary;
    }, {});
  }, [contactParticipations]);
  const eventOptions = useMemo(
    () =>
      eventOccurrences
        .map((occurrence) => {
          const series = eventSeries.find((item) => item.id === occurrence.seriesId);
          return {
            id: occurrence.id,
            label: `${occurrence.name}${occurrence.date ? ` (${occurrence.date})` : ''}`,
            occurrence,
            series,
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label)),
    [eventOccurrences, eventSeries]
  );

  const eventAccentClasses = useMemo(
    () =>
      contactParticipations.map((_, index) => {
        const palette = [
          { border: 'border-blue-400/70', dot: 'bg-blue-500' },
          { border: 'border-emerald-400/70', dot: 'bg-emerald-500' },
          { border: 'border-amber-400/70', dot: 'bg-amber-500' },
          { border: 'border-violet-400/70', dot: 'bg-violet-500' },
          { border: 'border-rose-400/70', dot: 'bg-rose-500' },
        ];
        return palette[index % palette.length];
      }),
    [contactParticipations]
  );

  const participationNodes = useRef<Record<string, HTMLDivElement | null>>({});
  const highlightTimer = useRef<number | null>(null);
  const [highlightedParticipationId, setHighlightedParticipationId] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [showParticipationForm, setShowParticipationForm] = useState(false);
  const [participationDraft, setParticipationDraft] = useState({
    occurrenceId: '',
    amountOwed: '',
    selectedPriceOptionId: '',
    notes: '',
    downPaymentAmount: '',
    downPaymentDate: getTodayIso(),
    downPaymentLabel: 'Down payment',
    downPaymentNote: '',
  });
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, PaymentDraft>>({});
  const [activePaymentForm, setActivePaymentForm] = useState<string | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);

  function emptyPaymentDraft(): PaymentDraft {
    return { amount: '', date: getTodayIso(), label: '', note: '' };
  }

  function resetParticipationDraft() {
    setParticipationDraft({
      occurrenceId: '',
      amountOwed: '',
      selectedPriceOptionId: '',
      notes: '',
      downPaymentAmount: '',
      downPaymentDate: getTodayIso(),
      downPaymentLabel: 'Down payment',
      downPaymentNote: '',
    });
    setFormMessage(null);
  }

  function scrollToParticipation(participationId: string) {
    participationNodes.current[participationId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
    setHighlightedParticipationId(participationId);
    if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => setHighlightedParticipationId(null), 1800);
  }

  function submitParticipation() {
    const selectedEvent = eventOptions.find((item) => item.id === participationDraft.occurrenceId);
    if (!selectedEvent) {
      setFormMessage('Choose an event before adding participation.');
      return;
    }

    const existingParticipation = contactParticipations.find(
      (participation) => participation.occurrenceId === selectedEvent.id
    );
    if (existingParticipation) {
      setFormMessage(`${selectedEvent.occurrence.name} is already assigned to this contact.`);
      scrollToParticipation(existingParticipation.id);
      return;
    }

    const amount = Number(participationDraft.amountOwed);
    if (!Number.isFinite(amount) || amount < 0) {
      setFormMessage('Enter a valid amount owed.');
      return;
    }

    const downPaymentAmount = Number(participationDraft.downPaymentAmount);
    const initialPayment =
      Number.isFinite(downPaymentAmount) && downPaymentAmount > 0
        ? {
            amount: downPaymentAmount,
            date: participationDraft.downPaymentDate || getTodayIso(),
            label: participationDraft.downPaymentLabel.trim() || 'Down payment',
            note: participationDraft.downPaymentNote.trim() || undefined,
          }
        : undefined;

    onCreateParticipation({
      contactId: contact.id,
      occurrenceId: selectedEvent.id,
      eventName: selectedEvent.occurrence.name,
      amountOwed: amount,
      currency:
        selectedPriceOption?.currency ??
        selectedEvent.series?.priceOptions?.[0]?.currency ??
        selectedEvent.series?.defaultCurrency ??
        'EUR',
      notes: participationDraft.notes.trim() || undefined,
      initialPayment,
    });
    resetParticipationDraft();
    setShowParticipationForm(false);
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
    setActivePaymentForm(null);
  }

  function startAddingPayment(participationId: string) {
    setEditingPaymentId(null);
    setPaymentDrafts((prev) => ({
      ...prev,
      [participationId]: prev[participationId] ?? emptyPaymentDraft(),
    }));
    setActivePaymentForm(participationId);
  }

  function startEditingPayment(paymentId: string, payment: EventParticipation['payments'][number]) {
    setActivePaymentForm(null);
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

  function deleteParticipation(participation: EventParticipation) {
    const balance = getParticipationBalance(participation);
    if (balance.remaining > 0) return;
    onDeleteParticipation(participation.id);
  }

  const selectedEventOption = eventOptions.find(
    (item) => item.id === participationDraft.occurrenceId
  );
  const selectedPriceOption = selectedEventOption?.series?.priceOptions?.find(
    (price) => price.id === participationDraft.selectedPriceOptionId
  );
  const summaryEntries = Object.entries(balanceSummary);
  const paymentGridClass =
    'grid min-w-[46rem] grid-cols-[7rem_minmax(8rem,1fr)_minmax(10rem,1.2fr)_8rem_5rem] gap-3';
  const outstandingLabel =
    summaryEntries.length > 0
      ? summaryEntries
          .map(([currency, summary]) => formatMoney(summary.remaining, currency))
          .join(' / ')
      : '0';

  return (
    <section className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-t border-border pt-5">
        <div>
          <h3 className="text-sm font-semibold">Participation & payments</h3>
          <p className="text-xs text-muted-foreground">
            {contactParticipations.length} participation
            {contactParticipations.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-start gap-4">
          <div className="text-right">
            <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Outstanding
            </span>
            <span
              className={cn(
                'block text-sm font-semibold tabular-nums',
                summaryEntries.some(([, summary]) => summary.remaining > 0) && 'text-red-800',
                summaryEntries.every(([, summary]) => summary.remaining <= 0) &&
                  summaryEntries.some(([, summary]) => summary.remaining < 0) &&
                  'text-emerald-700'
              )}
            >
              {outstandingLabel}
            </span>
          </div>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              disabled={eventOptions.length === 0}
              onClick={() => {
                setShowParticipationForm((value) => !value);
                setFormMessage(null);
              }}
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add participation
            </Button>
          )}
        </div>
      </div>

      {canEdit && showParticipationForm && (
        <div className="space-y-3 rounded-lg bg-slate-100/70 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Event
              </Label>
              <select
                value={participationDraft.occurrenceId}
                onChange={(event) => {
                  const option = eventOptions.find((item) => item.id === event.target.value);
                  setParticipationDraft({
                    ...participationDraft,
                    occurrenceId: event.target.value,
                    amountOwed:
                      option?.series?.priceOptions?.[0]?.amount !== undefined
                        ? String(option.series.priceOptions[0].amount)
                        : option?.series?.defaultAmountOwed !== undefined
                          ? String(option.series.defaultAmountOwed)
                          : participationDraft.amountOwed,
                  });
                  setFormMessage(null);
                }}
                className="mt-0.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
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
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Amount owed
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={participationDraft.amountOwed}
                onChange={(event) =>
                  setParticipationDraft({
                    ...participationDraft,
                    amountOwed: event.target.value,
                    selectedPriceOptionId: '',
                  })
                }
                className="mt-0.5"
              />
              {selectedEventOption?.series?.priceOptions?.length ? (
                <div className="mt-3">
                  <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Selected fee rate
                  </Label>
                  <Select
                    value={participationDraft.selectedPriceOptionId || 'custom'}
                    onValueChange={(value) => {
                      const selectedPrice = selectedEventOption?.series?.priceOptions?.find(
                        (price) => price.id === value
                      );
                      setParticipationDraft({
                        ...participationDraft,
                        selectedPriceOptionId: value === 'custom' ? 'custom' : value,
                        amountOwed: selectedPrice
                          ? String(selectedPrice.amount)
                          : participationDraft.amountOwed,
                      });
                    }}
                  >
                    <SelectTrigger className="mt-0.5 w-full">
                      <SelectValue placeholder="Choose fee rate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom amount</SelectItem>
                      {selectedEventOption.series.priceOptions.map((price) => (
                        <SelectItem key={price.id} value={price.id}>
                          {price.label} · {formatMoney(price.amount, price.currency)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
          </div>
          {selectedEventOption?.series?.description && (
            <p className="text-xs text-muted-foreground">
              {selectedEventOption.series.description}
            </p>
          )}
          <div className="rounded-md bg-background/80 p-3 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Optional down payment</p>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Amount
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={participationDraft.downPaymentAmount}
                  onChange={(event) =>
                    setParticipationDraft({
                      ...participationDraft,
                      downPaymentAmount: event.target.value,
                    })
                  }
                  className="mt-0.5"
                />
              </div>
              <div>
                <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Date
                </Label>
                <Input
                  type="date"
                  value={participationDraft.downPaymentDate}
                  onChange={(event) =>
                    setParticipationDraft({
                      ...participationDraft,
                      downPaymentDate: event.target.value,
                    })
                  }
                  className="mt-0.5"
                />
              </div>
              <div>
                <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Label
                </Label>
                <Input
                  value={participationDraft.downPaymentLabel}
                  onChange={(event) =>
                    setParticipationDraft({
                      ...participationDraft,
                      downPaymentLabel: event.target.value,
                    })
                  }
                  className="mt-0.5"
                />
              </div>
              <div>
                <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Note
                </Label>
                <Input
                  value={participationDraft.downPaymentNote}
                  onChange={(event) =>
                    setParticipationDraft({
                      ...participationDraft,
                      downPaymentNote: event.target.value,
                    })
                  }
                  className="mt-0.5"
                />
              </div>
            </div>
          </div>
          <div>
            <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Participation notes
            </Label>
            <Textarea
              value={participationDraft.notes}
              onChange={(event) =>
                setParticipationDraft({ ...participationDraft, notes: event.target.value })
              }
              className="mt-0.5 min-h-16"
            />
          </div>
          {formMessage && <p className="text-sm text-destructive">{formMessage}</p>}
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                resetParticipationDraft();
                setShowParticipationForm(false);
              }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={submitParticipation}>
              Add participation
            </Button>
          </div>
        </div>
      )}

      {contactParticipations.length > 0 && (
        <div className="rounded-lg bg-slate-100/70 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total outstanding</p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {summaryEntries.map(([currency, summary]) => (
                  <span
                    key={currency}
                    className={cn(
                      'text-xl font-semibold tabular-nums',
                      summary.remaining > 0 && 'text-red-800',
                      summary.remaining < 0 && 'text-emerald-700'
                    )}
                  >
                    {formatMoney(summary.remaining, currency)}
                  </span>
                ))}
              </div>
            </div>
            <div className="hidden md:grid grid-cols-2 gap-6 text-right text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Total owed</p>
                <p className="font-medium tabular-nums">
                  {summaryEntries
                    .map(([currency, summary]) => formatMoney(summary.total, currency))
                    .join(' / ')}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="font-medium tabular-nums">
                  {summaryEntries
                    .map(([currency, summary]) => formatMoney(summary.paid, currency))
                    .join(' / ')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {contactParticipations.length === 0 ? (
        <div className="p-5 text-center">
          <CalendarDays className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No event participation yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contactParticipations.map((participation, index) => {
            const balance = getParticipationBalance(participation);
            const label = getParticipationLabel(participation, eventOccurrences, eventSeries);
            const newPaymentDraft = paymentDrafts[participation.id] ?? emptyPaymentDraft();

            return (
              <div
                key={participation.id}
                ref={(node) => {
                  participationNodes.current[participation.id] = node;
                }}
              >
                <div
                  className={cn(
                    'space-y-3 rounded-lg bg-background/70 p-4 border-l-4 transition-shadow',
                    eventAccentClasses[index]?.border,
                    highlightedParticipationId === participation.id &&
                      'ring-2 ring-primary ring-offset-2'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn('h-2.5 w-2.5 rounded-full', eventAccentClasses[index]?.dot)}
                        />
                        <button
                          type="button"
                          onClick={() => onSelectEventPayments(participation.occurrenceId)}
                          className="font-semibold truncate hover:underline text-left"
                        >
                          {label.eventName}
                        </button>
                        <Badge
                          variant={balance.status === 'paid' ? 'secondary' : 'outline'}
                          className={cn(
                            'capitalize',
                            balance.remaining > 0 && 'border-red-200 bg-red-50 text-red-800',
                            balance.remaining < 0 &&
                              'border-emerald-300 bg-emerald-50 text-emerald-800'
                          )}
                        >
                          {balance.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {label.date || 'No date'} · {label.seriesName} · {participation.status}
                      </p>
                    </div>
                    <div className="text-right text-sm tabular-nums">
                      <p>
                        <span className="text-muted-foreground">Owes </span>
                        <span
                          className={cn(
                            balance.remaining > 0 && 'font-semibold text-red-800',
                            balance.remaining === 0 && 'text-muted-foreground',
                            balance.remaining < 0 && 'font-semibold text-emerald-700'
                          )}
                        >
                          {formatMoney(balance.remaining, participation.currency)}
                        </span>
                      </p>
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={balance.remaining > 0}
                          title={
                            balance.remaining > 0
                              ? 'Settle this participation before deleting it.'
                              : 'Delete participation'
                          }
                          onClick={() => deleteParticipation(participation)}
                          className="mt-2 h-7 px-2 text-muted-foreground hover:text-destructive disabled:hover:text-muted-foreground"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="sr-only">Delete participation</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-md bg-card text-sm">
                    <div className="overflow-x-auto">
                      <div
                        className={cn(
                          paymentGridClass,
                          'px-3 py-2 bg-secondary/50 text-xs font-medium text-muted-foreground'
                        )}
                      >
                        <span>Date</span>
                        <span>Label</span>
                        <span>Note</span>
                        <span className="text-right">Amount</span>
                        <span />
                      </div>
                      <div
                        className={cn(
                          paymentGridClass,
                          'px-3 py-2 border-t border-border items-center'
                        )}
                      >
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
                          label: payment.label ?? '',
                          note: payment.note ?? '',
                        };

                        if (editingPaymentId === payment.id && canEdit) {
                          return (
                            <div
                              key={payment.id}
                              className={cn(
                                paymentGridClass,
                                'px-3 py-2 border-t border-border items-center'
                              )}
                            >
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
                          );
                        }

                        return (
                          <div
                            key={payment.id}
                            className={cn(
                              paymentGridClass,
                              'px-3 py-2 border-t border-border items-center'
                            )}
                          >
                            <span className="text-muted-foreground tabular-nums">
                              {payment.date || 'No date'}
                            </span>
                            <span className="truncate">{payment.label || 'Payment'}</span>
                            <span
                              className={
                                payment.note ? 'truncate' : 'truncate text-muted-foreground'
                              }
                            >
                              {payment.note || 'No note'}
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
                        );
                      })}

                      {canEdit && activePaymentForm === participation.id && (
                        <div
                          className={cn(
                            paymentGridClass,
                            'px-3 py-2 border-t border-border items-center'
                          )}
                        >
                          <Input
                            type="date"
                            value={newPaymentDraft.date}
                            aria-label="New payment date"
                            onChange={(event) =>
                              setPaymentDrafts((prev) => ({
                                ...prev,
                                [participation.id]: {
                                  ...newPaymentDraft,
                                  date: event.target.value,
                                },
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
                                [participation.id]: {
                                  ...newPaymentDraft,
                                  label: event.target.value,
                                },
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
                                [participation.id]: {
                                  ...newPaymentDraft,
                                  note: event.target.value,
                                },
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
                                [participation.id]: {
                                  ...newPaymentDraft,
                                  amount: event.target.value,
                                },
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
                        <div
                          className={cn(
                            paymentGridClass,
                            'px-3 py-2 border-t border-border items-center'
                          )}
                        >
                          <span />
                          <span />
                          <span />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startAddingPayment(participation.id)}
                            className="h-8 justify-self-end gap-1.5 px-2"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Add payment
                          </Button>
                          <span />
                        </div>
                      )}

                      <div
                        className={cn(
                          paymentGridClass,
                          'px-3 py-2 border-t border-border bg-background items-center'
                        )}
                      >
                        <span className="font-medium">Remaining</span>
                        <span />
                        <span />
                        <span
                          className={cn(
                            'font-semibold tabular-nums text-right',
                            balance.remaining > 0 && 'text-red-800',
                            balance.remaining < 0 && 'text-emerald-700'
                          )}
                        >
                          {formatMoney(balance.remaining, participation.currency)}
                        </span>
                        <span />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
