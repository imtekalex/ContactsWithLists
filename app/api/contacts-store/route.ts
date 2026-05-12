import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"

import {
  createDefaultContactsState,
  normalizeContactsState,
  type ContactsState,
} from "@/lib/contacts-store"

export const runtime = "nodejs"

const dataDirectory = path.join(process.cwd(), "data")
const localDataDirectory = path.join(dataDirectory, "local")
const combinedSampleDataFile = path.join(dataDirectory, "contacts.json")
const combinedLocalDataFile = path.join(localDataDirectory, "contacts.json")

const collectionFiles: Record<keyof ContactsState, string> = {
  contacts: "contacts-collection.json",
  deleted: "deleted-collection.json",
  groups: "groups-collection.json",
  activity: "activity-collection.json",
  customFields: "custom-fields-collection.json",
  lists: "lists-collection.json",
  printPreferences: "print-preferences-collection.json",
}

function collectionDataFile(collection: keyof ContactsState) {
  return path.join(localDataDirectory, collectionFiles[collection])
}

function sampleCollectionDataFile(collection: keyof ContactsState) {
  return path.join(dataDirectory, collectionFiles[collection])
}

async function writeAtomic(filePath: string, contents: string) {
  await mkdir(path.dirname(filePath), { recursive: true })
  const temporaryFile = `${filePath}.tmp`
  await writeFile(temporaryFile, contents, "utf8")

  try {
    await rename(temporaryFile, filePath)
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    if (err.code === "EPERM") {
      await unlink(filePath).catch(() => undefined)
      await rename(temporaryFile, filePath)
      return
    }
    throw error
  }
}

async function writeCollectionFile<K extends keyof ContactsState>(collection: K, data: ContactsState[K]) {
  await writeAtomic(collectionDataFile(collection), `${JSON.stringify(data, null, 2)}\n`)
}

async function writeAllCollectionFiles(state: ContactsState) {
  const collections = Object.keys(collectionFiles) as Array<keyof ContactsState>
  await Promise.all(collections.map((collection) => writeCollectionFile(collection, state[collection])))
}

async function readCollectionFile<K extends keyof ContactsState>(collection: K, fallback: ContactsState[K]): Promise<ContactsState[K]> {
  const filePath = collectionDataFile(collection)
  try {
    const content = await readFile(filePath, "utf8")
    return JSON.parse(content) as ContactsState[K]
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error
    }

    try {
      const sampleContent = await readFile(sampleCollectionDataFile(collection), "utf8")
      return JSON.parse(sampleContent) as ContactsState[K]
    } catch (sampleError) {
      if ((sampleError as NodeJS.ErrnoException).code !== "ENOENT") {
        throw sampleError
      }
      return fallback
    }
  }
}

async function readCombinedStateFile(): Promise<ContactsState> {
  try {
    const content = await readFile(combinedLocalDataFile, "utf8")
    return normalizeContactsState(JSON.parse(content) as Partial<ContactsState>)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error
    }

    const content = await readFile(combinedSampleDataFile, "utf8")
    return normalizeContactsState(JSON.parse(content) as Partial<ContactsState>)
  }
}

async function readContactsState(): Promise<ContactsState> {
  const defaults = createDefaultContactsState()

  try {
    const [contacts, deleted, groups, activity, customFields, lists, printPreferences] = await Promise.all([
      readCollectionFile("contacts", defaults.contacts),
      readCollectionFile("deleted", defaults.deleted),
      readCollectionFile("groups", defaults.groups),
      readCollectionFile("activity", defaults.activity),
      readCollectionFile("customFields", defaults.customFields),
      readCollectionFile("lists", defaults.lists),
      readCollectionFile("printPreferences", defaults.printPreferences),
    ])

    return { contacts, deleted, groups, activity, customFields, lists, printPreferences }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== "ENOENT") {
      throw error
    }

    try {
      const combined = await readCombinedStateFile()
      await writeAllCollectionFiles(combined)
      return combined
    } catch {
      await writeAllCollectionFiles(defaults)
      return defaults
    }
  }
}

type CollectionUpdate = {
  collection: keyof ContactsState
  data: ContactsState[keyof ContactsState]
}

function isCollectionUpdate(value: unknown): value is CollectionUpdate {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { collection?: unknown }).collection === "string" &&
    Object.keys(collectionFiles).includes((value as { collection: string }).collection) &&
    "data" in (value as object)
  )
}

export async function GET() {
  try {
    return NextResponse.json(await readContactsState())
  } catch (error) {
    console.error("Failed to read contacts data", error)
    return NextResponse.json({ error: "Failed to read contacts data" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const payload = await request.json()

    if (isCollectionUpdate(payload)) {
      await writeCollectionFile(payload.collection, payload.data)
      return NextResponse.json({ ok: true })
    }

    const state = normalizeContactsState(payload as Partial<ContactsState>)
    await writeAllCollectionFiles(state)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Failed to write contacts data", error)
    return NextResponse.json({ error: "Failed to write contacts data" }, { status: 500 })
  }
}
