"use client"

import { Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  type Contact,
  type CustomField,
  type CustomFieldValue,
  visibleCustomFieldsFor,
} from "@/lib/contacts-data"

interface Props {
  contact: Contact
  fields: CustomField[]
  onChange: (fieldId: string, value: CustomFieldValue | undefined) => void
  /** Read-only mode (used outside of edit). */
  readOnly?: boolean
}

export function ContactCustomFields({ contact, fields, onChange, readOnly }: Props) {
  const allVisible = visibleCustomFieldsFor(contact, fields)

  // In read-only mode, hide fields that have no value so detail panels stay clean.
  const visible = readOnly
    ? allVisible.filter((f) => hasValue(contact.customValues[f.id]))
    : allVisible

  // Detect "orphan" stored values: fields no longer visible by current groups
  const visibleIds = new Set(allVisible.map((f) => f.id))
  const orphans = fields.filter(
    (f) => !visibleIds.has(f.id) && hasValue(contact.customValues[f.id]),
  )

  // In readOnly: render nothing if nothing has a value. Caller is responsible
  // for hiding the section header when no values are present.
  if (readOnly && visible.length === 0 && orphans.length === 0) {
    return null
  }

  if (!readOnly && allVisible.length === 0 && orphans.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No custom fields apply to this contact yet. Assign it to a group to
        unlock group-specific fields, or add a global custom field in Settings.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      {visible.length > 0 && (
        <div className="space-y-1.5">
          {visible.map((f) => (
            <CustomFieldRow
              key={f.id}
              field={f}
              value={contact.customValues[f.id]}
              onChange={(v) => onChange(f.id, v)}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      {orphans.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
            Other stored field values
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            These values were saved earlier but the field is no longer visible
            for this contact&apos;s current groups. They are kept so no data is lost.
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2">
            {orphans.map((f) => (
              <div key={f.id}>
                <dt className="text-xs text-amber-700">{f.name}</dt>
                <dd className="text-sm text-amber-900">
                  {renderReadOnly(f, contact.customValues[f.id])}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  )
}

function formatDateString(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function CustomFieldRow({
  field,
  value,
  onChange,
  readOnly,
}: {
  field: CustomField
  value: CustomFieldValue | undefined
  onChange: (v: CustomFieldValue | undefined) => void
  readOnly?: boolean
}) {
  if (readOnly) {
    return (
      <div>
        <Label className="text-xs text-muted-foreground">{field.name}</Label>
        <div className="mt-1 text-sm">{renderReadOnly(field, value)}</div>
      </div>
    )
  }

  switch (field.type) {
    case "boolean": {
      const v = value && value.type === "boolean" ? value.value : false
      return (
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center">
          <Label className="text-sm font-medium text-muted-foreground">{field.name}</Label>
          <Switch checked={v} onCheckedChange={(c) => onChange({ type: "boolean", value: c })} />
        </div>
      )
    }
    case "longText": {
      const v = value && value.type === "longText" ? value.value : ""
      return (
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-start">
          <Label className="pt-1 text-sm font-medium text-muted-foreground">{field.name}</Label>
          <Textarea
            value={v}
            onChange={(e) =>
              onChange(
                e.target.value
                  ? { type: "longText", value: e.target.value }
                  : undefined,
              )
            }
            className="min-h-[80px] rounded-md border-0 bg-transparent px-1 shadow-none hover:bg-secondary/50 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      )
    }
    case "number": {
      const v = value && value.type === "number" ? String(value.value) : ""
      return (
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center">
          <Label className="text-sm font-medium text-muted-foreground">{field.name}</Label>
          <Input
            type="number"
            value={v}
            onChange={(e) => {
              const n = e.target.value
              onChange(
                n === ""
                  ? undefined
                  : { type: "number", value: Number(n) },
              )
            }}
            className="h-7 max-w-80 rounded-md border-0 bg-transparent px-1 shadow-none hover:bg-secondary/50 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      )
    }
    case "date": {
      const v = value && value.type === "date" ? value.value : ""
      return (
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center">
          <Label className="text-sm font-medium text-muted-foreground">{field.name}</Label>
          <Input
            type="date"
            value={v}
            onChange={(e) =>
              onChange(
                e.target.value
                  ? { type: "date", value: e.target.value }
                  : undefined,
              )
            }
            className="h-7 max-w-80 rounded-md border-0 bg-transparent px-1 shadow-none hover:bg-secondary/50 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      )
    }
    case "dropdown": {
      const v = value && value.type === "dropdown" ? value.value : ""
      return (
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center">
          <Label className="text-sm font-medium text-muted-foreground">{field.name}</Label>
          <select
            value={v}
            onChange={(e) =>
              onChange(
                e.target.value
                  ? { type: "dropdown", value: e.target.value }
                  : undefined,
              )
            }
            className="h-7 max-w-80 rounded-md border-0 bg-transparent px-1 text-sm shadow-none hover:bg-secondary/50 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">—</option>
            {field.options?.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>
      )
    }
    case "multiSelect": {
      const arr = value && value.type === "multiSelect" ? value.value : []
      return (
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-start">
          <Label className="pt-1 text-sm font-medium text-muted-foreground">{field.name}</Label>
          <div className="flex flex-wrap gap-1.5">
            {field.options?.map((o) => {
              const active = arr.includes(o.id)
              return (
                <button
                  type="button"
                  key={o.id}
                  onClick={() => {
                    const next = active
                      ? arr.filter((x) => x !== o.id)
                      : [...arr, o.id]
                    onChange(
                      next.length > 0
                        ? { type: "multiSelect", value: next }
                        : undefined,
                    )
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-foreground hover:bg-secondary",
                  )}
                >
                  {active && <Check className="w-3 h-3 inline mr-1 -mt-0.5" />}
                  {o.label}
                </button>
              )
            })}
          </div>
        </div>
      )
    }
    default: {
      // text, url, email, phone — all single-line strings
      const v =
        value && (value.type === "text" || value.type === "url" || value.type === "email" || value.type === "phone")
          ? value.value
          : ""
      const inputType =
        field.type === "email" ? "email" : field.type === "url" ? "url" : field.type === "phone" ? "tel" : "text"
      return (
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center">
          <Label className="text-sm font-medium text-muted-foreground">{field.name}</Label>
          <Input
            type={inputType}
            value={v}
            onChange={(e) =>
              onChange(
                e.target.value
                  ? ({
                      type: field.type as "text" | "url" | "email" | "phone",
                      value: e.target.value,
                    } as CustomFieldValue)
                  : undefined,
              )
            }
            className="h-7 max-w-80 rounded-md border-0 bg-transparent px-1 shadow-none hover:bg-secondary/50 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      )
    }
  }
}

/** True when a stored CustomFieldValue actually carries a non-empty payload. */
export function hasValue(v: CustomFieldValue | undefined): boolean {
  if (!v) return false
  switch (v.type) {
    case "boolean":
      return v.value === true
    case "multiSelect":
      return Array.isArray(v.value) && v.value.length > 0
    case "number":
      return typeof v.value === "number" && !Number.isNaN(v.value)
    default:
      return typeof v.value === "string" && v.value.trim().length > 0
  }
}

/** True when this contact has any custom-field value worth showing. */
export function hasCustomValuesToShow(
  contact: Contact,
  fields: CustomField[],
): boolean {
  const visible = visibleCustomFieldsFor(contact, fields)
  if (visible.some((f) => hasValue(contact.customValues[f.id]))) return true
  // Orphan values from other groups still count as something to show
  const visibleIds = new Set(visible.map((f) => f.id))
  return fields.some(
    (f) => !visibleIds.has(f.id) && hasValue(contact.customValues[f.id]),
  )
}

function renderReadOnly(field: CustomField, value: CustomFieldValue | undefined) {
  if (!value) return <span className="text-muted-foreground italic">—</span>
  switch (value.type) {
    case "boolean":
      return value.value ? "Yes" : "No"
    case "multiSelect": {
      const labels = (value.value ?? [])
        .map((id) => field.options?.find((o) => o.id === id)?.label ?? id)
      return (
        <div className="flex flex-wrap gap-1">
          {labels.map((l) => (
            <span key={l} className="px-1.5 py-0.5 rounded-full bg-secondary text-xs">
              {l}
            </span>
          ))}
        </div>
      )
    }
    case "dropdown":
      return field.options?.find((o) => o.id === value.value)?.label ?? value.value
    case "date":
      return formatDateString(value.value)
    case "number":
      return String(value.value)
    default:
      return String(value.value ?? "")
  }
}
