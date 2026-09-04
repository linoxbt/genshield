"use client";

/**
 * A write that has been signed and broadcast but has not yet reached a
 * terminal state.
 *
 * Every transfer in this contract executes at finalization, not acceptance,
 * so the window between broadcast and finality is one in which real money has
 * not moved yet. Losing the hash in that window — a reload, a closed tab, a
 * dropped connection — leaves the user with no way to find out what happened
 * to their money. Persisting it means the page can pick the transaction back
 * up and report its actual outcome instead of forgetting it existed.
 */
export type PendingTx = {
  hash: string;
  method: string;
  startedAt: number;
};

const KEY = "genshield-pending-tx";

function read(): PendingTx[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingTx[]) : [];
  } catch {
    return []; // private mode, disabled storage, corrupt value
  }
}

function write(list: PendingTx[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage being unavailable must never break the write itself.
  }
}

export function recordPending(hash: string, method: string): void {
  const list = read().filter((t) => t.hash !== hash);
  list.push({ hash, method, startedAt: Date.now() });
  write(list);
}

export function clearPending(hash: string): void {
  write(read().filter((t) => t.hash !== hash));
}

export function listPending(): PendingTx[] {
  return read();
}
