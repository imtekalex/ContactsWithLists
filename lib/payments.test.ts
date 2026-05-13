import { describe, expect, it } from "vitest"

import type { EventParticipation } from "./contacts-data"
import { getEventBalance, getParticipationBalance } from "./payments"

const baseParticipation: EventParticipation = {
  id: "p1",
  contactId: "c1",
  occurrenceId: "e1",
  status: "registered",
  amountOwed: 480,
  currency: "EUR",
  payments: [],
  createdAt: 0,
  updatedAt: 0,
}

describe("payment calculations", () => {
  it("calculates paid and remaining amounts from payment history", () => {
    const balance = getParticipationBalance({
      ...baseParticipation,
      payments: [
        { id: "pay1", amount: 100, label: "Down payment", createdAt: 0 },
        { id: "pay2", amount: 100, label: "Follow up", createdAt: 0 },
      ],
    })

    expect(balance).toEqual({
      total: 480,
      paid: 200,
      remaining: 280,
      status: "partial",
    })
  })

  it("marks a fully settled participation as paid", () => {
    expect(
      getParticipationBalance({
        ...baseParticipation,
        amountOwed: 65,
        payments: [{ id: "pay1", amount: 65, createdAt: 0 }],
      }).status,
    ).toBe("paid")
  })

  it("treats overpayment as credit", () => {
    expect(
      getParticipationBalance({
        ...baseParticipation,
        amountOwed: 100,
        payments: [{ id: "pay1", amount: 125, createdAt: 0 }],
      }),
    ).toMatchObject({
      paid: 125,
      remaining: -25,
      status: "overpaid",
    })
  })

  it("summarizes multiple participations for an event overview", () => {
    const summary = getEventBalance([
      {
        ...baseParticipation,
        id: "p1",
        amountOwed: 480,
        payments: [{ id: "pay1", amount: 200, createdAt: 0 }],
      },
      {
        ...baseParticipation,
        id: "p2",
        amountOwed: 120,
        payments: [],
      },
    ])

    expect(summary).toMatchObject({
      total: 600,
      paid: 200,
      remaining: 400,
      participantCount: 2,
      status: "partial",
    })
  })
})
