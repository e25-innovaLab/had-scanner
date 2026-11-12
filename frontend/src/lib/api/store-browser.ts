import type { DbShape } from '@/lib/api/types';

const STORAGE_KEY = 'vera-mock-db';

const EMPTY_DB: DbShape = {
  analyses: [],
  barriers: [],
  proposals: [],
};

let writeChain: Promise<unknown> = Promise.resolve();
let memoryCache: { raw: string; db: DbShape } | null = null;

function parseDb(raw: string): DbShape {
  try {
    const parsed = JSON.parse(raw) as DbShape;
    return {
      analyses: parsed.analyses ?? [],
      barriers: parsed.barriers ?? [],
      proposals: parsed.proposals ?? [],
    };
  } catch {
    return structuredClone(EMPTY_DB);
  }
}

function readRaw(): string {
  if (typeof window === 'undefined') {
    return JSON.stringify(EMPTY_DB);
  }
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? JSON.stringify(EMPTY_DB);
  } catch {
    return JSON.stringify(EMPTY_DB);
  }
}

function writeRaw(raw: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    // ignore quota / private mode
  }
}

export async function readDb(): Promise<DbShape> {
  const raw = readRaw();
  if (memoryCache?.raw === raw) {
    return structuredClone(memoryCache.db);
  }
  const db = parseDb(raw);
  memoryCache = { raw, db: structuredClone(db) };
  return db;
}

async function writeDb(db: DbShape) {
  const raw = JSON.stringify(db);
  writeRaw(raw);
  memoryCache = { raw, db: structuredClone(db) };
}

type UpdateOptions = {
  persist?: boolean;
};

export function updateDb<T>(
  mutator: (db: DbShape) => T,
  options: UpdateOptions = {}
): Promise<T> {
  const persist = options.persist !== false;
  const run = writeChain.then(async () => {
    const db = await readDb();
    const before = persist ? JSON.stringify(db) : '';
    const result = mutator(db);
    if (persist) {
      const after = JSON.stringify(db);
      if (before !== after) {
        await writeDb(db);
      } else {
        memoryCache = {
          raw: before,
          db: structuredClone(db),
        };
      }
    }
    return result;
  });
  writeChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}
