import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import type { DbShape } from "@/lib/api/types"

const DB_PATH =
  process.env.VERA_DB_PATH ??
  path.join(process.cwd(), "data", "vera-db.json")

const EMPTY_DB: DbShape = {
  analyses: [],
  barriers: [],
  proposals: [],
}

let writeChain: Promise<unknown> = Promise.resolve()
let memoryCache: { path: string; raw: string; db: DbShape } | null = null

async function ensureDbFile() {
  await mkdir(path.dirname(DB_PATH), { recursive: true })
  try {
    await readFile(DB_PATH, "utf8")
  } catch {
    await writeFile(DB_PATH, JSON.stringify(EMPTY_DB, null, 2), "utf8")
  }
}

function parseDb(raw: string): DbShape {
  try {
    const parsed = JSON.parse(raw) as DbShape
    return {
      analyses: parsed.analyses ?? [],
      barriers: parsed.barriers ?? [],
      proposals: parsed.proposals ?? [],
    }
  } catch {
    return structuredClone(EMPTY_DB)
  }
}

export async function readDb(): Promise<DbShape> {
  await ensureDbFile()
  const raw = await readFile(DB_PATH, "utf8")
  if (memoryCache?.path === DB_PATH && memoryCache.raw === raw) {
    return structuredClone(memoryCache.db)
  }
  const db = parseDb(raw)
  memoryCache = { path: DB_PATH, raw, db: structuredClone(db) }
  return db
}

async function writeDb(db: DbShape) {
  await ensureDbFile()
  const raw = JSON.stringify(db, null, 2)
  await writeFile(DB_PATH, raw, "utf8")
  memoryCache = { path: DB_PATH, raw, db: structuredClone(db) }
}

type UpdateOptions = {
  persist?: boolean
}

export function updateDb<T>(
  mutator: (db: DbShape) => T,
  options: UpdateOptions = {}
): Promise<T> {
  const persist = options.persist !== false
  const run = writeChain.then(async () => {
    const db = await readDb()
    const before = persist ? JSON.stringify(db) : ""
    const result = mutator(db)
    if (persist) {
      const after = JSON.stringify(db)
      if (before !== after) {
        await writeDb(db)
      } else {
        memoryCache = {
          path: DB_PATH,
          raw: before,
          db: structuredClone(db),
        }
      }
    }
    return result
  })
  writeChain = run.then(
    () => undefined,
    () => undefined
  )
  return run
}
