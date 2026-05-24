import {
  initialActivity,
  initialContacts,
  initialCustomFields,
  initialDeleted,
  initialEventOccurrences,
  initialEventSeries,
  initialGroups,
  initialParticipations,
  initialLists,
  type ActivityEntry,
  type Contact,
  type ContactList,
  type CustomField,
  type EventOccurrence,
  type EventParticipation,
  type EventSeries,
  type Group,
} from "@/lib/contacts-data"

const CONTACTS_STORE_ENDPOINT = "/api/contacts-store"

export type EnvelopeAddressLayout = "european" | "usa"
export type PrintType = "standard" | "label" | "envelope"
export type ReturnAddressKind = "business" | "personal"

export type ReturnAddress = {
  company?: string
  firstName: string
  lastName: string
  street: string
  city: string
  state?: string
  zip: string
  country: string
}

export type PrintPreferences = {
  printType: PrintType
  addressLayout: EnvelopeAddressLayout
  returnAddressPreset: ReturnAddressKind
  returnAddresses: Record<ReturnAddressKind, ReturnAddress>
}

export type ContactsState = {
  contacts: Contact[]
  deleted: Contact[]
  groups: Group[]
  activity: ActivityEntry[]
  customFields: CustomField[]
  lists: ContactList[]
  eventSeries: EventSeries[]
  eventOccurrences: EventOccurrence[]
  participations: EventParticipation[]
  printPreferences: PrintPreferences
}

export type ContactsCollectionKey = keyof ContactsState

function normalizeCustomFields(fields: CustomField[]): CustomField[] {
  // Keep all custom fields; no automatic promotion of birthday/nickname
  return fields
}

function normalizeContact(contact: Contact): Contact {
  const customValues = { ...(contact.customValues ?? {}) }
  // Do not promote custom fields into top-level contact properties.
  const birthday = contact.birthday
  const nickname = contact.nickname

  const emails = normalizeLabeledValues(contact.emails, [
    { id: "email_primary", label: "Work", value: contact.email },
    { id: "email_secondary", label: "Private", value: contact.email2 ?? "" },
  ])
  const phones = normalizeLabeledValues(contact.phones, [
    { id: "phone_primary", label: "Mobile", value: contact.phone },
    { id: "phone_secondary", label: "Work", value: contact.phone2 ?? "" },
  ])
  const websites = normalizeLabeledValues(contact.websites, [
    { id: "website_primary", label: "Website", value: contact.website },
  ])
  const addresses =
    contact.addresses && contact.addresses.length > 0
      ? contact.addresses.filter(hasAddressValue)
      : hasAddress(contact)
        ? [
            {
              id: "address_primary",
              label: "Home",
              addressLine1: contact.addressLine1,
              addressLine2: contact.addressLine2,
              city: contact.city,
              state: contact.state,
              zip: contact.zip,
              country: contact.country,
            },
          ]
        : []
  const primaryAddress = addresses[0]

  return {
    ...contact,
    birthday,
    nickname,
    emails,
    email: emails[0]?.value ?? "",
    email2: emails[1]?.value || undefined,
    phones,
    phone: phones[0]?.value ?? "",
    phone2: phones[1]?.value || undefined,
    websites,
    website: websites[0]?.value ?? "",
    addresses,
    addressLine1: primaryAddress?.addressLine1,
    addressLine2: primaryAddress?.addressLine2,
    city: primaryAddress?.city ?? "",
    state: primaryAddress?.state ?? "",
    zip: primaryAddress?.zip,
    country: primaryAddress?.country ?? "",
    // legacy date/relationship fields intentionally omitted
    customValues,
  }
}

function normalizeLabeledValues(
  existing: Contact["emails"] | Contact["phones"] | Contact["websites"] | undefined,
  fallback: NonNullable<Contact["emails"]>,
) {
  const source = existing && existing.length > 0 ? existing : fallback
  return source.filter((item) => item.value.trim().length > 0)
}

function hasAddress(contact: Contact) {
  return Boolean(contact.addressLine1 || contact.addressLine2 || contact.city || contact.state || contact.zip || contact.country)
}

