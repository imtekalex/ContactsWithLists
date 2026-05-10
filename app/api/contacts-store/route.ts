import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"

import {
  createDefaultContactsState,
  normalizeContactsState,
  type ContactsState,
} from "@/lib/contacts-store"

export const runtime = "nodejs"

const dataDirectory = path.join(process.cwd(), "data")
const dataFile = path.join(dataDirectory, "contacts.json")
const temporaryDataFile = path.join(dataDirectory, "contacts.json.tmp")

async function writeContactsFile(state: ContactsState) {
  await mkdir(dataDirectory, { recursive: true })
  await writeFile(temporaryDataFile, `${JSON.stringify(state, null, 2)}\n`, "utf8")
  await rename(temporaryDataFile, dataFile)
}

async function readContactsFile(): Promise<ContactsState> {
  try {
    const content = await readFile(dataFile, "utf8")
    return normalizeContactsState(JSON.parse(content) as Partial<ContactsState>)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== "ENOENT") {
      throw error
    }

    const defaults = createDefaultContactsState()
    await writeContactsFile(defaults)
    return defaults
  }
}

export async function GET() {
  try {
    return NextResponse.json(await readContactsFile())
  } catch (error) {
    console.error("Failed to read contacts data file", error)
    return NextResponse.json({ error: "Failed to read contacts data file" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const state = normalizeContactsState((await request.json()) as Partial<ContactsState>)
    await writeContactsFile(state)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Failed to write contacts data file", error)
    return NextResponse.json({ error: "Failed to write contacts data file" }, { status: 500 })
  }
}
