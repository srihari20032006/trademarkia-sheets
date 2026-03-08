"use client";

import React, {
  useRef,
  useCallback,
  useState,
  useEffect,
  useMemo,
} from "react";
import type {
  SpreadsheetDocument,
  CellId,
  PresenceEntry,
} from "@/types";
import { Cell } from "./Cell";
import { DEFAULT_COL_WIDTH, DEFAULT_ROW_HEIGHT } from "@/lib/firebase/documents";

const ROW_HEADER_WIDTH = 46;
const COL_HEADER_HEIGHT = 24;
const VISIBLE_ROWS = 100;

interface Props {
  document: SpreadsheetDocument;
  selectedCell: CellId;
  editingCell: CellId | null;
  presenceEntries: PresenceEntry[];
  currentUid: string;
  onSelectCell: (cellId: CellId) => void;
  onEditingCell: (cellId: CellId | null) => void;
  onCellChange: (cellId: CellId, value: string) => void;
  onColWidth: (col: string, width: number) => void;
  onRowHeight: (row: number, height: number) => void;
  onColOrder: (colOrder: string[]) => void;
}

function parseCellId(cellId: CellId): { col: string; row: number } {
  const match = cellId.match(/^([A-Z]+)(\d+)$/);
  if (!match) return { col: "A", row: 1 };
  return { col: match[1], row: parseInt(match[2], 10) };
}

