import {
  initialActivity,
  initialContacts,
  initialCustomFields,
  initialDeleted,
  initialGroups,
  initialLists,
  type ActivityEntry,
  type Contact,
  type ContactList,
  type CustomField,
  type Group,
} from "@/lib/contacts-data"

const CONTACTS_STORE_ENDPOINT = "/api/contacts-store"

export type ContactsState = {
  contacts: Contact[]
  deleted: Contact[]
  groups: Group[]
  activity: ActivityEntry[]
  customFields: CustomField[]
  lists: ContactList[]
}

export type ContactsCollectionKey = keyof ContactsState

export function createDefaultContactsState(): ContactsState {
  return {
    contacts: initialContacts,
    deleted: initialDeleted,
    groups: initialGroups,
    activity: initialActivity,
    customFields: initialCustomFields,
    lists: initialLists,
  }
}

export function normalizeContactsState(input: Partial<ContactsState> | null | undefined): ContactsState {
  const defaults = createDefaultContactsState()

  return {
    contacts: Array.isArray(input?.contacts) ? input.contacts : defaults.contacts,
    deleted: Array.isArray(input?.deleted) ? input.deleted : defaults.deleted,
    groups: Array.isArray(input?.groups) ? input.groups : defaults.groups,
    activity: Array.isArray(input?.activity) ? input.activity : defaults.activity,
    customFields: Array.isArray(input?.customFields) ? input.customFields : defaults.customFields,
    lists: Array.isArray(input?.lists) ? input.lists : defaults.lists,
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
