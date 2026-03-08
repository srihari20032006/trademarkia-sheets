"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import type { CellData, CellId, PresenceEntry } from "@/types";

interface Props {
  cellId: CellId;
  data: CellData | undefined;
  isSelected: boolean;
  isEditing: boolean;
  presence: PresenceEntry[] | undefined;
  gridCol: number;
  gridRow: number;
  onSelect: (cellId: CellId) => void;
  onStartEdit: (cellId: CellId) => void;
  onCommit: (value: string) => void;
  onAbort: () => void;
}

export function Cell({
  cellId,
  data,
  isSelected,
  isEditing,
  presence,
  gridCol,
  gridRow,
  onSelect,
  onStartEdit,
  onCommit,
  onAbort,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [editValue, setEditValue] = useState("");

  // When editing starts, populate with raw value
  useEffect(() => {
    if (isEditing) {
      setEditValue(data?.value ?? "");
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isEditing, data?.value]);

  const handleDoubleClick = useCallback(() => {
    onStartEdit(cellId);
  }, [cellId, onStartEdit]);

  const handleClick = useCallback(() => {
    onSelect(cellId);
  }, [cellId, onSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        onCommit(editValue);
      } else if (e.key === "Escape") {
        onAbort();
      } else if (e.key === "Tab") {
        e.preventDefault();
        onCommit(editValue);
      }
    },
    [editValue, onCommit, onAbort]
  );

  // Display value: show computed if formula, else raw
  const displayValue =
    data?.computed !== undefined ? data.computed : data?.value ?? "";

  const isFormula = data?.value?.startsWith("=");
  const isError = displayValue?.startsWith("#");

  const fmt = data?.format ?? {};

  return (
    <div
      style={{
        gridColumn: gridCol,
        gridRow: gridRow,
        position: "relative",
      }}
      className={`border-b border-r border-sheet-border overflow-hidden
        ${isSelected ? "cell-selected" : ""}
        ${isError ? "text-red-600" : ""}
      `}
    >
      {/* Presence indicator */}
      {presence && presence.length > 0 && (
        <div
          className="absolute top-0 right-0 w-0 h-0 z-10"
          style={{
            borderTop: `8px solid ${presence[0].color}`,
            borderLeft: "8px solid transparent",
          }}
          title={presence.map((p) => p.displayName).join(", ")}
        />
      )}

      {isEditing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => onCommit(editValue)}
          className="cell-input"
          style={{
            fontWeight: fmt.bold ? "bold" : undefined,
            fontStyle: fmt.italic ? "italic" : undefined,
            color: fmt.color ?? "#1f2937",
            backgroundColor: fmt.bgColor ?? "white",
            textAlign: fmt.align ?? "left",
            fontSize: fmt.fontSize ? `${fmt.fontSize}px` : "13px",
          }}
          spellCheck={false}
        />
      ) : (
        <div
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          className="w-full h-full px-1 flex items-center overflow-hidden cursor-default"
          style={{
            fontWeight: fmt.bold ? "bold" : undefined,
            fontStyle: fmt.italic ? "italic" : undefined,
            color: isError ? "#dc2626" : fmt.color ?? "#1f2937",
            backgroundColor:
              isSelected
                ? (fmt.bgColor ?? "transparent")
                : (fmt.bgColor ?? "transparent"),
            textAlign: fmt.align ?? "left",
            fontSize: fmt.fontSize ? `${fmt.fontSize}px` : "13px",
            fontFamily: "var(--font-geist-mono), monospace",
          }}
        >
          <span className="truncate w-full text-left">{displayValue}</span>
        </div>
      )}

      {/* Formula indicator */}
      {isFormula && !isEditing && (
        <div
          className="absolute bottom-0 left-0 w-0 h-0"
          style={{
            borderBottom: "5px solid #188038",
            borderRight: "5px solid transparent",
          }}
        />
      )}
    </div>
  );
}
