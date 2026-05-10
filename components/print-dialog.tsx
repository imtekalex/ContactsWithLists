"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import {
  Printer,
  X,
  LayoutGrid,
  Rows,
  Check,
  FileText,
  RectangleVertical,
  RectangleHorizontal,
  ListPlus,
  Mail,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  type Contact,
  type CustomField,
  type Group,
  formatCustomValue,
  visibleCustomFieldsFor,
} from "@/lib/contacts-data"
import type { PrintPreferences } from "@/lib/contacts-store"

type FieldKey =
  | "firstName"
  | "lastName"
  | "company"
  | "title"
  | "email"
  | "email2"
  | "phone"
  | "phone2"
  | "addressLine1"
  | "addressLine2"
  | "city"
  | "zip"
  | "country"
  | "website"
  | "notes"
  | "groups"
  | `cf:${string}`

interface PrintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contacts: Contact[]
  groups: Group[]
  customFields: CustomField[]
  title?: string
  printPreferences: PrintPreferences
  onUpdatePrintPreferences: (prefs: PrintPreferences) => void
}

const CORE_FIELDS: { key: FieldKey; label: string }[] = [
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
  { key: "company", label: "Company" },
  { key: "title", label: "Title" },
  { key: "email", label: "Email 1" },
  { key: "email2", label: "Email 2" },
  { key: "phone", label: "Phone 1" },
  { key: "phone2", label: "Phone 2" },
  { key: "addressLine1", label: "Address line 1" },
  { key: "addressLine2", label: "Address line 2" },
  { key: "city", label: "City" },
  { key: "zip", label: "ZIP" },
  { key: "country", label: "Country" },
  { key: "website", label: "Website" },
  { key: "groups", label: "Groups" },
  { key: "notes", label: "Notes" },
]

const MM_TO_PX = 3.7795275591 // 96 dpi
const PAGE_PADDING_MM = 14
const HEADER_MARGIN_BOTTOM_PX = 12
const CARD_GAP_PT_TO_PX = 8 * (96 / 72) // 8pt vertical gap in cards grid

