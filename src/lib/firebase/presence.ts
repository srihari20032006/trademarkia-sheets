import {
  ref,
  set,
  onDisconnect,
  onValue,
  off,
  serverTimestamp,
} from "firebase/database";
import { rtdb } from "./config";
import type { PresenceEntry } from "@/types";

export function joinPresence(
  docId: string,
  user: Omit<PresenceEntry, "lastSeen">
): () => void {
  const presenceRef = ref(rtdb, `presence/${docId}/${user.uid}`);

  const entry: Omit<PresenceEntry, "lastSeen"> & { lastSeen: object } = {
    ...user,
    lastSeen: serverTimestamp(),
  };

  set(presenceRef, entry);

  // Auto-remove on disconnect
  onDisconnect(presenceRef).remove();

  // Return cleanup fn
  return () => {
    set(presenceRef, null);
    onDisconnect(presenceRef).cancel();
  };
}

export function updatePresenceCell(
  docId: string,
  uid: string,
  selectedCell: string | null
): void {
  const cellRef = ref(rtdb, `presence/${docId}/${uid}/selectedCell`);
  set(cellRef, selectedCell);

  const tsRef = ref(rtdb, `presence/${docId}/${uid}/lastSeen`);
  set(tsRef, serverTimestamp());
}

export function subscribePresence(
  docId: string,
  callback: (entries: PresenceEntry[]) => void
): () => void {
  const presenceRef = ref(rtdb, `presence/${docId}`);

  const handler = onValue(presenceRef, (snap) => {
    const data = snap.val() as Record<string, PresenceEntry> | null;
    if (!data) {
      callback([]);
      return;
    }
    // Filter stale entries (>30s old)
    const now = Date.now();
    const alive = Object.values(data).filter(
      (e) => now - (e.lastSeen ?? 0) < 30_000
    );
    callback(alive);
  });

  return () => off(presenceRef, "value", handler);
}
