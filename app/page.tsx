"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Users,
  Trash2,
  BarChart3,
  Settings as SettingsIcon,
  Search,
  Star,
  Plus,
  RotateCcw,
  Activity,
  Download,
  Upload,
  ListIcon,
  Printer,
  Mail,
  ListPlus,
  X,
  CheckSquare,
  CalendarDays,
  CreditCard,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import {
  matchesGlobalSearch,
  resolveListMembers,
  type Contact,
  type ContactList,
  type CustomField,
  type Group,
  type GroupColor,
  type ActivityEntry,
  type EventOccurrence,
  type EventParticipation,
  type EventRecurrence,
  type EventSeries,
  type PaymentEntry,
} from "@/lib/contacts-data"
import {
  createDefaultContactsState,
  loadContactsState,
  saveContactsCollection,
  type PrintPreferences,
} from "@/lib/contacts-store"
import { NewContactDialog } from "@/components/new-contact-dialog"
import { ContactDetail } from "@/components/contact-detail"
import { ListsView } from "@/components/lists-view"
import { PrintDialog } from "@/components/print-dialog"
import { AddToListDialog } from "@/components/add-to-list-dialog"
import { CustomFieldsManager } from "@/components/custom-fields-manager"
import { GroupsManager } from "@/components/groups-manager"
import {
  ParticipationSection,
  type CreateParticipationInput,
  type CreatePaymentInput,
} from "@/components/participation-section"
import { EventsView, type CreateEventOccurrenceInput } from "@/components/events-view"
import { PaymentsView } from "@/components/payments-view"

type View = "contacts" | "lists" | "events" | "payments" | "trash" | "analytics" | "settings"

