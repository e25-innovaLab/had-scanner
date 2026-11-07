import type { DbShape } from '@/lib/api/types';
import * as browserStore from '@/lib/api/store-browser';

type StoreApi = {
  readDb: () => Promise<DbShape>;
  updateDb: typeof browserStore.updateDb;
};

let activeStore: StoreApi = browserStore;

/** Used by the Node mock server to persist to vera-db.json instead of localStorage. */
export function useMockStore(store: StoreApi) {
  activeStore = store;
}

export function readDb(): Promise<DbShape> {
  return activeStore.readDb();
}

export function updateDb<T>(
  mutator: (db: DbShape) => T,
  options?: { persist?: boolean }
): Promise<T> {
  return activeStore.updateDb(mutator, options);
}
