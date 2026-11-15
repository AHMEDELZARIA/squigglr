// M23 Storage. The only file that touches localStorage. Every other module
// saves and reads through these four functions, so moving to a hosted
// database (Supabase, in the Development Plan) changes only this file.

export type Kind = "learner" | "settings" | "lessonRecord" | "attempt" | "active";

interface Item<T> {
  id: string;
  owner: string | null; // the learner the item belongs to, or null
  value: T;
}

const PREFIX = "squigglr:v1";
const key = (kind: Kind, id: string) => `${PREFIX}:${kind}:${id}`;

// On the server (and in unit tests) there is no localStorage; use memory.
const memory = new Map<string, string>();
const store = {
  get: (k: string) => (typeof localStorage === "undefined" ? (memory.get(k) ?? null) : localStorage.getItem(k)),
  set: (k: string, v: string) => (typeof localStorage === "undefined" ? void memory.set(k, v) : localStorage.setItem(k, v)),
  remove: (k: string) => (typeof localStorage === "undefined" ? void memory.delete(k) : localStorage.removeItem(k)),
  keys: () =>
    typeof localStorage === "undefined"
      ? [...memory.keys()]
      : Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!),
};

export function get<T>(kind: Kind, id: string): T | null {
  const raw = store.get(key(kind, id));
  return raw === null ? null : (JSON.parse(raw) as Item<T>).value;
}

/**
 * Saves an item, creating or replacing it. A saved attempt is never replaced
 * (FR-REC-009): saving the same attempt again changes nothing, and saving a
 * different one under the same id is refused.
 */
export function put<T>(kind: Kind, id: string, value: T, owner: string | null = null): void {
  const next = JSON.stringify({ id, owner, value } satisfies Item<T>);
  if (kind === "attempt") {
    const existing = store.get(key(kind, id));
    if (existing !== null) {
      if (existing === next) return;
      throw new Error("unchangeable");
    }
  }
  store.set(key(kind, id), next);
}

/** Every item of a kind, or only those of one learner. */
export function list<T>(kind: Kind, owner?: string): T[] {
  const start = `${PREFIX}:${kind}:`;
  return store
    .keys()
    .filter((k) => k.startsWith(start))
    .map((k) => JSON.parse(store.get(k)!) as Item<T>)
    .filter((item) => owner === undefined || item.owner === owner)
    .map((item) => item.value);
}

export function remove(kind: Kind, id: string): void {
  store.remove(key(kind, id));
}

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
