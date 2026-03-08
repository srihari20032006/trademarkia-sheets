"use client";

import { useState, useEffect, useRef } from "react";
import type { CellId } from "@/types";

interface Props {
  selectedCell: CellId;
  rawValue: string;
  onChange: (value: string) => void;
}

export function FormulaBar({ selectedCell, rawValue, onChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(rawValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setLocalValue(rawValue);
  }, [rawValue, editing]);

  function handleCommit() {
    onChange(localValue);
    setEditing(false);
  }

  return (
    <div className="formula-bar border-b border-sheet-border">
      {/* Cell address */}
      <div className="min-w-[60px] text-center text-xs font-mono font-semibold text-gray-700 border border-gray-200 rounded px-2 py-0.5 bg-gray-50">
        {selectedCell}
      </div>

      {/* fx icon */}
      <span className="text-xs font-medium text-green-700 select-none mx-1">fx</span>

      {/* Value/formula input */}
      <input
        ref={inputRef}
        value={editing ? localValue : rawValue}
        onChange={(e) => {
          setLocalValue(e.target.value);
          if (!editing) setEditing(true);
        }}
        onFocus={() => {
          setEditing(true);
          setLocalValue(rawValue);
        }}
        onBlur={handleCommit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleCommit();
            inputRef.current?.blur();
          }
          if (e.key === "Escape") {
            setEditing(false);
            setLocalValue(rawValue);
          }
        }}
        className="flex-1 border-none outline-none text-sm font-mono bg-transparent text-gray-900"
        spellCheck={false}
        placeholder="Enter value or formula (e.g. =SUM(A1:A10))"
      />
    </div>
  );
}