const groupColorClasses: Record<GroupColor, { dot: string; bg: string; text: string; ring: string }> = {
  blue: { dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-200" },
  green: { dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200" },
  purple: { dot: "bg-violet-500", bg: "bg-violet-50", text: "text-violet-700", ring: "ring-violet-200" },
  amber: { dot: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200" },
  rose: { dot: "bg-rose-500", bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-200" },
  cyan: { dot: "bg-cyan-500", bg: "bg-cyan-50", text: "text-cyan-700", ring: "ring-cyan-200" },
  slate: { dot: "bg-slate-500", bg: "bg-slate-100", text: "text-slate-700", ring: "ring-slate-200" },
}

const defaultContactsState = createDefaultContactsState()

export default function Home() {
  const [view, setView] = useState<View>("contacts")
  const [contacts, setContacts] = useState<Contact[]>([])
  const [deleted, setDeleted] = useState<Contact[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [lists, setLists] = useState<ContactList[]>([])
  const [eventSeries, setEventSeries] = useState<EventSeries[]>([])
  const [eventOccurrences, setEventOccurrences] = useState<EventOccurrence[]>([])
  const [participations, setParticipations] = useState<EventParticipation[]>([])
  const [printPreferences, setPrintPreferences] = useState<PrintPreferences>(defaultContactsState.printPreferences)
  const [storageReady, setStorageReady] = useState(false)

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const pendingSaveCount = useRef(0)
  const saveStatusTimer = useRef<number | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [starredOnly, setStarredOnly] = useState(false)
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [newDialogOpen, setNewDialogOpen] = useState(false)

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Print dialog
  const [printOpen, setPrintOpen] = useState(false)
  const [printContacts, setPrintContacts] = useState<Contact[]>([])
  const [printTitle, setPrintTitle] = useState<string>("Contacts")

  // Add-to-list dialog
  const [addToListOpen, setAddToListOpen] = useState(false)

  // Toast-style banner for bulk action confirmations
  const [banner, setBanner] = useState<string | null>(null)
  function showBanner(msg: string) {
    setBanner(msg)
    setTimeout(() => setBanner((b) => (b === msg ? null : b)), 3000)
  }

  useEffect(() => {
    let cancelled = false

    loadContactsState()
      .then((stored) => {
        if (cancelled) return
        setContacts(stored.contacts)
        setDeleted(stored.deleted)
        setGroups(stored.groups)
        setActivity(stored.activity)
        setCustomFields(stored.customFields)
        setLists(stored.lists)
        setEventSeries(stored.eventSeries)
        setEventOccurrences(stored.eventOccurrences)
        setParticipations(stored.participations)
        setPrintPreferences(stored.printPreferences)
        setSelectedId(stored.contacts[0]?.id ?? null)
      })
      .catch((error) => {
        console.error(error)
        if (!cancelled) {
          showBanner("Could not load data file; using starter data")
          setContacts(defaultContactsState.contacts)
          setDeleted(defaultContactsState.deleted)
          setGroups(defaultContactsState.groups)
          setActivity(defaultContactsState.activity)
          setCustomFields(defaultContactsState.customFields)
          setLists(defaultContactsState.lists)
          setEventSeries(defaultContactsState.eventSeries)
          setEventOccurrences(defaultContactsState.eventOccurrences)
          setParticipations(defaultContactsState.participations)
          setSelectedId(defaultContactsState.contacts[0]?.id ?? null)
        }
      })
      .finally(() => {
        if (!cancelled) setStorageReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  function trackSave(promise: Promise<void>) {
    if (saveStatusTimer.current) {
      window.clearTimeout(saveStatusTimer.current)
      saveStatusTimer.current = null
    }

    pendingSaveCount.current += 1
    setSaveStatus("saving")

    promise.finally(() => {
      pendingSaveCount.current -= 1
      if (pendingSaveCount.current <= 0) {
        pendingSaveCount.current = 0
        setSaveStatus("saved")
        saveStatusTimer.current = window.setTimeout(() => {
          setSaveStatus("idle")
        }, 2400)
      }
    })
  }

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (pendingSaveCount.current > 0) {
        event.preventDefault()
        // Some browsers require returnValue to be set.
        event.returnValue = ""
      }
    }

    window.addEventListener("beforeunload", beforeUnload)
    return () => {
      window.removeEventListener("beforeunload", beforeUnload)
      if (saveStatusTimer.current) {
        window.clearTimeout(saveStatusTimer.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!storageReady) return

    const timeoutId = window.setTimeout(() => {
      trackSave(
        saveContactsCollection("contacts", contacts).catch((error) => {
          console.error(error)
          showBanner("Could not save contacts")
        }),
      )
    }, 400)

    return () => window.clearTimeout(timeoutId)
  }, [contacts, storageReady])

  useEffect(() => {
    if (!storageReady) return

    const timeoutId = window.setTimeout(() => {
      trackSave(
        saveContactsCollection("deleted", deleted).catch((error) => {
          console.error(error)
          showBanner("Could not save deleted contacts")
        }),
      )
    }, 400)

    return () => window.clearTimeout(timeoutId)
  }, [deleted, storageReady])

  useEffect(() => {
    if (!storageReady) return

    const timeoutId = window.setTimeout(() => {
      trackSave(
        saveContactsCollection("groups", groups).catch((error) => {
          console.error(error)
          showBanner("Could not save groups")
        }),
      )
    }, 400)

    return () => window.clearTimeout(timeoutId)
  }, [groups, storageReady])

  useEffect(() => {
    if (!storageReady) return

    const timeoutId = window.setTimeout(() => {
      trackSave(
        saveContactsCollection("activity", activity).catch((error) => {
          console.error(error)
          showBanner("Could not save activity")
        }),
      )
    }, 400)

    return () => window.clearTimeout(timeoutId)
  }, [activity, storageReady])

  useEffect(() => {
    if (!storageReady) return

    const timeoutId = window.setTimeout(() => {
      trackSave(
        saveContactsCollection("customFields", customFields).catch((error) => {
          console.error(error)
          showBanner("Could not save custom fields")
        }),
      )
    }, 400)

    return () => window.clearTimeout(timeoutId)
  }, [customFields, storageReady])

  useEffect(() => {
    if (!storageReady) return

    const timeoutId = window.setTimeout(() => {
      trackSave(
        saveContactsCollection("lists", lists).catch((error) => {
          console.error(error)
          showBanner("Could not save lists")
        }),
      )
    }, 400)

    return () => window.clearTimeout(timeoutId)
  }, [lists, storageReady])

  useEffect(() => {
    if (!storageReady) return

    const timeoutId = window.setTimeout(() => {
      trackSave(
        saveContactsCollection("printPreferences", printPreferences).catch((error) => {
          console.error(error)
          showBanner("Could not save print settings")
        }),
      )
    }, 400)

    return () => window.clearTimeout(timeoutId)
  }, [printPreferences, storageReady])

  useEffect(() => {
    if (!storageReady) return

    const timeoutId = window.setTimeout(() => {
      trackSave(
        saveContactsCollection("eventSeries", eventSeries).catch((error) => {
          console.error(error)
          showBanner("Could not save event series")
        }),
      )
    }, 400)

    return () => window.clearTimeout(timeoutId)
  }, [eventSeries, storageReady])

  useEffect(() => {
    if (!storageReady) return

    const timeoutId = window.setTimeout(() => {
      trackSave(
        saveContactsCollection("eventOccurrences", eventOccurrences).catch((error) => {
          console.error(error)
          showBanner("Could not save events")
        }),
      )
    }, 400)

    return () => window.clearTimeout(timeoutId)
  }, [eventOccurrences, storageReady])

  useEffect(() => {
    if (!storageReady) return

    const timeoutId = window.setTimeout(() => {
      trackSave(
        saveContactsCollection("participations", participations).catch((error) => {
          console.error(error)
          showBanner("Could not save participation")
        }),
      )
    }, 400)

    return () => window.clearTimeout(timeoutId)
  }, [participations, storageReady])

  const filteredContacts = useMemo(() => {
    let list = contacts
    if (starredOnly) list = list.filter((c) => c.starred)
    if (activeGroupId) list = list.filter((c) => c.groupIds.includes(activeGroupId))
    if (search.trim()) {
      list = list.filter((c) => matchesGlobalSearch(c, search, customFields))
    }
    return list
  }, [contacts, search, starredOnly, activeGroupId, customFields])

  const selected = contacts.find((c) => c.id === selectedId) ?? null

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const g of groups) counts[g.id] = 0
    for (const c of contacts) for (const gid of c.groupIds) counts[gid] = (counts[gid] ?? 0) + 1
    return counts
  }, [contacts, groups])

  const selectedContacts = useMemo(
    () => contacts.filter((c) => selectedIds.has(c.id)),
    [contacts, selectedIds],
  )

  if (!storageReady) {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="w-10 h-10 text-primary" />
          <p className="text-sm text-muted-foreground">Loading contacts...</p>
        </div>
      </div>
    )
  }

  function logActivity(entry: Omit<ActivityEntry, "id" | "timestamp">) {
    setActivity((prev) => [
      { ...entry, id: `a${Date.now()}`, timestamp: Date.now() },
      ...prev,
    ])
  }

  function getTodayIso(timestamp = Date.now()) {
    return new Date(timestamp).toISOString().slice(0, 10)
  }

  function handleCreate(contact: Omit<Contact, "id" | "createdAt" | "updatedAt">) {
    const now = Date.now()
    const newContact: Contact = {
      ...contact,
      id: `c${now}`,
      createdAt: now,
      updatedAt: now,
    }
    setContacts((prev) => [newContact, ...prev])
    setSelectedId(newContact.id)
    logActivity({
      action: "create",
      entityType: "Contact",
      entityName: `${newContact.firstName} ${newContact.lastName}`,
      description: `Created contact${newContact.company ? ` at ${newContact.company}` : ""}`,
    })
  }

  function handleUpdate(updated: Contact) {
    const now = Date.now()
    const updatedContact = { ...updated, updatedAt: now }
    setContacts((prev) => prev.map((c) => (c.id === updated.id ? updatedContact : c)))
    logActivity({
      action: "update",
      entityType: "Contact",
      entityName: `${updated.firstName} ${updated.lastName}`,
      description: "Updated contact details",
    })
  }

  function handleDelete(id: string) {
    const target = contacts.find((c) => c.id === id)
    if (!target) return
    setContacts((prev) => prev.filter((c) => c.id !== id))
    setDeleted((prev) => [{ ...target, updatedAt: Date.now() }, ...prev])
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    if (selectedId === id) setSelectedId(null)
    logActivity({
      action: "delete",
      entityType: "Contact",
      entityName: `${target.firstName} ${target.lastName}`,
      description: "Moved to trash",
    })
  }

  function handleToggleStar(id: string) {
    const now = Date.now()
    setContacts((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, starred: !c.starred, updatedAt: now }
          : c,
      ),
    )
  }

  function handleRestore(id: string) {
    const target = deleted.find((c) => c.id === id)
    if (!target) return
    const now = Date.now()
    setDeleted((prev) => prev.filter((c) => c.id !== id))
    setContacts((prev) => [{ ...target, updatedAt: now }, ...prev])
    logActivity({
      action: "restore",
      entityType: "Contact",
      entityName: `${target.firstName} ${target.lastName}`,
      description: "Restored from trash",
    })
  }

  function handlePurge(id: string) {
    setDeleted((prev) => prev.filter((c) => c.id !== id))
  }

  // ----- Multi-select helpers ---------------------------------------------

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllVisible() {
    setSelectedIds(new Set(filteredContacts.map((c) => c.id)))
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  // ----- Bulk actions ------------------------------------------------------

  function openPrintFor(items: Contact[], title: string) {
    setPrintContacts(items)
    setPrintTitle(title)
    setPrintOpen(true)
  }

  function copyEmailsFor(items: Contact[]) {
    const withEmail = items.filter((c) => c.email)
    const skipped = items.length - withEmail.length
    const text = withEmail
      .map((c) => `${c.firstName} ${c.lastName} <${c.email}>`)
      .join(", ")
    if (typeof navigator !== "undefined" && navigator.clipboard && text) {
      navigator.clipboard.writeText(text)
    }
    showBanner(
      `Copied ${withEmail.length} email${withEmail.length === 1 ? "" : "s"}` +
        (skipped > 0 ? ` · skipped ${skipped} without email` : ""),
    )
  }

  function bulkDelete() {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    const targets = contacts.filter((c) => ids.includes(c.id))
    setContacts((prev) => prev.filter((c) => !selectedIds.has(c.id)))
    setDeleted((prev) => [
      ...targets.map((t) => ({ ...t, updatedAt: Date.now() })),
      ...prev,
    ])
    setSelectedIds(new Set())
    if (selectedId && selectedIds.has(selectedId)) setSelectedId(null)
    logActivity({
      action: "delete",
      entityType: "Contact",
      entityName: `${targets.length} contacts`,
      description: "Bulk move to trash",
    })
    showBanner(`Moved ${targets.length} contact${targets.length === 1 ? "" : "s"} to trash`)
  }

  function addSelectedToList(listId: string) {
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId || l.type !== "manual") return l
        const merged = new Set([...(l.contactIds ?? []), ...selectedIds])
        return { ...l, contactIds: Array.from(merged), updatedAt: Date.now() }
      }),
    )
    const list = lists.find((l) => l.id === listId)
    showBanner(`Added ${selectedIds.size} to ${list?.name ?? "list"}`)
    setAddToListOpen(false)
  }

  function createListFromSelection(name: string) {
    const newList: ContactList = {
      id: `l${Date.now()}`,
      name,
      type: "manual",
      contactIds: Array.from(selectedIds),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setLists((prev) => [newList, ...prev])
    showBanner(`Created &ldquo;${name}&rdquo; with ${selectedIds.size} contacts`)
    setAddToListOpen(false)
  }

  // ----- Lists CRUD --------------------------------------------------------

  function handleCreateList(input: Omit<ContactList, "id" | "createdAt" | "updatedAt">) {
    const newList: ContactList = {
      ...input,
      id: `l${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setLists((prev) => [newList, ...prev])
  }

  function handleUpdateList(updated: ContactList) {
    setLists((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
  }

  function handleDeleteList(id: string) {
    setLists((prev) => prev.filter((l) => l.id !== id))
  }

  // ----- Custom field CRUD -------------------------------------------------

  function handleCreateField(field: CustomField) {
    setCustomFields((prev) => [...prev, field])
  }
  function handleUpdateField(field: CustomField) {
    setCustomFields((prev) => prev.map((f) => (f.id === field.id ? field : f)))
  }
  function handleDeleteField(id: string) {
    setCustomFields((prev) => prev.filter((f) => f.id !== id))
  }

  // ----- Group CRUD --------------------------------------------------------

  function handleCreateGroup(input: Omit<Group, "id">) {
    const newGroup: Group = { ...input, id: `g${Date.now()}` }
    setGroups((prev) => [...prev, newGroup])
    logActivity({
      action: "create",
      entityType: "Group",
      entityName: newGroup.name,
      description: "Created group",
    })
  }

  function handleUpdateGroup(updated: Group) {
    setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)))
    logActivity({
      action: "update",
      entityType: "Group",
      entityName: updated.name,
      description: "Updated group",
    })
  }

  function handleDeleteGroup(id: string) {
    const target = groups.find((g) => g.id === id)
    if (!target) return
    setGroups((prev) => prev.filter((g) => g.id !== id))
    // Strip the group id from every contact
    const now = Date.now()
    setContacts((prev) =>
      prev.map((c) =>
        c.groupIds.includes(id)
          ? { ...c, groupIds: c.groupIds.filter((gid) => gid !== id), updatedAt: now }
          : c,
      ),
    )
    // Strip the group id from any group-scoped custom fields
    setCustomFields((prev) =>
      prev.map((f) =>
        f.groupIds.includes(id)
          ? { ...f, groupIds: f.groupIds.filter((gid) => gid !== id) }
          : f,
      ),
    )
    // Strip the group id from any dynamic list filters
    setLists((prev) =>
      prev.map((l) => {
        if (l.type !== "dynamic" || !l.filter) return l
        const f = l.filter
        const next: ContactList["filter"] = { ...f }
        if (f.groupId === id) delete next.groupId
        if (f.groupIds && f.groupIds.includes(id)) {
          next.groupIds = f.groupIds.filter((gid) => gid !== id)
          if (next.groupIds.length === 0) delete next.groupIds
        }
        return { ...l, filter: next, updatedAt: Date.now() }
      }),
    )
    if (activeGroupId === id) setActiveGroupId(null)
    logActivity({
      action: "delete",
      entityType: "Group",
      entityName: target.name,
      description: "Deleted group",
    })
  }

  function handleSetContactGroups(contactId: string, groupIds: string[]) {
    const now = Date.now()
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contactId
          ? { ...c, groupIds, updatedAt: now }
          : c,
      ),
    )
  }

  function ensureEventOccurrence(input: {
    name: string
    date?: string
    recurrence: EventRecurrence
    currency: string
    defaultAmountOwed?: number
  }) {
    const now = Date.now()
    const seriesName = input.name.trim()
    const occurrenceName =
      input.date && input.recurrence !== "none" && !seriesName.match(/\b\d{4}\b/)
        ? `${seriesName} ${input.date.slice(0, 4)}`
        : seriesName
    const existingSeries = eventSeries.find((series) => series.name.toLowerCase() === seriesName.toLowerCase())
    const seriesId = existingSeries?.id ?? `es${now}`

    if (!existingSeries) {
      const nextSeries: EventSeries = {
        id: seriesId,
        name: seriesName,
        recurrence: input.recurrence,
        defaultCurrency: input.currency,
        defaultAmountOwed: input.defaultAmountOwed,
        createdAt: now,
        updatedAt: now,
      }
      setEventSeries((prev) => [...prev, nextSeries])
    }

    const existingOccurrence = eventOccurrences.find(
      (occurrence) =>
        occurrence.name.toLowerCase() === occurrenceName.toLowerCase() &&
        (occurrence.date ?? "") === (input.date ?? ""),
    )
    if (existingOccurrence) return existingOccurrence.id

    const occurrenceId = `eo${now}`
    const nextOccurrence: EventOccurrence = {
      id: occurrenceId,
      seriesId,
      name: occurrenceName,
      date: input.date,
      createdAt: now,
      updatedAt: now,
    }
    setEventOccurrences((prev) => [...prev, nextOccurrence])
    return occurrenceId
  }

  function handleCreateEventOccurrence(input: CreateEventOccurrenceInput) {
    ensureEventOccurrence(input)
    showBanner(`Created ${input.name}`)
  }

  function handleCreateParticipation(input: CreateParticipationInput) {
    const now = Date.now()
    const occurrenceId = ensureEventOccurrence({
      name: input.eventName,
      date: input.date,
      recurrence: input.recurrence,
      currency: input.currency,
      defaultAmountOwed: input.amountOwed,
    })
    const participation: EventParticipation = {
      id: `ep${now}`,
      contactId: input.contactId,
      occurrenceId,
      status: "registered",
      amountOwed: input.amountOwed,
      currency: input.currency,
      notes: input.notes,
      payments: [],
      createdAt: now,
      updatedAt: now,
    }
    setParticipations((prev) => [participation, ...prev])
    showBanner(`Added ${input.eventName}`)
  }

  function handleAddPayment(participationId: string, input: CreatePaymentInput) {
    const now = Date.now()
    const payment: PaymentEntry = {
      id: `pay${now}`,
      amount: input.amount,
      date: input.date,
      label: input.label,
      note: input.note,
      createdAt: now,
    }
    setParticipations((prev) =>
      prev.map((participation) =>
        participation.id === participationId
          ? {
              ...participation,
              payments: [...participation.payments, payment],
              updatedAt: now,
            }
          : participation,
      ),
    )
  }

  function handleDeletePayment(participationId: string, paymentId: string) {
    const now = Date.now()
    setParticipations((prev) =>
      prev.map((participation) =>
        participation.id === participationId
          ? {
              ...participation,
              payments: participation.payments.filter((payment) => payment.id !== paymentId),
              updatedAt: now,
            }
          : participation,
      ),
    )
  }

  const selectionMode = selectedIds.size > 0

  return (
    <div className="h-screen flex overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <header className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Users className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-none">Local Studio</h1>
              <p className="text-xs text-muted-foreground mt-1">Contact Manager</p>
            </div>
          </div>
        </header>

        <nav className="px-3 py-4 space-y-1">
          <NavItem icon={Users} label="Contacts" badge={contacts.length} active={view === "contacts"} onClick={() => setView("contacts")} />
          <NavItem icon={ListIcon} label="Lists" badge={lists.length} active={view === "lists"} onClick={() => setView("lists")} />
          <NavItem icon={CalendarDays} label="Events" badge={eventOccurrences.length} active={view === "events"} onClick={() => setView("events")} />
          <NavItem icon={CreditCard} label="Payments" badge={participations.length} active={view === "payments"} onClick={() => setView("payments")} />
          <NavItem icon={Trash2} label="Trash" badge={deleted.length} active={view === "trash"} onClick={() => setView("trash")} />
          <NavItem icon={BarChart3} label="Analytics" active={view === "analytics"} onClick={() => setView("analytics")} />
          <NavItem icon={SettingsIcon} label="Settings" active={view === "settings"} onClick={() => setView("settings")} />
        </nav>

        {view === "contacts" && (
          <div className="px-3 pb-4 flex-1 overflow-y-auto">
            <div className="px-2 mt-2 mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Groups</span>
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setActiveGroupId(null)}
                className={cn(
                  "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors",
                  activeGroupId === null ? "bg-secondary text-secondary-foreground" : "hover:bg-secondary/60 text-foreground",
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                  All Contacts
                </span>
                <span className="text-xs text-muted-foreground">{contacts.length}</span>
              </button>
              {groups.map((g) => {
                const c = groupColorClasses[g.color]
                return (
                  <button
                    key={g.id}
                    onClick={() => setActiveGroupId(activeGroupId === g.id ? null : g.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors",
                      activeGroupId === g.id
                        ? "bg-secondary text-secondary-foreground"
                        : "hover:bg-secondary/60 text-foreground",
                    )}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className={cn("w-2 h-2 rounded-full flex-shrink-0", c.dot)} />
                      <span className="truncate">{g.name}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{groupCounts[g.id] ?? 0}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-auto p-3 border-t border-border">
          <Button onClick={() => setNewDialogOpen(true)} className="w-full justify-start gap-2" size="sm">
            <Plus className="w-4 h-4" />
            New Contact
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex overflow-hidden relative">
        {banner && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-foreground text-background rounded-md text-sm shadow-lg pointer-events-none">
            {banner}
          </div>
        )}

        {saveStatus !== "idle" && (
          <div className="absolute top-3 right-3 z-50 flex items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-1 text-xs text-muted-foreground shadow-sm">
            {saveStatus === "saving" ? (
              <Spinner className="w-3 h-3 text-primary" />
            ) : (
              <span className="inline-block h-3 w-3 rounded-full bg-emerald-500" />
            )}
            {saveStatus === "saving" ? "Saving..." : "All changes saved"}
          </div>
        )}

        {view === "contacts" && (
          <>
            {/* List column */}
            <section className="w-[380px] border-r border-border bg-card flex flex-col">
              {selectionMode ? (
                <BulkActionToolbar
                  count={selectedIds.size}
                  onClear={clearSelection}
                  onSelectAll={selectAllVisible}
                  onPrint={() =>
                    openPrintFor(
                      selectedContacts,
                      `${selectedIds.size} selected contact${selectedIds.size === 1 ? "" : "s"}`,
                    )
                  }
                  onCopyEmails={() => copyEmailsFor(selectedContacts)}
                  onAddToList={() => setAddToListOpen(true)}
                  onDelete={bulkDelete}
                />
              ) : (
                <div className="px-5 py-4 border-b border-border space-y-3">
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-lg font-semibold tracking-tight">
                      {activeGroupId ? groups.find((g) => g.id === activeGroupId)?.name : "All Contacts"}
                    </h2>
                    <span className="text-xs text-muted-foreground">{filteredContacts.length}</span>
                  </div>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, company..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant={starredOnly ? "default" : "outline"}
                      onClick={() => setStarredOnly((v) => !v)}
                      className="h-8 gap-1.5"
                    >
                      <Star className={cn("w-3.5 h-3.5", starredOnly && "fill-current")} />
                      Starred
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        openPrintFor(
                          filteredContacts,
                          activeGroupId
                            ? groups.find((g) => g.id === activeGroupId)?.name ?? "Contacts"
                            : "All contacts",
                        )
                      }
                      className="h-8 gap-1.5"
                      disabled={filteredContacts.length === 0}
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={selectAllVisible}
                      className="h-8 gap-1.5"
                      disabled={filteredContacts.length === 0}
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      Select all
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto">
                {filteredContacts.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <p className="text-sm text-muted-foreground">No contacts match your filters</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {filteredContacts.map((c) => {
                      const checked = selectedIds.has(c.id)
                      return (
                        <li key={c.id}>
                          <div
                            className={cn(
                              "w-full px-5 py-3 flex items-start gap-3 transition-colors group",
                              selectedId === c.id
                                ? "bg-secondary"
                                : checked
                                  ? "bg-primary/5"
                                  : "hover:bg-secondary/40",
                            )}
                          >
                            <div className="pt-1.5">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggleSelected(c.id)}
                                aria-label={`Select ${c.firstName} ${c.lastName}`}
                              />
                            </div>
                            <button
                              onClick={() => setSelectedId(c.id)}
                              className="flex-1 flex items-start gap-3 min-w-0 text-left"
                            >
                              <Avatar firstName={c.firstName} lastName={c.lastName} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-semibold truncate">
                                    {c.firstName} {c.lastName}
                                  </p>
                                  {c.starred && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 flex-shrink-0" />}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{c.title}</p>
                                <p className="text-xs text-muted-foreground truncate">{c.company}</p>
                              </div>
                            </button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </section>

            {/* Detail column */}
            <section className="flex-1 overflow-y-auto bg-background">
              {selected ? (
                <ContactDetail
                  contact={selected}
                  groups={groups.filter((g) => selected.groupIds.includes(g.id))}
                  groupColorClasses={groupColorClasses}
                  customFields={customFields}
                  eventSeries={eventSeries}
                  eventOccurrences={eventOccurrences}
                  participations={participations}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onToggleStar={handleToggleStar}
                  onCreateParticipation={handleCreateParticipation}
                  onAddPayment={handleAddPayment}
                  onDeletePayment={handleDeletePayment}
                />
              ) : (
                <EmptyState
                  icon={Users}
                  title="No contact selected"
                  description="Pick a contact from the list to see their details, or create a new one."
                  action={
                    <Button onClick={() => setNewDialogOpen(true)} size="sm" className="gap-2">
                      <Plus className="w-4 h-4" /> New Contact
                    </Button>
                  }
                />
              )}
            </section>
          </>
        )}

        {view === "lists" && (
          <ListsView
            lists={lists}
            contacts={contacts}
            groups={groups}
            customFields={customFields}
            groupColorClasses={groupColorClasses}
            onCreateList={handleCreateList}
            onUpdateList={handleUpdateList}
            onDeleteList={handleDeleteList}
            onPrintList={(list) => {
              const members = resolveListMembers(list, contacts, customFields)
              openPrintFor(members, list.name)
            }}
            onCopyEmails={(items) => copyEmailsFor(items)}
          />
        )}

        {view === "events" && (
          <EventsView
            contacts={contacts}
            eventSeries={eventSeries}
            eventOccurrences={eventOccurrences}
            participations={participations}
            onCreateEvent={handleCreateEventOccurrence}
          />
        )}

        {view === "payments" && (
          <PaymentsView
            contacts={contacts}
            eventSeries={eventSeries}
            eventOccurrences={eventOccurrences}
            participations={participations}
          />
        )}

        {view === "trash" && (
          <TrashView deleted={deleted} onRestore={handleRestore} onPurge={handlePurge} />
        )}

        {view === "analytics" && (
          <AnalyticsView contacts={contacts} groups={groups} activity={activity} />
        )}

        {view === "settings" && (
          <SettingsView
            contacts={contacts}
            groups={groups}
            customFields={customFields}
            printPreferences={printPreferences}
            onUpdatePrintPreferences={setPrintPreferences}
            onCreateField={handleCreateField}
            onUpdateField={handleUpdateField}
            onDeleteField={handleDeleteField}
            onCreateGroup={handleCreateGroup}
            onUpdateGroup={handleUpdateGroup}
            onDeleteGroup={handleDeleteGroup}
            onSetContactGroups={handleSetContactGroups}
          />
        )}
      </main>

      <NewContactDialog
        open={newDialogOpen}
        onOpenChange={setNewDialogOpen}
        groups={groups}
        groupColorClasses={groupColorClasses}
        customFields={customFields}
        onCreate={handleCreate}
      />

      <PrintDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        contacts={printContacts}
        groups={groups}
        customFields={customFields}
        title={printTitle}
        printPreferences={printPreferences}
        onUpdatePrintPreferences={setPrintPreferences}
      />

      <AddToListDialog
        open={addToListOpen}
        onOpenChange={setAddToListOpen}
        selectedCount={selectedIds.size}
        lists={lists}
        onAddToExisting={addSelectedToList}
        onCreateNew={createListFromSelection}
      />
    </div>
  )
}

function BulkActionToolbar({
  count,
  onClear,
  onSelectAll,
  onPrint,
  onCopyEmails,
  onAddToList,
  onDelete,
}: {
  count: number
  onClear: () => void
  onSelectAll: () => void
  onPrint: () => void
  onCopyEmails: () => void
  onAddToList: () => void
  onDelete: () => void
}) {
  return (
    <div className="px-4 py-3 border-b border-border bg-primary/5 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onClear} className="h-7 w-7 p-0">
            <X className="w-3.5 h-3.5" />
            <span className="sr-only">Clear selection</span>
          </Button>
          <span className="text-sm font-semibold tabular-nums">
            {count} selected
          </span>
        </div>
        <button
          onClick={onSelectAll}
          className="text-xs text-primary hover:underline"
        >
          Select all
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <Button size="sm" variant="outline" onClick={onPrint} className="h-8 gap-1.5 justify-start">
          <Printer className="w-3.5 h-3.5" />
          Print
        </Button>
        <Button size="sm" variant="outline" onClick={onCopyEmails} className="h-8 gap-1.5 justify-start">
          <Mail className="w-3.5 h-3.5" />
          Copy emails
        </Button>
        <Button size="sm" variant="outline" onClick={onAddToList} className="h-8 gap-1.5 justify-start">
          <ListPlus className="w-3.5 h-3.5" />
          Add to list
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onDelete}
          className="h-8 gap-1.5 justify-start text-destructive hover:text-destructive"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </Button>
      </div>
    </div>
  )
}

function NavItem({
  icon: Icon,
  label,
  badge,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  badge?: number
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors",
        active ? "bg-secondary text-secondary-foreground" : "text-foreground hover:bg-secondary/60",
      )}
    >
      <span className="flex items-center gap-2.5">
        <Icon className="w-4 h-4" />
        {label}
      </span>
      {typeof badge === "number" && (
        <span className="text-xs text-muted-foreground tabular-nums">{badge}</span>
      )}
    </button>
  )
}

function Avatar({ firstName, lastName }: { firstName: string; lastName: string }) {
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
  // pick stable color from name hash
  const palette = [
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-violet-100 text-violet-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
  ]
  let hash = 0
  for (const ch of firstName + lastName) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  const color = palette[Math.abs(hash) % palette.length]
  return (
    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0", color)}>
      {initials}
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

function TrashView({
  deleted,
  onRestore,
  onPurge,
}: {
  deleted: Contact[]
  onRestore: (id: string) => void
  onPurge: (id: string) => void
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-8 py-6 border-b border-border">
        <h2 className="text-2xl font-semibold tracking-tight">Trash</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Deleted contacts are kept here for 30 days before being permanently removed.
        </p>
      </div>
      <div className="px-8 py-6">
        {deleted.length === 0 ? (
          <Card className="p-12 text-center">
            <Trash2 className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Trash is empty</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {deleted.map((c) => (
              <Card key={c.id} className="p-4 flex items-center gap-4">
                <Avatar firstName={c.firstName} lastName={c.lastName} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {c.firstName} {c.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate" suppressHydrationWarning>
                    {c.company} · Deleted {timeAgo(c.updatedAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => onRestore(c.id)} className="gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restore
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onPurge(c.id)} className="text-destructive hover:text-destructive">
                    Delete forever
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AnalyticsView({
  contacts,
  groups,
  activity,
}: {
  contacts: Contact[]
  groups: Group[]
  activity: ActivityEntry[]
}) {
  const starredCount = contacts.filter((c) => c.starred).length
  const companies = new Set(contacts.map((c) => c.company)).size

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-8 py-6 border-b border-border">
        <h2 className="text-2xl font-semibold tracking-tight">Analytics</h2>
        <p className="text-sm text-muted-foreground mt-1">An overview of your network and recent activity.</p>
      </div>
      <div className="px-8 py-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <Stat label="Total contacts" value={contacts.length} />
          <Stat label="Starred" value={starredCount} />
          <Stat label="Companies" value={companies} />
          <Stat label="Groups" value={groups.length} />
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3">Recent activity</h3>
          <Card className="divide-y divide-border">
            {activity.slice(0, 10).map((a) => (
              <div key={a.id} className="px-4 py-3 flex items-start gap-3">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    a.action === "create" && "bg-emerald-100 text-emerald-700",
                    a.action === "update" && "bg-blue-100 text-blue-700",
                    a.action === "delete" && "bg-rose-100 text-rose-700",
                    a.action === "restore" && "bg-amber-100 text-amber-700",
                  )}
                >
                  <Activity className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{a.entityName}</span>
                    <span className="text-muted-foreground"> · {a.description}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5" suppressHydrationWarning>{timeAgo(a.timestamp)}</p>
                </div>
                <Badge variant="outline" className="text-xs capitalize flex-shrink-0">
                  {a.action}
                </Badge>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  )
}

function SettingsView({
  contacts,
  groups,
  customFields,
  printPreferences,
  onUpdatePrintPreferences,
  onCreateField,
  onUpdateField,
  onDeleteField,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onSetContactGroups,
}: {
  contacts: Contact[]
  groups: Group[]
  customFields: CustomField[]
  printPreferences: PrintPreferences
  onUpdatePrintPreferences: (prefs: PrintPreferences) => void
  onCreateField: (f: CustomField) => void
  onUpdateField: (f: CustomField) => void
  onDeleteField: (id: string) => void
  onCreateGroup: (g: Omit<Group, "id">) => void
  onUpdateGroup: (g: Group) => void
  onDeleteGroup: (id: string) => void
  onSetContactGroups: (contactId: string, groupIds: string[]) => void
}) {
  function exportCSV() {
    const headers = [
      "First Name",
      "Last Name",
      "Email 1",
      "Email 2",
      "Phone 1",
      "Phone 2",
      "Company",
      "Title",
      "Address Line 1",
      "Address Line 2",
      "City",
      "ZIP",
      "Country",
      "Website",
      "Notes",
    ]
    const rows = contacts.map((c) =>
      [
        c.firstName,
        c.lastName,
        c.email,
        c.email2 ?? "",
        c.phone,
        c.phone2 ?? "",
        c.company,
        c.title,
        c.addressLine1 ?? "",
        c.addressLine2 ?? "",
        c.city,
        c.zip ?? "",
        c.country,
        c.website,
        c.notes,
      ]
        .map((v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`)
        .join(","),
    )
    const csv = [headers.join(","), ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-8 py-6 border-b border-border">
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage your data, custom fields, and application preferences.</p>
      </div>
      <div className="px-8 py-6 space-y-6 max-w-3xl">
        <Card className="p-6">
          <h3 className="text-base font-semibold">Data summary</h3>
          <p className="text-sm text-muted-foreground mt-1">Everything in your local studio.</p>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <Stat label="Contacts" value={contacts.length} />
            <Stat label="Groups" value={groups.length} />
            <Stat label="Custom fields" value={customFields.length} />
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-base font-semibold">Envelope printing</h3>
          <p className="text-sm text-muted-foreground mt-1">Configure return address presets and envelope address formatting.</p>

          <div className="mt-4 grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Default address layout
                </Label>
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant={printPreferences.addressLayout === "european" ? "default" : "outline"}
                    onClick={() =>
                      onUpdatePrintPreferences({
                        ...printPreferences,
                        addressLayout: "european",
                      })
                    }
                  >
                    European
                  </Button>
                  <Button
                    size="sm"
                    variant={printPreferences.addressLayout === "usa" ? "default" : "outline"}
                    onClick={() =>
                      onUpdatePrintPreferences({
                        ...printPreferences,
                        addressLayout: "usa",
                      })
                    }
                  >
                    USA
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Active return address preset
                </Label>
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant={printPreferences.returnAddressPreset === "business" ? "default" : "outline"}
                    onClick={() =>
                      onUpdatePrintPreferences({
                        ...printPreferences,
                        returnAddressPreset: "business",
                      })
                    }
                  >
                    Business
                  </Button>
                  <Button
                    size="sm"
                    variant={printPreferences.returnAddressPreset === "personal" ? "default" : "outline"}
                    onClick={() =>
                      onUpdatePrintPreferences({
                        ...printPreferences,
                        returnAddressPreset: "personal",
                      })
                    }
                  >
                    Personal
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="text-sm font-semibold">Business return address</h4>
              <div className="mt-4 grid gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Company</Label>
                  <Input
                    value={printPreferences.returnAddresses.business.company}
                    onChange={(event) =>
                      onUpdatePrintPreferences({
                        ...printPreferences,
                        returnAddresses: {
                          ...printPreferences.returnAddresses,
                          business: {
                            ...printPreferences.returnAddresses.business,
                            company: event.target.value,
                          },
                        },
                      })
                    }
                    className="mt-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">First name</Label>
                    <Input
                      value={printPreferences.returnAddresses.business.firstName}
                      onChange={(event) =>
                        onUpdatePrintPreferences({
                          ...printPreferences,
                          returnAddresses: {
                            ...printPreferences.returnAddresses,
                            business: {
                              ...printPreferences.returnAddresses.business,
                              firstName: event.target.value,
                            },
                          },
                        })
                      }
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Last name</Label>
                    <Input
                      value={printPreferences.returnAddresses.business.lastName}
                      onChange={(event) =>
                        onUpdatePrintPreferences({
                          ...printPreferences,
                          returnAddresses: {
                            ...printPreferences.returnAddresses,
                            business: {
                              ...printPreferences.returnAddresses.business,
                              lastName: event.target.value,
                            },
                          },
                        })
                      }
                      className="mt-2"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Street</Label>
                  <Input
                    value={printPreferences.returnAddresses.business.street}
                    onChange={(event) =>
                      onUpdatePrintPreferences({
                        ...printPreferences,
                        returnAddresses: {
                          ...printPreferences.returnAddresses,
                          business: {
                            ...printPreferences.returnAddresses.business,
                            street: event.target.value,
                          },
                        },
                      })
                    }
                    className="mt-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">ZIP</Label>
                    <Input
                      value={printPreferences.returnAddresses.business.zip}
                      onChange={(event) =>
                        onUpdatePrintPreferences({
                          ...printPreferences,
                          returnAddresses: {
                            ...printPreferences.returnAddresses,
                            business: {
                              ...printPreferences.returnAddresses.business,
                              zip: event.target.value,
                            },
                          },
                        })
                      }
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">City</Label>
                    <Input
                      value={printPreferences.returnAddresses.business.city}
                      onChange={(event) =>
                        onUpdatePrintPreferences({
                          ...printPreferences,
                          returnAddresses: {
                            ...printPreferences.returnAddresses,
                            business: {
                              ...printPreferences.returnAddresses.business,
                              city: event.target.value,
                            },
                          },
                        })
                      }
                      className="mt-2"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Country</Label>
                  <Input
                    value={printPreferences.returnAddresses.business.country}
                    onChange={(event) =>
                      onUpdatePrintPreferences({
                        ...printPreferences,
                        returnAddresses: {
                          ...printPreferences.returnAddresses,
                          business: {
                            ...printPreferences.returnAddresses.business,
                            country: event.target.value,
                          },
                        },
                      })
                    }
                    className="mt-2"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="text-sm font-semibold">Personal return address</h4>
              <div className="mt-4 grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">First name</Label>
                    <Input
                      value={printPreferences.returnAddresses.personal.firstName}
                      onChange={(event) =>
                        onUpdatePrintPreferences({
                          ...printPreferences,
                          returnAddresses: {
                            ...printPreferences.returnAddresses,
                            personal: {
                              ...printPreferences.returnAddresses.personal,
                              firstName: event.target.value,
                            },
                          },
                        })
                      }
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Last name</Label>
                    <Input
                      value={printPreferences.returnAddresses.personal.lastName}
                      onChange={(event) =>
                        onUpdatePrintPreferences({
                          ...printPreferences,
                          returnAddresses: {
                            ...printPreferences.returnAddresses,
                            personal: {
                              ...printPreferences.returnAddresses.personal,
                              lastName: event.target.value,
                            },
                          },
                        })
                      }
                      className="mt-2"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Street</Label>
                  <Input
                    value={printPreferences.returnAddresses.personal.street}
                    onChange={(event) =>
                      onUpdatePrintPreferences({
                        ...printPreferences,
                        returnAddresses: {
                          ...printPreferences.returnAddresses,
                          personal: {
                            ...printPreferences.returnAddresses.personal,
                            street: event.target.value,
                          },
                        },
                      })
                    }
                    className="mt-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">ZIP</Label>
                    <Input
                      value={printPreferences.returnAddresses.personal.zip}
                      onChange={(event) =>
                        onUpdatePrintPreferences({
                          ...printPreferences,
                          returnAddresses: {
                            ...printPreferences.returnAddresses,
                            personal: {
                              ...printPreferences.returnAddresses.personal,
                              zip: event.target.value,
                            },
                          },
                        })
                      }
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">City</Label>
                    <Input
                      value={printPreferences.returnAddresses.personal.city}
                      onChange={(event) =>
                        onUpdatePrintPreferences({
                          ...printPreferences,
                          returnAddresses: {
                            ...printPreferences.returnAddresses,
                            personal: {
                              ...printPreferences.returnAddresses.personal,
                              city: event.target.value,
                            },
                          },
                        })
                      }
                      className="mt-2"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Country</Label>
                  <Input
                    value={printPreferences.returnAddresses.personal.country}
                    onChange={(event) =>
                      onUpdatePrintPreferences({
                        ...printPreferences,
                        returnAddresses: {
                          ...printPreferences.returnAddresses,
                          personal: {
                            ...printPreferences.returnAddresses.personal,
                            country: event.target.value,
                          },
                        },
                      })
                    }
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        <GroupsManager
          groups={groups}
          contacts={contacts}
          groupColorClasses={groupColorClasses}
          onCreate={onCreateGroup}
          onUpdate={onUpdateGroup}
          onDelete={onDeleteGroup}
          onSetContactGroups={onSetContactGroups}
        />

        <CustomFieldsManager
          fields={customFields}
          groups={groups}
          onCreate={onCreateField}
          onUpdate={onUpdateField}
          onDelete={onDeleteField}
        />

        <Card className="p-6">
          <h3 className="text-base font-semibold">Import & export</h3>
          <p className="text-sm text-muted-foreground mt-1">Backup or migrate your contacts.</p>
          <div className="mt-4 flex gap-2">
            <Button onClick={exportCSV} variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Export as CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-2" disabled>
              <Upload className="w-4 h-4" />
              Import CSV
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-base font-semibold">About</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Local Studio is a contact manager that keeps your data private and local-first. Built for professionals
            who care about thoughtful design and a calm workflow.
          </p>
          <Separator className="my-4" />
          <p className="text-xs text-muted-foreground">Version 1.0.0</p>
        </Card>
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

function timeAgo(ts: number) {
  const diff = Date.now() - ts
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}