function hasAddressValue(item: NonNullable<Contact["addresses"]>[number]) {
  return Boolean(item.addressLine1 || item.addressLine2 || item.city || item.state || item.zip || item.country)
}

function hasDateValue(item: ContactDate) {
  return Boolean(item.month || item.day || item.year)
}

function dateStringToParts(value: string) {
  const parts = value.split("-")
  if (parts.length === 2) return { month: parts[0] ?? "", day: parts[1] ?? "", year: undefined }
  const [year, month, day] = parts
  return { month: month ?? "", day: day ?? "", year: year || undefined }
}

function datePartsToString(value: { month: string; day: string; year?: string }) {
  const month = value.month.padStart(2, "0")
  const day = value.day.padStart(2, "0")
  return value.year ? `${value.year}-${month}-${day}` : `${month}-${day}`
}

export function createDefaultContactsState(): ContactsState {
  return {
    contacts: initialContacts,
    deleted: initialDeleted,
    groups: initialGroups,
    activity: initialActivity,
    customFields: initialCustomFields,
    lists: initialLists,
    eventSeries: initialEventSeries,
    eventOccurrences: initialEventOccurrences,
    participations: initialParticipations,
    printPreferences: {
      printType: "standard",
      addressLayout: "european",
      returnAddressPreset: "business",
      returnAddresses: {
        business: {
          company: "",
          firstName: "",
          lastName: "",
          street: "",
          city: "",
          state: "",
          zip: "",
          country: "",
        },
        personal: {
          firstName: "",
          lastName: "",
          street: "",
          city: "",
          state: "",
          zip: "",
          country: "",
        },
      },
    },
  }
}

export function normalizeContactsState(input: Partial<ContactsState> | null | undefined): ContactsState {
  const defaults = createDefaultContactsState()

  return {
    contacts: Array.isArray(input?.contacts)
      ? input.contacts.map(normalizeContact)
      : defaults.contacts.map(normalizeContact),
    deleted: Array.isArray(input?.deleted)
      ? input.deleted.map(normalizeContact)
      : defaults.deleted.map(normalizeContact),
    groups: Array.isArray(input?.groups) ? input.groups : defaults.groups,
    activity: Array.isArray(input?.activity) ? input.activity : defaults.activity,
    customFields: normalizeCustomFields(
      Array.isArray(input?.customFields) ? input.customFields : defaults.customFields,
    ),
    lists: Array.isArray(input?.lists) ? input.lists : defaults.lists,
    eventSeries: Array.isArray(input?.eventSeries) ? input.eventSeries : defaults.eventSeries,
    eventOccurrences: Array.isArray(input?.eventOccurrences) ? input.eventOccurrences : defaults.eventOccurrences,
    participations: Array.isArray(input?.participations) ? input.participations : defaults.participations,
    printPreferences:
      input?.printPreferences && typeof input.printPreferences === "object"
        ? {
            ...defaults.printPreferences,
            ...input.printPreferences,
            returnAddresses: {
              ...defaults.printPreferences.returnAddresses,
              ...(input.printPreferences as Partial<PrintPreferences>).returnAddresses,
            },
          }
        : defaults.printPreferences,
  }
}

export async function loadContactsState(): Promise<ContactsState> {
  const response = await fetch(CONTACTS_STORE_ENDPOINT, {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Failed to load contacts data: ${response.status}`)
  }

  return normalizeContactsState(await response.json())
}

export async function saveContactsState(state: ContactsState): Promise<void> {
  const response = await fetch(CONTACTS_STORE_ENDPOINT, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(normalizeContactsState(state)),
  })

  if (!response.ok) {
    throw new Error(`Failed to save contacts data: ${response.status}`)
  }
}

export async function saveContactsCollection<K extends ContactsCollectionKey>(
  collection: K,
  data: ContactsState[K],
): Promise<void> {
  const response = await fetch(CONTACTS_STORE_ENDPOINT, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ collection, data }),
  })

  if (!response.ok) {
    throw new Error(`Failed to save ${collection}: ${response.status}`)
  }
}
