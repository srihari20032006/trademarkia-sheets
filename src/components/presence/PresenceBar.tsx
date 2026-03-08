"use client";

import type { PresenceEntry } from "@/types";

interface Props {
  entries: PresenceEntry[];
  currentUid: string;
}

export function PresenceBar({ entries, currentUid }: Props) {
  const others = entries.filter((e) => e.uid !== currentUid);
  if (others.length === 0) return null;

  const MAX_SHOWN = 5;
  const shown = others.slice(0, MAX_SHOWN);
  const overflow = others.length - MAX_SHOWN;

  return (
    <div className="flex items-center gap-1" title="Active collaborators">
      {shown.map((entry, i) => (
        <div
          key={entry.uid}
          className="flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold border-2 border-white shadow-sm transition-all"
          style={{
            backgroundColor: entry.color,
            marginLeft: i > 0 ? "-6px" : 0,
            zIndex: MAX_SHOWN - i,
          }}
          title={`${entry.displayName}${entry.selectedCell ? ` — ${entry.selectedCell}` : ""}`}
        >
          {entry.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={entry.photoURL}
              alt={entry.displayName}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            entry.displayName.charAt(0).toUpperCase()
          )}
        </div>
      ))}
      {overflow > 0 && (
        <div
          className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-200 text-gray-600 text-xs font-bold border-2 border-white shadow-sm"
          style={{ marginLeft: "-6px", zIndex: 0 }}
          title={`${overflow} more user${overflow > 1 ? "s" : ""}`}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
