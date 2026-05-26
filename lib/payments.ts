import type {
  Contact,
  CurrencyCode,
  EventOccurrence,
  EventParticipation,
  EventSeries,
} from './contacts-data';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overpaid';

export type ParticipationBalance = {
  total: number;
  paid: number;
  remaining: number;
  status: PaymentStatus;
};

export type EventBalance = ParticipationBalance & {
  participantCount: number;
};

export function getPaymentStatusLabel(status: PaymentStatus) {
  if (status === 'paid') return 'settled';
  return status;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getParticipationBalance(participation: EventParticipation): ParticipationBalance {
  const total = roundMoney(participation.amountOwed);
  const paid = roundMoney(participation.payments.reduce((sum, payment) => sum + payment.amount, 0));
  const remaining = roundMoney(total - paid);

  let status: PaymentStatus = 'partial';
  if (paid <= 0 && total > 0) status = 'unpaid';
  else if (remaining === 0) status = 'paid';
  else if (remaining < 0) status = 'overpaid';

  return { total, paid, remaining, status };
}

export function getEventBalance(participations: EventParticipation[]): EventBalance {
  return participations.reduce<EventBalance>(
    (summary, participation) => {
      const balance = getParticipationBalance(participation);
      return {
        total: roundMoney(summary.total + balance.total),
        paid: roundMoney(summary.paid + balance.paid),
        remaining: roundMoney(summary.remaining + balance.remaining),
        participantCount: summary.participantCount + 1,
        status: getAggregateStatus(
          roundMoney(summary.remaining + balance.remaining),
          roundMoney(summary.total + balance.total)
        ),
      };
    },
    { total: 0, paid: 0, remaining: 0, participantCount: 0, status: 'paid' }
  );
}

function getAggregateStatus(remaining: number, total: number): PaymentStatus {
  if (total <= 0 && remaining <= 0) return 'paid';
  if (remaining === total) return 'unpaid';
  if (remaining === 0) return 'paid';
  if (remaining < 0) return 'overpaid';
  return 'partial';
}

export function getParticipationLabel(
  participation: EventParticipation,
  occurrences: EventOccurrence[],
  series: EventSeries[]
) {
  const occurrence = occurrences.find((item) => item.id === participation.occurrenceId);
  const eventSeries = occurrence
    ? series.find((item) => item.id === occurrence.seriesId)
    : undefined;
  return {
    eventName: occurrence?.name ?? 'Unknown event',
    seriesName: eventSeries?.name ?? occurrence?.name ?? 'Unknown event',
    date: occurrence?.date,
  };
}

export function getContactName(contact: Contact | undefined) {
  if (!contact) return 'Unknown contact';
  return (
    [
      contact.namePrefix,
      contact.firstName,
      contact.middleName,
      contact.lastName,
      contact.nameSuffix,
    ]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    contact.nickname ||
    'Unnamed contact'
  );
}

export function formatMoney(amount: number, currency: CurrencyCode) {
  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
