"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { Contact, CustomField, CustomFieldValue, Group } from "@/lib/contacts-data"
import { ContactCustomFields } from "@/components/contact-custom-fields"

type ColorClass = { dot: string; bg: string; text: string; ring: string }

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: Group[]
  groupColorClasses: Record<Group["color"], ColorClass>
  customFields: CustomField[]
  onCreate: (contact: Omit<Contact, "id" | "createdAt" | "updatedAt">) => void
}

const empty = {
  firstName: "",
  lastName: "",
  email: "",
  email2: "",
  phone: "",
  phone2: "",
  company: "",
  title: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  zip: "",
  country: "",
  website: "",
  notes: "",
  starred: false,
  tags: [] as string[],
  groupIds: [] as string[],
  customValues: {} as Record<string, CustomFieldValue>,
}

export function NewContactDialog({
  open,
  onOpenChange,
  groups,
  groupColorClasses,
  customFields,
  onCreate,
}: Props) {
  const [form, setForm] = useState(empty)

  function reset() {
    setForm(empty)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.firstName.trim() && !form.lastName.trim()) return
    onCreate(form)
    reset()
    onOpenChange(false)
  }

  function toggleGroup(id: string) {
    setForm((f) =>
      f.groupIds.includes(id)
        ? { ...f, groupIds: f.groupIds.filter((g) => g !== id) }
        : { ...f, groupIds: [...f.groupIds, id] },
    )
  }

  // Build a Contact-shaped object so ContactCustomFields can determine
  // visibility and orphan handling using the same rules as the detail view.
  const formAsContact: Contact = {
    id: "__new__",
    firstName: form.firstName,
    lastName: form.lastName,
    email: form.email,
    email2: form.email2 || undefined,
    phone: form.phone,
    phone2: form.phone2 || undefined,
    company: form.company,
    title: form.title,
    addressLine1: form.addressLine1 || undefined,
    addressLine2: form.addressLine2 || undefined,
    city: form.city,
    zip: form.zip || undefined,
    country: form.country,
    website: form.website,
    notes: form.notes,
    starred: form.starred,
    tags: form.tags,
    groupIds: form.groupIds,
    customValues: form.customValues,
    createdAt: 0,
    updatedAt: 0,
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) reset()
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>New contact</DialogTitle>
            <DialogDescription>Add someone new to your network.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Name
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-xs">
                    First name
                  </Label>
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="mt-1.5"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-xs">
                    Last name
                  </Label>
                  <Input
                    id="lastName"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Contact information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone" className="text-xs">
                    Phone 1 (primary)
                  </Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="phone2" className="text-xs">
                    Phone 2 (secondary)
                  </Label>
                  <Input
                    id="phone2"
                    value={form.phone2}
                    onChange={(e) => setForm({ ...form, phone2: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-xs">
                    Email 1 (primary)
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="email2" className="text-xs">
                    Email 2 (secondary)
                  </Label>
                  <Input
                    id="email2"
                    type="email"
                    value={form.email2}
                    onChange={(e) => setForm({ ...form, email2: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="company" className="text-xs">
                    Company
                  </Label>
                  <Input
                    id="company"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="title" className="text-xs">
                    Title
                  </Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="website" className="text-xs">
                    Website
                  </Label>
                  <Input
                    id="website"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    className="mt-1.5"
                    placeholder="https://"
                  />
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Address
              </h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="addressLine1" className="text-xs">
                    Street address line 1
                  </Label>
                  <Input
                    id="addressLine1"
                    value={form.addressLine1}
                    onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="addressLine2" className="text-xs">
                    Street address line 2
                  </Label>
                  <Input
                    id="addressLine2"
                    value={form.addressLine2}
                    onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
                    className="mt-1.5"
                    placeholder="Apt, suite, building, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="city" className="text-xs">
                    City
                  </Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="zip" className="text-xs">
                    ZIP / Postal code
                  </Label>
                  <Input
                    id="zip"
                    value={form.zip}
                    onChange={(e) => setForm({ ...form, zip: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="country" className="text-xs">
                    Country
                  </Label>
                  <Input
                    id="country"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Notes
              </h3>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="min-h-[80px]"
              />
            </section>

            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Groups
              </h3>
              <div className="flex flex-wrap gap-2">
                {groups.map((g) => {
                  const c = groupColorClasses[g.color]
                  const active = form.groupIds.includes(g.id)
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleGroup(g.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                        active
                          ? cn(c.bg, c.text, "border-transparent")
                          : "border-border text-muted-foreground hover:bg-secondary",
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />
                      {g.name}
                    </button>
                  )
                })}
              </div>
              {customFields.some((f) => !f.isGlobal) && (
                <p className="text-xs text-muted-foreground mt-2">
                  Some custom fields are scoped to specific groups and will appear
                  below once you select the matching group.
                </p>
              )}
              <div className="mt-3 flex items-center gap-2">
                <Checkbox
                  id="starred"
                  checked={form.starred}
                  onCheckedChange={(v) => setForm({ ...form, starred: v === true })}
                />
                <Label htmlFor="starred" className="text-sm font-normal cursor-pointer">
                  Mark as starred
                </Label>
              </div>
            </section>
          </div>

          {customFields.length > 0 && (
            <>
              <Separator />
              <div className="py-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Custom fields
                </h3>
                <ContactCustomFields
                  contact={formAsContact}
                  fields={customFields}
                  onChange={(fieldId, value) => {
                    setForm((prev) => {
                      const next = { ...prev.customValues }
                      if (value === undefined) delete next[fieldId]
                      else next[fieldId] = value
                      return { ...prev, customValues: next }
                    })
                  }}
                />
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create contact</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
