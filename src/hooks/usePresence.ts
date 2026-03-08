"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  joinPresence,
  subscribePresence,
  updatePresenceCell,
} from "@/lib/firebase/presence";
import type { PresenceEntry, UserProfile } from "@/types";

export function usePresence(
  docId: string,
  user: UserProfile | null,
  onPresenceChange: (entries: PresenceEntry[]) => void
) {
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!docId || !user) return;

    // Join presence
    const leavePresence = joinPresence(docId, {
      uid: user.uid,
      displayName: user.displayName,
      color: user.color,
      photoURL: user.photoURL,
      selectedCell: null,
    });

    // Subscribe to presence updates
    const unsubscribe = subscribePresence(docId, onPresenceChange);

    cleanupRef.current = () => {
      leavePresence();
      unsubscribe();
    };

    return () => {
      leavePresence();
      unsubscribe();
    };
  }, [docId, user, onPresenceChange]);

  const updateCell = useCallback(
    (cellId: string | null) => {
      if (!user) return;
      updatePresenceCell(docId, user.uid, cellId);
    },
    [docId, user]
  );

  return { updateCell };
}