export function PrintDialog({
  open,
  onOpenChange,
  contacts,
  groups,
  customFields,
  title,
  printPreferences,
  onUpdatePrintPreferences,
}: PrintDialogProps) {
  const [printType, setPrintType] = useState<PrintPreferences["printType"]>(printPreferences.printType)
  const [layout, setLayout] = useState<"table" | "cards">("table")
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait")
  const [zoomMode, setZoomMode] = useState<"fit" | number>("fit")
  const [zoom, setZoom] = useState(0.7)
  const [selectedFields, setSelectedFields] = useState<Set<FieldKey>>(
    new Set(["firstName", "lastName", "company", "title", "email", "phone"]),
  )
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(
    new Set(contacts.map((c) => c.id)),
  )
  const [addressLayout, setAddressLayout] = useState<PrintPreferences["addressLayout"]>(
    printPreferences.addressLayout,
  )
  const [returnAddressPreset, setReturnAddressPreset] = useState<PrintPreferences["returnAddressPreset"]>(
    printPreferences.returnAddressPreset,
  )
  const printFrameRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    setPrintType(printPreferences.printType)
    setAddressLayout(printPreferences.addressLayout)
    setReturnAddressPreset(printPreferences.returnAddressPreset)
  }, [printPreferences, open])
  const previewAreaRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)

  // Reset selection when contacts change or the dialog opens.
  useEffect(() => {
    setSelectedContactIds(new Set(contacts.map((c) => c.id)))
  }, [contacts, open])

  // Auto-suggest landscape when many columns are selected in table layout
  useEffect(() => {
    if (layout === "table" && selectedFields.size >= 7 && orientation === "portrait") {
      setOrientation("landscape")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFields.size, layout])

  const visibleContacts = useMemo(
    () => contacts.filter((c) => selectedContactIds.has(c.id)),
    [contacts, selectedContactIds],
  )

  const groupById = useMemo(() => {
    const m: Record<string, Group> = {}
    for (const g of groups) m[g.id] = g
    return m
  }, [groups])

  const availableCustomFields = useMemo(() => {
    const set = new Set<string>()
    for (const c of visibleContacts) {
      for (const f of visibleCustomFieldsFor(c, customFields)) set.add(f.id)
    }
    return customFields.filter((f) => set.has(f.id))
  }, [visibleContacts, customFields])

  const allFields: { key: FieldKey; label: string }[] = useMemo(
    () => [
      ...CORE_FIELDS,
      ...availableCustomFields.map((f) => ({
        key: `cf:${f.id}` as FieldKey,
        label: f.name,
      })),
    ],
    [availableCustomFields],
  )

  const orderedSelectedFields = useMemo(
    () => allFields.filter((f) => selectedFields.has(f.key)),
    [allFields, selectedFields],
  )

  // Real A4 sheet dimensions in pixels at 96dpi
  const sheetWidthMm = orientation === "landscape" ? 297 : 210
  const sheetHeightMm = orientation === "landscape" ? 210 : 297
  const sheetWidthPx = sheetWidthMm * MM_TO_PX
  const sheetHeightPx = sheetHeightMm * MM_TO_PX

  // -------------------------------------------------------------------------
  // Auto-fit zoom: observe preview area width and compute the zoom factor
  // that makes a single sheet fit horizontally. Capped at 100%.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (zoomMode !== "fit") {
      setZoom(zoomMode)
      return
    }
    const el = previewAreaRef.current
    if (!el) return

    const compute = () => {
      const horizontalPadding = 64 // px around the sheet inside the preview
      const available = el.clientWidth - horizontalPadding
      if (available <= 0) return
      const fit = Math.min(1, available / sheetWidthPx)
      setZoom(Math.max(0.2, fit))
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [zoomMode, sheetWidthPx])

  // -------------------------------------------------------------------------
  // Measurement-based pagination: render all selected contacts inside an
  // off-screen measurement sheet at full size, measure each row/card, and
  // pack them into pages so each page is filled exactly to the available
  // height. This gives true overflow-only multi-page output.
  // -------------------------------------------------------------------------
  const [pages, setPages] = useState<Contact[][]>([])

  // Only update pages when the structure (ids per page) actually changes,
  // so jittery measurements can never cause a state-update loop.
  function commitPages(next: Contact[][]) {
    setPages((prev) => {
      if (prev.length !== next.length) return next
      for (let i = 0; i < prev.length; i++) {
        const a = prev[i]
        const b = next[i]
        if (a.length !== b.length) return next
        for (let j = 0; j < a.length; j++) {
          if (a[j].id !== b[j].id) return next
        }
      }
      return prev
    })
  }

  useEffect(() => {
    if (visibleContacts.length === 0 || orderedSelectedFields.length === 0) {
      commitPages([[]])
      return
    }

    if (printType === "label") {
      const pages: Contact[][] = []
      for (let i = 0; i < visibleContacts.length; i += 24) {
        pages.push(visibleContacts.slice(i, i + 24))
      }
      commitPages(pages.length > 0 ? pages : [[]])
      return
    }

    if (printType === "envelope") {
      const pages: Contact[][] = visibleContacts.map((contact) => [contact])
      commitPages(pages.length > 0 ? pages : [[]])
      return
    }

    const container = measureRef.current
    if (!container) return

    const padding = PAGE_PADDING_MM * MM_TO_PX
    const headerEl = container.querySelector("[data-measure-header]") as HTMLElement | null
    const headerHeight = headerEl?.offsetHeight ?? 0

    const firstPageBudget =
      sheetHeightPx - 2 * padding - headerHeight - HEADER_MARGIN_BOTTOM_PX
    const otherPageBudget = sheetHeightPx - 2 * padding

    if (layout === "table") {
      const thead = container.querySelector("thead") as HTMLElement | null
      const tbody = container.querySelector("tbody") as HTMLElement | null
      if (!thead || !tbody) {
        commitPages([visibleContacts])
        return
      }
      const theadHeight = thead.offsetHeight
      const rowEls = Array.from(tbody.children) as HTMLElement[]

      const result: Contact[][] = []
      let current: Contact[] = []
      let used = theadHeight
      let budget = firstPageBudget

      rowEls.forEach((row, idx) => {
        const h = row.offsetHeight
        // If this row would not fit on the current page, start a new page.
        // Always allow at least one row per page so we never get an empty page.
        if (current.length > 0 && used + h > budget) {
          result.push(current)
          current = []
          used = theadHeight
          budget = otherPageBudget
        }
        current.push(visibleContacts[idx])
        used += h
      })
      if (current.length > 0) result.push(current)
      commitPages(result.length > 0 ? result : [[]])
      return
    }

    const cardEls = Array.from(container.querySelectorAll("article")) as HTMLElement[]
    if (cardEls.length === 0) {
      commitPages([visibleContacts])
      return
    }

    const result: Contact[][] = []
    let current: Contact[] = []
    let used = 0
    let budget = firstPageBudget

    for (let i = 0; i < cardEls.length; i += 2) {
      const aH = cardEls[i]?.offsetHeight ?? 0
      const bH = cardEls[i + 1]?.offsetHeight ?? 0
      const rowH = Math.max(aH, bH)
      const inc = current.length === 0 ? rowH : rowH + CARD_GAP_PT_TO_PX

      if (current.length > 0 && used + inc > budget) {
        result.push(current)
        current = []
        used = rowH
        budget = otherPageBudget
      } else {
        used += inc
      }

      current.push(visibleContacts[i])
      if (i + 1 < visibleContacts.length) current.push(visibleContacts[i + 1])
    }
    if (current.length > 0) result.push(current)
    commitPages(result.length > 0 ? result : [[]])
  }, [
    visibleContacts,
    layout,
    orientation,
    orderedSelectedFields,
    sheetWidthPx,
    sheetHeightPx,
    open,
    printType,
  ])

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  function toggleField(key: FieldKey) {
    setSelectedFields((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleContact(id: string) {
    setSelectedContactIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function fieldValue(c: Contact, key: FieldKey): string {
    if (key.startsWith("cf:")) {
      const fieldId = key.slice(3)
      const field = customFields.find((f) => f.id === fieldId)
      if (!field) return ""
      return formatCustomValue(c.customValues[fieldId], field)
    }
    if (key === "groups") {
      return c.groupIds.map((id) => groupById[id]?.name).filter(Boolean).join(", ")
    }
    return (c[key as keyof Contact] as string) ?? ""
  }

  function getAddressLines(c: Contact): string[] {
    const lines: string[] = []
    const name = [c.firstName, c.lastName].filter(Boolean).join(" ")
    if (name) lines.push(name)
    if (c.company) lines.push(c.company)
    if (c.addressLine1) lines.push(c.addressLine1)
    if (c.addressLine2) lines.push(c.addressLine2)
    const cityZip = [c.city, c.zip].filter(Boolean).join(" ")
    if (cityZip) lines.push(cityZip)
    if (c.country) lines.push(c.country)
    return lines
  }

  function getReturnAddressLines() {
    const returnAddress = printPreferences.returnAddresses[returnAddressPreset]
    const lines: string[] = []
    if (returnAddress.company) lines.push(returnAddress.company)
    const name = [returnAddress.firstName, returnAddress.lastName].filter(Boolean).join(" ")
    if (name) lines.push(name)
    if (returnAddress.street) lines.push(returnAddress.street)
    const location = [returnAddress.city, returnAddress.zip].filter(Boolean).join(" ")
    if (location) lines.push(location)
    if (returnAddress.country) lines.push(returnAddress.country)
    return lines
  }

  function getEnvelopeAddressLines(c: Contact): string[] {
    const lines: string[] = []
    const name = [c.firstName, c.lastName].filter(Boolean).join(" ")
    if (name) lines.push(name)
    if (c.company) lines.push(c.company)
    if (c.addressLine1) lines.push(c.addressLine1)
    if (c.addressLine2) lines.push(c.addressLine2)
    if (addressLayout === "european") {
      const cityZip = [c.city, c.zip].filter(Boolean).join(" ")
      if (cityZip) lines.push(cityZip)
      if (c.country) lines.push(c.country)
    } else {
      const cityZip = [c.city, c.zip].filter(Boolean).join(", ")
      if (cityZip) lines.push(cityZip)
      if (c.country) lines.push(c.country)
    }
    return lines
  }

  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
  }

  // Build printable HTML — relies on browser CSS page-breaks for pagination
  function buildPrintHTML(): string {
    const pageSize = orientation === "landscape" ? "A4 landscape" : "A4 portrait"

    let body = ""

    if (printType === "standard") {
      if (layout === "table") {
        const headerCells = orderedSelectedFields
          .map((f) => `<th>${escapeHtml(f.label)}</th>`)
          .join("")
        const rows = visibleContacts
          .map((c) => {
            const cells = orderedSelectedFields
              .map((f) => {
                const val = fieldValue(c, f.key)
                return `<td>${val ? escapeHtml(val) : "&mdash;"}</td>`
              })
              .join("")
            return `<tr>${cells}</tr>`
          })
          .join("")
        body = `<table class="data"><thead><tr>${headerCells}</tr></thead><tbody>${rows}</tbody></table>`
      } else {
        body = `<div class="cards">${visibleContacts
          .map((c) => {
            const fields = orderedSelectedFields
              .filter((f) => f.key !== "firstName" && f.key !== "lastName")
              .map((f) => {
                const val = fieldValue(c, f.key)
                if (!val) return ""
                return `<div class="row"><span class="label">${escapeHtml(f.label)}</span><span class="value">${escapeHtml(val)}</span></div>`
              })
              .join("")
            return `<article class="card"><h3>${escapeHtml(c.firstName)} ${escapeHtml(c.lastName)}</h3>${c.title ? `<p class="title">${escapeHtml(c.title)}</p>` : ""}${fields}</article>`
          })
          .join("")}</div>`
      }
    } else if (printType === "label") {
      const labelItems = visibleContacts
        .map((c) => {
          const address = getAddressLines(c).slice(0, 5) // avoid too many lines
          return `<div class="label"><div class="label-recipient">${address
            .map((line) => `<div>${escapeHtml(line)}</div>`)
            .join("")}</div></div>`
        })
        .join("")
      body = `<div class="labels">${labelItems}</div>`
    } else {
      const envelopeItems = visibleContacts
        .map((c) => {
          const returnAddress = getReturnAddressLines()
          const recipient = getEnvelopeAddressLines(c)
          return `<div class="envelope-page"><div class="return-address">${returnAddress
            .map((line) => `<div>${escapeHtml(line)}</div>`)
            .join("")}</div><div class="recipient-address">${recipient
            .map((line) => `<div>${escapeHtml(line)}</div>`)
            .join("")}</div></div>`
        })
        .join("")
      body = envelopeItems
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title ?? "Contact list")}</title>
  <style>
    /* Force browsers to honor backgrounds/colors when printing. */
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      box-sizing: border-box;
    }
    @page { size: ${pageSize}; margin: 14mm; }
    html, body { margin: 0; padding: 0; background: white; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      line-height: 1.4;
      font-size: 10pt;
    }
    h1, h2, h3, p { margin: 0; }

    .doc-header {
      background: #1e3a8a;
      color: #ffffff;
      padding: 8pt 12pt;
      border-radius: 3pt;
      margin-bottom: 12pt;
    }
    .doc-header h1 {
      font-size: 14pt;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    .doc-header p {
      font-size: 8pt;
      color: rgba(255,255,255,0.78);
      margin-top: 2pt;
    }

    table.data { width: 100%; border-collapse: collapse; font-size: 9pt; }
    table.data thead { display: table-header-group; }
    table.data tr { page-break-inside: avoid; break-inside: avoid; }
    table.data th {
      text-align: left; font-weight: 600;
      padding: 5pt 6pt; border-bottom: 1.5pt solid #cbd5e1;
      font-size: 8.5pt; white-space: nowrap;
      background: #eff6ff;
      color: #1e3a8a;
    }
    table.data td {
      padding: 4.5pt 6pt; border-bottom: 0.5pt solid #e2e8f0;
      font-size: 9pt; vertical-align: top;
      word-break: break-word;
    }

    .cards {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8pt;
    }
    .cards .card {
      border: 0.75pt solid #cbd5e1;
      border-radius: 4pt;
      padding: 8pt 10pt;
      page-break-inside: avoid;
      break-inside: avoid;
      background: #ffffff;
    }
    .cards .card h3 { font-size: 10.5pt; font-weight: 600; color: #1e3a8a; }
    .cards .card .title { font-size: 9pt; color: #64748b; margin-top: 1pt; }
    .cards .card .row {
      display: flex; gap: 6pt; margin-top: 3pt; font-size: 8.5pt;
    }
    .cards .card .row .label {
      color: #64748b; min-width: 56pt; flex-shrink: 0;
    }
    .cards .card .row .value {
      color: #0f172a; word-break: break-word;
    }

    .labels {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8pt;
    }
    .label {
      border: 0.75pt solid #cbd5e1;
      border-radius: 3pt;
      padding: 8pt;
      min-height: 35mm;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: left;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .label-recipient div {
      line-height: 1.25;
      font-size: 10pt;
      color: #0f172a;
    }

    .envelope-page {
      position: relative;
      min-height: calc(100vh - 28mm);
      padding: 18mm;
      box-sizing: border-box;
    }
    .return-address {
      position: absolute;
      top: 18mm;
      left: 18mm;
      line-height: 1.3;
      font-size: 9pt;
      color: #475569;
    }
    .recipient-address {
      position: absolute;
      top: 55mm;
      left: 40mm;
      line-height: 1.3;
      font-size: 10.5pt;
      font-weight: 600;
      color: #0f172a;
    }

    @media print {
      .doc-header { page-break-after: avoid; }
    }
  </style>
</head>
<body>
  <div class="doc-header">
    <h1>${escapeHtml(title ?? "Contact list")}</h1>
    <p>${visibleContacts.length} contact${visibleContacts.length === 1 ? "" : "s"}${printType === "standard" ? " &middot; " + orderedSelectedFields.length + " field" + (orderedSelectedFields.length === 1 ? "" : "s") : ""} &middot; ${orientation === "landscape" ? "Landscape" : "Portrait"}</p>
  </div>
  ${body}
</body>
</html>`
  }

  function handlePrint() {
    if (typeof window === "undefined") return
    const iframe = printFrameRef.current
    if (!iframe) return
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return
    doc.open()
    doc.write(buildPrintHTML())
    doc.close()

    // Wait for full render before triggering print to avoid blank pages.
    const tryPrint = () => {
      const w = iframe.contentWindow
      if (!w) return
      try {
        if (w.document.readyState === "complete") {
          w.focus()
          w.print()
          return
        }
      } catch {
        // cross-origin guard, won't happen for same-origin srcdoc but safe
      }
      setTimeout(tryPrint, 60)
    }
    setTimeout(tryPrint, 80)
  }

  function PreviewLabels({ contacts }: { contacts: Contact[] }) {
    return (
      <div className="grid grid-cols-3 gap-4 w-full">
        {contacts.map((contact) => (
          <div key={contact.id} className="border border-border rounded-md p-4 min-h-[150px] bg-white">
            {getAddressLines(contact).map((line, idx) => (
              <p key={idx} className="text-sm leading-tight text-slate-900">
                {line}
              </p>
            ))}
          </div>
        ))}
      </div>
    )
  }

  function PreviewEnvelope({
    contacts,
    addressLayout,
    returnAddressLines,
  }: {
    contacts: Contact[]
    addressLayout: PrintPreferences["addressLayout"]
    returnAddressLines: string[]
  }) {
    return (
      <div className="w-full h-full flex flex-col gap-4">
        {contacts.map((contact) => (
          <div key={contact.id} className="relative w-full h-[360px] rounded-xl border border-border bg-white p-6 overflow-hidden">
            <div className="absolute top-6 left-6 text-xs leading-5 text-slate-600">
              {returnAddressLines.map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
            </div>
            <div className="absolute top-28 left-16 text-base font-semibold leading-6 text-slate-900">
              {getEnvelopeAddressLines(contact).map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
            </div>
            <div className="absolute bottom-6 right-6 text-[10px] text-slate-400">
              {addressLayout === "european" ? "European envelope layout" : "USA envelope layout"}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const totalPages = pages.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden flex flex-col sm:max-w-none sm:rounded-lg"
        style={{ width: "96vw", maxWidth: "1600px", height: "94vh" }}
      >
        {/* Header — title + summary chip only. Action buttons live in the
            footer to avoid overlap with the auto-injected close X. */}
        <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0">
          <DialogTitle className="text-base font-semibold flex items-center gap-2 pr-10">
            <FileText className="w-4 h-4" />
            Print preview
            <span className="text-xs font-normal text-muted-foreground ml-2">
              {totalPages} page{totalPages === 1 ? "" : "s"} ·{" "}
              {visibleContacts.length} contact{visibleContacts.length === 1 ? "" : "s"} ·{" "}
              {orderedSelectedFields.length} field{orderedSelectedFields.length === 1 ? "" : "s"}
            </span>
          </DialogTitle>
          <DialogDescription>
            Preview and configure your contact list printout.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left: configuration panel — independently scrollable */}
          <aside className="w-80 border-r border-border flex-shrink-0 overflow-y-auto">
            <div className="p-5 space-y-5">
              {/* Print type */}
              <section>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Print mode
                </Label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <ToggleButton
                    active={printType === "standard"}
                    onClick={() => {
                      setPrintType("standard")
                      onUpdatePrintPreferences({ ...printPreferences, printType: "standard" })
                    }}
                    icon={<Rows className="w-4 h-4" />}
                    label="Standard"
                  />
                  <ToggleButton
                    active={printType === "label"}
                    onClick={() => {
                      setPrintType("label")
                      onUpdatePrintPreferences({ ...printPreferences, printType: "label" })
                    }}
                    icon={<ListPlus className="w-4 h-4" />}
                    label="Labels"
                  />
                  <ToggleButton
                    active={printType === "envelope"}
                    onClick={() => {
                      setPrintType("envelope")
                      onUpdatePrintPreferences({ ...printPreferences, printType: "envelope" })
                    }}
                    icon={<Mail className="w-4 h-4" />}
                    label="Envelopes"
                  />
                </div>
              </section>

              {printType === "standard" && (
                <section>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Layout
                  </Label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <ToggleButton
                      active={layout === "table"}
                      onClick={() => setLayout("table")}
                      icon={<Rows className="w-4 h-4" />}
                      label="Table"
                    />
                    <ToggleButton
                      active={layout === "cards"}
                      onClick={() => setLayout("cards")}
                      icon={<LayoutGrid className="w-4 h-4" />}
                      label="Cards"
                    />
                  </div>
                </section>
              )}

              {/* Orientation — button toggle, matches Layout */}
              <section>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Page orientation
                </Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <ToggleButton
                    active={orientation === "portrait"}
                    onClick={() => setOrientation("portrait")}
                    icon={<RectangleVertical className="w-4 h-4" />}
                    label="Portrait"
                  />
                  <ToggleButton
                    active={orientation === "landscape"}
                    onClick={() => setOrientation("landscape")}
                    icon={<RectangleHorizontal className="w-4 h-4" />}
                    label="Landscape"
                  />
                </div>
                {layout === "table" && selectedFields.size >= 7 && orientation === "portrait" && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Landscape recommended for {selectedFields.size}+ columns
                  </p>
                )}
              </section>

              {/* Zoom — Fit width as default, with manual overrides */}
              <section>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Preview zoom
                </Label>
                <Select
                  value={zoomMode === "fit" ? "fit" : String(zoomMode)}
                  onValueChange={(v) => {
                    if (v === "fit") setZoomMode("fit")
                    else setZoomMode(Number(v))
                  }}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fit">Fit width ({Math.round(zoom * 100)}%)</SelectItem>
                    <SelectItem value="0.5">50%</SelectItem>
                    <SelectItem value="0.7">70%</SelectItem>
                    <SelectItem value="0.85">85%</SelectItem>
                    <SelectItem value="1">100%</SelectItem>
                  </SelectContent>
                </Select>
              </section>

              <Separator />

              {printType === "standard" ? (
                <section>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Fields ({selectedFields.size})
                    </Label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedFields(new Set(allFields.map((f) => f.key)))}
                        className="text-xs text-primary hover:underline"
                      >
                        All
                      </button>
                      <span className="text-xs text-muted-foreground">·</span>
                      <button
                        type="button"
                        onClick={() => setSelectedFields(new Set())}
                        className="text-xs text-primary hover:underline"
                      >
                        None
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    {CORE_FIELDS.map((f) => (
                      <FieldCheck
                        key={f.key}
                        label={f.label}
                        checked={selectedFields.has(f.key)}
                        onChange={() => toggleField(f.key)}
                      />
                    ))}
                  </div>

                  {availableCustomFields.length > 0 && (
                    <>
                      <Separator className="my-3" />
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Custom fields
                      </Label>
                      <div className="mt-2 space-y-1">
                        {availableCustomFields.map((f) => {
                          const key = `cf:${f.id}` as FieldKey
                          return (
                            <FieldCheck
                              key={f.id}
                              label={f.name}
                              checked={selectedFields.has(key)}
                              onChange={() => toggleField(key)}
                            />
                          )
                        })}
                      </div>
                    </>
                  )}
                </section>
              ) : null}

              {printType === "label" && (
                <section>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Label printing
                  </Label>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Avery Zweckform 3490 format — 24 contacts per page.
                  </p>
                </section>
              )}

              {printType === "envelope" && (
                <section>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Envelope printing
                  </Label>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant={addressLayout === "european" ? "default" : "outline"}
                      onClick={() => {
                        setAddressLayout("european")
                        onUpdatePrintPreferences({
                          ...printPreferences,
                          addressLayout: "european",
                        })
                      }}
                      className="w-full"
                    >
                      European layout
                    </Button>
                    <Button
                      size="sm"
                      variant={addressLayout === "usa" ? "default" : "outline"}
                      onClick={() => {
                        setAddressLayout("usa")
                        onUpdatePrintPreferences({
                          ...printPreferences,
                          addressLayout: "usa",
                        })
                      }}
                      className="w-full"
                    >
                      USA layout
                    </Button>
                  </div>
                  <div className="mt-3">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Return address preset
                    </Label>
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        variant={returnAddressPreset === "business" ? "default" : "outline"}
                        onClick={() => {
                          setReturnAddressPreset("business")
                          onUpdatePrintPreferences({
                            ...printPreferences,
                            returnAddressPreset: "business",
                          })
                        }}
                        className="w-full"
                      >
                        Business
                      </Button>
                      <Button
                        size="sm"
                        variant={returnAddressPreset === "personal" ? "default" : "outline"}
                        onClick={() => {
                          setReturnAddressPreset("personal")
                          onUpdatePrintPreferences({
                            ...printPreferences,
                            returnAddressPreset: "personal",
                          })
                        }}
                        className="w-full"
                      >
                        Personal
                      </Button>
                    </div>
                  </div>
                </section>
              )}

              <Separator />

              {/* Contacts */}
              <section>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Contacts ({selectedContactIds.size}/{contacts.length})
                  </Label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedContactIds(new Set(contacts.map((c) => c.id)))}
                      className="text-xs text-primary hover:underline"
                    >
                      All
                    </button>
                    <span className="text-xs text-muted-foreground">·</span>
                    <button
                      type="button"
                      onClick={() => setSelectedContactIds(new Set())}
                      className="text-xs text-primary hover:underline"
                    >
                      None
                    </button>
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  {contacts.map((c) => (
                    <FieldCheck
                      key={c.id}
                      label={`${c.firstName} ${c.lastName}`}
                      checked={selectedContactIds.has(c.id)}
                      onChange={() => toggleContact(c.id)}
                    />
                  ))}
                </div>
              </section>
            </div>
          </aside>

          {/* Right: visible preview */}
          <div ref={previewAreaRef} className="flex-1 bg-muted/30 overflow-auto min-h-0">
            <div className="flex flex-col items-center gap-6 py-8 px-6">
              {pages.map((pageContacts, pageIndex) => (
                <PreviewSheet
                  key={pageIndex}
                  pageIndex={pageIndex}
                  totalPages={totalPages}
                  widthPx={sheetWidthPx}
                  heightPx={sheetHeightPx}
                  zoom={zoom}
                  title={title ?? "Contact list"}
                  totalContacts={visibleContacts.length}
                  totalFields={orderedSelectedFields.length}
                  orientation={orientation}
                  showHeader={pageIndex === 0}
                >
                  {visibleContacts.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">No contacts selected.</p>
                  ) : printType === "label" ? (
                    <PreviewLabels contacts={pageContacts} />
                  ) : printType === "envelope" ? (
                    <PreviewEnvelope
                      contacts={pageContacts}
                      addressLayout={addressLayout}
                      returnAddressLines={getReturnAddressLines()}
                    />
                  ) : orderedSelectedFields.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">No fields selected.</p>
                  ) : layout === "table" ? (
                    <PreviewTable
                      contacts={pageContacts}
                      fields={orderedSelectedFields}
                      fieldValue={fieldValue}
                    />
                  ) : (
                    <PreviewCards
                      contacts={pageContacts}
                      fields={orderedSelectedFields}
                      fieldValue={fieldValue}
                    />
                  )}
                </PreviewSheet>
              ))}
            </div>
          </div>
        </div>

        {/* Footer toolbar */}
        <div className="border-t border-border px-6 py-3 flex items-center justify-between gap-3 flex-shrink-0 bg-background">
          <p className="text-xs text-muted-foreground">
            Pages overflow automatically — content fills each A4 sheet before
            wrapping to the next page.
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => onOpenChange(false)} className="gap-1.5">
              <X className="w-3.5 h-3.5" />
              Close
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              disabled={visibleContacts.length === 0 || orderedSelectedFields.length === 0}
              className="gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </Button>
          </div>
        </div>

        {/* Off-screen measurement sheet — full A4 size, all rows/cards rendered
            so we can measure their real heights and pack them into pages. */}
        <div
          aria-hidden
          style={{
            position: "fixed",
            left: "-100000px",
            top: 0,
            width: sheetWidthPx,
            height: "auto",
            padding: `${PAGE_PADDING_MM}mm`,
            background: "white",
            color: "#0f172a",
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            fontSize: "10pt",
            lineHeight: 1.4,
            visibility: "hidden",
            pointerEvents: "none",
          }}
        >
          <div
            data-measure-header
            style={{
              backgroundColor: "#1e3a8a",
              color: "#ffffff",
              padding: "8pt 12pt",
              borderRadius: "3pt",
            }}
          >
            <h1 style={{ fontSize: "14pt", fontWeight: 600, margin: 0 }}>
              {title ?? "Contact list"}
            </h1>
            <p style={{ fontSize: "8pt", margin: "2pt 0 0", color: "rgba(255,255,255,0.78)" }}>
              measurement
            </p>
          </div>
          <div ref={measureRef} style={{ marginTop: HEADER_MARGIN_BOTTOM_PX }}>
            {visibleContacts.length === 0 || orderedSelectedFields.length === 0 ? null : layout ===
              "table" ? (
              <PreviewTable
                contacts={visibleContacts}
                fields={orderedSelectedFields}
                fieldValue={fieldValue}
              />
            ) : (
              <PreviewCards
                contacts={visibleContacts}
                fields={orderedSelectedFields}
                fieldValue={fieldValue}
              />
            )}
          </div>
        </div>

        {/* Off-screen iframe used for printing. Must have non-zero size and
            be rendered (not display:none) for the browser to actually print. */}
        <iframe
          ref={printFrameRef}
          title="Print frame"
          aria-hidden
          tabIndex={-1}
          style={{
            position: "fixed",
            left: "-10000px",
            top: 0,
            width: "800px",
            height: "1100px",
            border: "none",
            opacity: 0,
            pointerEvents: "none",
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

function ToggleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-md border px-3 py-2.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/5 text-foreground"
          : "border-border text-muted-foreground hover:bg-secondary/60",
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function FieldCheck({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <label className="flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-secondary/60 cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      <span className="text-sm truncate flex-1">{label}</span>
      {checked && <Check className="w-3 h-3 text-primary flex-shrink-0" />}
    </label>
  )
}

function PreviewSheet({
  pageIndex,
  totalPages,
  widthPx,
  heightPx,
  zoom,
  title,
  totalContacts,
  totalFields,
  orientation,
  showHeader,
  children,
}: {
  pageIndex: number
  totalPages: number
  widthPx: number
  heightPx: number
  zoom: number
  title: string
  totalContacts: number
  totalFields: number
  orientation: "portrait" | "landscape"
  showHeader: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        style={{
          width: widthPx * zoom,
          height: heightPx * zoom,
        }}
        className="relative"
      >
        <div
          className="absolute top-0 left-0 bg-white text-slate-900 shadow-lg ring-1 ring-slate-200"
          style={{
            width: widthPx,
            height: heightPx,
            padding: "14mm",
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            overflow: "hidden",
          }}
        >
          {showHeader && (
            <header
              className="rounded-sm mb-3 px-3 py-2"
              style={{ backgroundColor: "#1e3a8a", color: "#ffffff" }}
            >
              <h1 className="text-[14pt] font-semibold tracking-tight leading-tight">{title}</h1>
              <p className="text-[8pt] mt-0.5" style={{ color: "rgba(255,255,255,0.78)" }}>
                {totalContacts} contact{totalContacts === 1 ? "" : "s"} · {totalFields} field
                {totalFields === 1 ? "" : "s"} · {orientation === "landscape" ? "Landscape" : "Portrait"}
              </p>
            </header>
          )}
          {children}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Page {pageIndex + 1} of {totalPages}
      </p>
    </div>
  )
}

function PreviewTable({
  contacts,
  fields,
  fieldValue,
}: {
  contacts: Contact[]
  fields: { key: FieldKey; label: string }[]
  fieldValue: (c: Contact, key: FieldKey) => string
}) {
  return (
    <table className="w-full border-collapse" style={{ fontSize: "9pt" }}>
      <thead>
        <tr
          className="border-b-2 border-slate-300"
          style={{ backgroundColor: "#eff6ff" }}
        >
          {fields.map((f) => (
            <th
              key={f.key}
              className="text-left font-semibold whitespace-nowrap"
              style={{ padding: "5pt 6pt", fontSize: "8.5pt", color: "#1e3a8a" }}
            >
              {f.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {contacts.map((c) => (
          <tr key={c.id} className="border-b border-slate-200 align-top">
            {fields.map((f) => (
              <td
                key={f.key}
                style={{ padding: "4.5pt 6pt", fontSize: "9pt", wordBreak: "break-word" }}
              >
                {fieldValue(c, f.key) || <span className="text-slate-300">—</span>}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function PreviewCards({
  contacts,
  fields,
  fieldValue,
}: {
  contacts: Contact[]
  fields: { key: FieldKey; label: string }[]
  fieldValue: (c: Contact, key: FieldKey) => string
}) {
  return (
    <div className="grid grid-cols-2" style={{ gap: "8pt" }}>
      {contacts.map((c) => {
        const detailFields = fields.filter((f) => f.key !== "firstName" && f.key !== "lastName")
        return (
          <article
            key={c.id}
            className="border border-slate-300 rounded"
            style={{ padding: "8pt 10pt", backgroundColor: "#ffffff" }}
          >
            <h3
              className="font-semibold leading-tight"
              style={{ fontSize: "10.5pt", color: "#1e3a8a" }}
            >
              {c.firstName} {c.lastName}
            </h3>
            {c.title && (
              <p className="text-slate-500" style={{ fontSize: "9pt", marginTop: "1pt" }}>
                {c.title}
              </p>
            )}
            {detailFields.map((f) => {
              const val = fieldValue(c, f.key)
              if (!val) return null
              return (
                <div
                  key={f.key}
                  className="flex"
                  style={{ gap: "6pt", marginTop: "3pt", fontSize: "8.5pt" }}
                >
                  <span className="text-slate-500 flex-shrink-0" style={{ minWidth: "56pt" }}>
                    {f.label}
                  </span>
                  <span className="text-slate-900" style={{ wordBreak: "break-word" }}>
                    {val}
                  </span>
                </div>
              )
            })}
          </article>
        )
      })}
    </div>
  )
}