export function Grid({
  document,
  selectedCell,
  editingCell,
  presenceEntries,
  currentUid,
  onSelectCell,
  onEditingCell,
  onCellChange,
  onColWidth,
  onRowHeight,
  onColOrder,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeColRef = useRef<{
    col: string;
    startX: number;
    startW: number;
  } | null>(null);
  const resizeRowRef = useRef<{
    row: number;
    startY: number;
    startH: number;
  } | null>(null);
  const dragColRef = useRef<{ col: string; x: number } | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const cols = document.colOrder;
  const rows = Array.from({ length: VISIBLE_ROWS }, (_, i) => i + 1);

  // Build presence map: cellId -> list of users
  const presenceMap = useMemo(() => {
    const map: Record<string, PresenceEntry[]> = {};
    for (const entry of presenceEntries) {
      if (entry.uid === currentUid || !entry.selectedCell) continue;
      if (!map[entry.selectedCell]) map[entry.selectedCell] = [];
      map[entry.selectedCell].push(entry);
    }
    return map;
  }, [presenceEntries, currentUid]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editingCell) return;
      const { col, row } = parseCellId(selectedCell);
      const colIdx = cols.indexOf(col);

      const move = (nextCol: string, nextRow: number) => {
        if (nextRow < 1 || nextRow > VISIBLE_ROWS) return;
        if (nextCol === "") return;
        e.preventDefault();
        onSelectCell(`${nextCol}${nextRow}`);
      };

      switch (e.key) {
        case "ArrowUp":
          move(col, row - 1);
          break;
        case "ArrowDown":
        case "Enter":
          move(col, row + 1);
          break;
        case "ArrowLeft":
          if (colIdx > 0) move(cols[colIdx - 1], row);
          break;
        case "ArrowRight":
        case "Tab":
          if (e.shiftKey && e.key === "Tab") {
            if (colIdx > 0) move(cols[colIdx - 1], row);
          } else {
            if (colIdx < cols.length - 1) move(cols[colIdx + 1], row);
          }
          break;
        case "Delete":
        case "Backspace":
          onCellChange(selectedCell, "");
          break;
        default:
          // Start editing on printable char
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            onEditingCell(selectedCell);
          }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedCell, editingCell, cols, onSelectCell, onEditingCell, onCellChange]);

  // ─── Column resize ──────────────────────────────────────────────────────────
  const startColResize = useCallback(
    (e: React.MouseEvent, col: string) => {
      e.preventDefault();
      e.stopPropagation();
      resizeColRef.current = {
        col,
        startX: e.clientX,
        startW:
          document.colWidths[col] ?? DEFAULT_COL_WIDTH,
      };
      const onMove = (ev: MouseEvent) => {
        if (!resizeColRef.current) return;
        const delta = ev.clientX - resizeColRef.current.startX;
        const newW = Math.max(40, resizeColRef.current.startW + delta);
        onColWidth(resizeColRef.current.col, newW);
      };
      const onUp = () => {
        resizeColRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [document.colWidths, onColWidth]
  );

  // ─── Row resize ─────────────────────────────────────────────────────────────
  const startRowResize = useCallback(
    (e: React.MouseEvent, row: number) => {
      e.preventDefault();
      e.stopPropagation();
      resizeRowRef.current = {
        row,
        startY: e.clientY,
        startH: document.rowHeights[row] ?? DEFAULT_ROW_HEIGHT,
      };
      const onMove = (ev: MouseEvent) => {
        if (!resizeRowRef.current) return;
        const delta = ev.clientY - resizeRowRef.current.startY;
        const newH = Math.max(18, resizeRowRef.current.startH + delta);
        onRowHeight(resizeRowRef.current.row, newH);
      };
      const onUp = () => {
        resizeRowRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [document.rowHeights, onRowHeight]
  );

  // ─── Column drag-to-reorder ─────────────────────────────────────────────────
  const startColDrag = useCallback((e: React.DragEvent, col: string) => {
    dragColRef.current = { col, x: e.clientX };
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleColDragOver = useCallback(
    (e: React.DragEvent, col: string) => {
      e.preventDefault();
      setDragOverCol(col);
    },
    []
  );

  const handleColDrop = useCallback(
    (e: React.DragEvent, targetCol: string) => {
      e.preventDefault();
      if (!dragColRef.current || dragColRef.current.col === targetCol) {
        setDragOverCol(null);
        return;
      }
      const srcCol = dragColRef.current.col;
      const newOrder = [...cols];
      const srcIdx = newOrder.indexOf(srcCol);
      const tgtIdx = newOrder.indexOf(targetCol);
      newOrder.splice(srcIdx, 1);
      newOrder.splice(tgtIdx, 0, srcCol);
      onColOrder(newOrder);
      dragColRef.current = null;
      setDragOverCol(null);
    },
    [cols, onColOrder]
  );

  return (
    <div
      ref={containerRef}
      className="grid-container w-full h-full overflow-auto"
      style={{ position: "relative" }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${ROW_HEADER_WIDTH}px ${cols
            .map((c) => `${document.colWidths[c] ?? DEFAULT_COL_WIDTH}px`)
            .join(" ")}`,
          gridTemplateRows: `${COL_HEADER_HEIGHT}px ${rows
            .map((r) => `${document.rowHeights[r] ?? DEFAULT_ROW_HEIGHT}px`)
            .join(" ")}`,
          width: "max-content",
          minWidth: "100%",
        }}
      >
        {/* Top-left corner */}
        <div
          className="bg-sheet-header border-b border-r border-sheet-border sticky top-0 left-0 z-30"
          style={{ gridColumn: 1, gridRow: 1 }}
        />

        {/* Column headers */}
        {cols.map((col, ci) => (
          <div
            key={col}
            style={{ gridColumn: ci + 2, gridRow: 1 }}
            className={`bg-sheet-header border-b border-r border-sheet-border flex items-center justify-center text-xs font-medium text-gray-600 sticky top-0 z-20 relative cursor-grab select-none
              ${dragOverCol === col ? "bg-blue-100" : ""}
              ${parseCellId(selectedCell).col === col ? "bg-blue-50 text-blue-700" : ""}
            `}
            draggable
            onDragStart={(e) => startColDrag(e, col)}
            onDragOver={(e) => handleColDragOver(e, col)}
            onDrop={(e) => handleColDrop(e, col)}
          >
            {col}
            {/* Resize handle */}
            <div
              className="col-resize-handle"
              onMouseDown={(e) => startColResize(e, col)}
            />
          </div>
        ))}

        {/* Row headers + cells */}
        {rows.map((row, ri) => (
          <React.Fragment key={row}>
            {/* Row number header */}
            <div
              style={{ gridColumn: 1, gridRow: ri + 2 }}
              className={`bg-sheet-header border-b border-r border-sheet-border flex items-center justify-end pr-2 text-xs font-medium text-gray-500 sticky left-0 z-10 relative select-none
                ${parseCellId(selectedCell).row === row ? "bg-blue-50 text-blue-700" : ""}
              `}
            >
              {row}
              {/* Row resize handle */}
              <div
                className="row-resize-handle"
                onMouseDown={(e) => startRowResize(e, row)}
              />
            </div>

            {/* Cells */}
            {cols.map((col, ci) => {
              const cellId: CellId = `${col}${row}`;
              const cellData = document.cells[cellId];
              const isSelected = selectedCell === cellId;
              const isEditing = editingCell === cellId;
              const cellPresence = presenceMap[cellId];

              return (
                <Cell
                  key={cellId}
                  cellId={cellId}
                  data={cellData}
                  isSelected={isSelected}
                  isEditing={isEditing}
                  presence={cellPresence}
                  gridCol={ci + 2}
                  gridRow={ri + 2}
                  onSelect={onSelectCell}
                  onStartEdit={onEditingCell}
                  onCommit={(value) => {
                    onCellChange(cellId, value);
                    onEditingCell(null);
                  }}
                  onAbort={() => onEditingCell(null)}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
