"use client"

import { useEffect, useRef, useState } from "react"
import {
  Mail,
  Phone,
  Building2,
  Globe,
  Briefcase,
  Star,
  Pencil,
  Trash2,
  X,
  Save,
  Tag,
  Home,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { Contact, CustomField, CustomFieldValue, Group } from "@/lib/contacts-data"
import { ContactCustomFields, hasCustomValuesToShow } from "@/components/contact-custom-fields"

type ColorClass = { dot: string; bg: string; text: string; ring: string }

interface Props {
  contact: Contact
  groups: Group[]
  groupColorClasses: Record<Group["color"], ColorClass>
  customFields: CustomField[]
  onUpdate: (contact: Contact) => void
  onDelete: (id: string) => void
  onToggleStar: (id: string) => void
}

export function ContactDetail({
  contact,
  groups,
  groupColorClasses,
  customFields,
  onUpdate,
  onDelete,
  onToggleStar,
}: Props) {
  function handleCustomChange(fieldId: string, value: CustomFieldValue | undefined) {
    const nextValues = { ...contact.customValues }
    if (value === undefined) {
      delete nextValues[fieldId]
    } else {
      nextValues[fieldId] = value
    }
    onUpdate({ ...contact, customValues: nextValues })
  }
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Contact>(contact)
  const [dirty, setDirty] = useState(false)
  const previousContactId = useRef(contact.id)

  useEffect(() => {
    const isNewContact = contact.id !== previousContactId.current

    if (dirty && isNewContact) {
      onUpdate(draft)
      setDirty(false)
    }

    if (isNewContact) {
      setDraft(contact)
      setEditing(false)
      setDirty(false)
    } else if (!editing) {
      setDraft(contact)
    }

    previousContactId.current = contact.id
  }, [contact, editing, dirty, draft, onUpdate])

  useEffect(() => {
    if (!editing || !dirty) return

    const timeoutId = window.setTimeout(() => {
      onUpdate(draft)
      setDirty(false)
    }, 700)

    return () => window.clearTimeout(timeoutId)
  }, [draft, editing, dirty, onUpdate])

  function updateDraft(next: Contact) {
    setDraft(next)
    setDirty(true)
  }

  function save() {
    if (dirty) {
      onUpdate(draft)
      setDirty(false)
    }
    setEditing(false)
  }

  function cancel() {
    setDraft(contact)
    setDirty(false)
    setEditing(false)
  }

  return (
    <div className="h-full">
      {/* Header */}
      <header className="px-8 py-6 border-b border-border">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-lg font-semibold text-secondary-foreground flex-shrink-0">
            {(contact.firstName[0] ?? "") + (contact.lastName[0] ?? "")}
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex gap-2">
                <Input
                  value={draft.firstName}
                  onChange={(e) => updateDraft({ ...draft, firstName: e.target.value })}
                  className="text-lg font-semibold h-10"
                  placeholder="First name"
                />
                <Input
                  value={draft.lastName}
                  onChange={(e) => updateDraft({ ...draft, lastName: e.target.value })}
                  className="text-lg font-semibold h-10"
                  placeholder="Last name"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-semibold tracking-tight">
                  {contact.firstName} {contact.lastName}
                </h2>
                <button
                  onClick={() => onToggleStar(contact.id)}
                  className="text-muted-foreground hover:text-amber-400 transition-colors"
                  aria-label={contact.starred ? "Unstar contact" : "Star contact"}
                >
                  <Star className={cn("w-5 h-5", contact.starred && "fill-amber-400 text-amber-400")} />
                </button>
              </div>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {contact.title && <span>{contact.title}</span>}
              {contact.title && contact.company && <span aria-hidden>·</span>}
              {contact.company && <span>{contact.company}</span>}
            </div>
            {groups.length > 0 && !editing && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {groups.map((g) => {
                  const c = groupColorClasses[g.color]
                  return (
                    <span
                      key={g.id}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
                        c.bg,
                        c.text,
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />
                      {g.name}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {editing ? (
              <>
                <Button size="sm" variant="outline" onClick={cancel} className="gap-1.5">
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </Button>
                <Button size="sm" onClick={save} className="gap-1.5">
                  <Save className="w-3.5 h-3.5" />
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-1.5">
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(contact.id)}
                  className="gap-1.5 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="px-8 py-6 space-y-6">
        {editing ? (
          <>
            <EditFields draft={draft} setDraft={updateDraft} />
            <Separator />
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Custom fields
              </h3>
              <ContactCustomFields
                contact={draft}
                fields={customFields}
                onChange={(fieldId, value) => {
                  const next = { ...draft.customValues }
                  if (value === undefined) delete next[fieldId]
                  else next[fieldId] = value
                  updateDraft({ ...draft, customValues: next })
                }}
              />
            </section>
          </>
        ) : (
          <>
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Contact information
              </h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Field
                  icon={Phone}
                  label="Phone 1"
                  value={contact.phone}
                  href={contact.phone ? `tel:${contact.phone}` : undefined}
                />
                <Field
                  icon={Phone}
                  label="Phone 2"
                  value={contact.phone2 ?? ""}
                  href={contact.phone2 ? `tel:${contact.phone2}` : undefined}
                />
                <Field
                  icon={Mail}
                  label="Email 1"
                  value={contact.email}
                  href={contact.email ? `mailto:${contact.email}` : undefined}
                />
                <Field
                  icon={Mail}
                  label="Email 2"
                  value={contact.email2 ?? ""}
                  href={contact.email2 ? `mailto:${contact.email2}` : undefined}
                />
                <Field icon={Building2} label="Company" value={contact.company} />
                <Field icon={Briefcase} label="Title" value={contact.title} />
                <Field
                  icon={Globe}
                  label="Website"
                  value={contact.website}
                  href={contact.website || undefined}
                />
              </dl>
            </section>

            {(contact.addressLine1 || contact.addressLine2 || contact.city || contact.zip || contact.country) && (
              <>
                <Separator />
                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Address
                  </h3>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                      <Home className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <address className="not-italic text-sm leading-relaxed">
                      {contact.addressLine1 && <div>{contact.addressLine1}</div>}
                      {contact.addressLine2 && <div>{contact.addressLine2}</div>}
                      {(contact.city || contact.zip) && (
                        <div>
                          {contact.city}
                          {contact.city && contact.zip ? " " : ""}
                          {contact.zip}
                        </div>
                      )}
                      {contact.country && <div>{contact.country}</div>}
                    </address>
                  </div>
                </section>
              </>
            )}

            {contact.tags.length > 0 && (
              <>
                <Separator />
                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {contact.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1 font-normal">
                        <Tag className="w-3 h-3" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </section>
              </>
            )}

            {hasCustomValuesToShow(contact, customFields) && (
              <>
                <Separator />
                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Custom fields
                  </h3>
                  <ContactCustomFields
                    contact={contact}
                    fields={customFields}
                    onChange={handleCustomChange}
                    readOnly
                  />
                </section>
              </>
            )}

            {contact.notes && (
              <>
                <Separator />
                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Notes</h3>
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{contact.notes}</p>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Field({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  href?: string
}) {
  return (
    <div className="flex items-start gap-3 min-w-0">
      <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="text-sm font-medium mt-0.5 truncate">
          {href && value ? (
            <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="hover:underline">
              {value}
            </a>
          ) : (
            value || <span className="text-muted-foreground font-normal">Not provided</span>
          )}
        </dd>
      </div>
    </div>
  )
}

function EditFields({
  draft,
  setDraft,
}: {
  draft: Contact
  setDraft: (c: Contact) => void
}) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Contact information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <FieldInput
            label="Phone 1 (primary)"
            value={draft.phone}
            onChange={(v) => setDraft({ ...draft, phone: v })}
          />
          <FieldInput
            label="Phone 2 (secondary)"
            value={draft.phone2 ?? ""}
            onChange={(v) => setDraft({ ...draft, phone2: v })}
          />
          <FieldInput
            label="Email 1 (primary)"
            value={draft.email}
            onChange={(v) => setDraft({ ...draft, email: v })}
          />
          <FieldInput
            label="Email 2 (secondary)"
            value={draft.email2 ?? ""}
            onChange={(v) => setDraft({ ...draft, email2: v })}
          />
          <FieldInput
            label="Company"
            value={draft.company}
            onChange={(v) => setDraft({ ...draft, company: v })}
          />
          <FieldInput
            label="Title"
            value={draft.title}
            onChange={(v) => setDraft({ ...draft, title: v })}
          />
          <div className="col-span-2">
            <FieldInput
              label="Website"
              value={draft.website}
              onChange={(v) => setDraft({ ...draft, website: v })}
            />
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Address
        </h3>
        <div className="space-y-3">
          <FieldInput
            label="Street address line 1"
            value={draft.addressLine1 ?? ""}
            onChange={(v) => setDraft({ ...draft, addressLine1: v })}
          />
          <FieldInput
            label="Street address line 2"
            value={draft.addressLine2 ?? ""}
            onChange={(v) => setDraft({ ...draft, addressLine2: v })}
          />
          <FieldInput
            label="City"
            value={draft.city}
            onChange={(v) => setDraft({ ...draft, city: v })}
          />
          <FieldInput
            label="ZIP / Postal code"
            value={draft.zip ?? ""}
            onChange={(v) => setDraft({ ...draft, zip: v })}
          />
          <FieldInput
            label="Country"
            value={draft.country}
            onChange={(v) => setDraft({ ...draft, country: v })}
          />
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Tags &amp; notes
        </h3>
        <div className="space-y-3">
          <FieldInput
            label="Tags (comma separated)"
            value={draft.tags.join(", ")}
            onChange={(v) =>
              setDraft({
                ...draft,
                tags: v
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
          />
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              className="mt-1.5 min-h-[100px]"
            />
          </div>
        </div>
      </section>
    </div>
  )
}

function FieldInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1.5" />
    </div>
  )
}
