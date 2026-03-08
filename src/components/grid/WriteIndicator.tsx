"use client";

import type { WriteState } from "@/types";

interface Props {
  state: WriteState;
}

export function WriteIndicator({ state }: Props) {
  if (state === "idle") return null;

  const config = {
    pending: {
      label: "Saving…",
      color: "text-gray-400",
      dot: "bg-yellow-400 saving-indicator",
    },
    saved: {
      label: "Saved",
      color: "text-green-600",
      dot: "bg-green-500",
    },
    error: {
      label: "Error saving",
      color: "text-red-500",
      dot: "bg-red-500",
    },
  }[state];

  return (
    <div className={`flex items-center gap-1.5 text-xs ${config.color} animate-fade-in`}>
      <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </div>
  );
}
