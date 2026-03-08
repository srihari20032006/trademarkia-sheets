"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import {
  updateCells,
  updateColWidths,
  updateRowHeights,
  updateDocumentTitle,
  updateColOrder,
} from "@/lib/firebase/documents";
import { recomputeGrid } from "@/lib/formula/engine";
import type {
  SpreadsheetDocument,
  GridData,
  CellData,
  WriteState,
  ColWidths,
  RowHeights,
} from "@/types";
import { Timestamp } from "firebase/firestore";

function buildDefaultColOrder(): string[] {
  return Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
}

export function useDocument(docId: string) {
  const [document, setDocument] = useState<SpreadsheetDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [writeState, setWriteState] = useState<WriteState>("idle");

  // debounce timer ref
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!docId) return;

    const unsub = onSnapshot(doc(db, "documents", docId), (snap) => {
      if (!snap.exists()) {
        setLoading(false);
        return;
      }
      const d = snap.data();
      const raw: SpreadsheetDocument = {
        id: snap.id,
        title: d.title ?? "Untitled",
        ownerId: d.ownerId,
        createdAt:
          d.createdAt instanceof Timestamp
            ? d.createdAt.toMillis()
            : (d.createdAt as number),
        updatedAt:
          d.updatedAt instanceof Timestamp
            ? d.updatedAt.toMillis()
            : (d.updatedAt as number),
        cells: d.cells ?? {},
        colWidths: d.colWidths ?? {},
        rowHeights: d.rowHeights ?? {},
        colOrder: d.colOrder ?? buildDefaultColOrder(),
      };
      // Compute formula cells
      raw.cells = recomputeGrid(raw.cells);
      setDocument(raw);
      setLoading(false);
    });

    return unsub;
  }, [docId]);

  const setCellValue = useCallback(
    (cellId: string, value: string, extraFormat?: Partial<CellData["format"]>) => {
      if (!document) return;

      setWriteState("pending");

      // Optimistic local update
      setDocument((prev) => {
        if (!prev) return prev;
        const updated: GridData = {
          ...prev.cells,
          [cellId]: {
            ...prev.cells[cellId],
            value,
            format: {
              ...prev.cells[cellId]?.format,
              ...extraFormat,
            },
          },
        };
        return { ...prev, cells: recomputeGrid(updated) };
      });

      // Debounced Firestore write
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          const cell: CellData = {
            value,
            format: {
              ...(document.cells[cellId]?.format ?? {}),
              ...extraFormat,
            },
          };
          await updateCells(docId, { [cellId]: cell });
          setWriteState("saved");
          setTimeout(() => setWriteState("idle"), 1500);
        } catch {
          setWriteState("error");
        }
      }, 400);
    },
    [docId, document]
  );

  const setCellFormat = useCallback(
    (cellId: string, format: Partial<NonNullable<CellData["format"]>>) => {
      if (!document) return;
      const existing = document.cells[cellId] ?? { value: "" };
      const updated: CellData = {
        ...existing,
        format: { ...existing.format, ...format },
      };
      setWriteState("pending");
      setDocument((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          cells: { ...prev.cells, [cellId]: updated },
        };
      });
      updateCells(docId, { [cellId]: updated })
        .then(() => {
          setWriteState("saved");
          setTimeout(() => setWriteState("idle"), 1500);
        })
        .catch(() => setWriteState("error"));
    },
    [docId, document]
  );

  const setColWidth = useCallback(
    (col: string, width: number) => {
      setDocument((prev) =>
        prev ? { ...prev, colWidths: { ...prev.colWidths, [col]: width } } : prev
      );
      updateColWidths(docId, { [col]: width });
    },
    [docId]
  );

  const setRowHeight = useCallback(
    (row: number, height: number) => {
      setDocument((prev) =>
        prev
          ? {
              ...prev,
              rowHeights: { ...prev.rowHeights, [row]: height },
            }
          : prev
      );
      updateRowHeights(docId, { [row]: height });
    },
    [docId]
  );

  const setTitle = useCallback(
    (title: string) => {
      setDocument((prev) => (prev ? { ...prev, title } : prev));
      updateDocumentTitle(docId, title);
    },
    [docId]
  );

  const setColOrder = useCallback(
    (colOrder: string[]) => {
      setDocument((prev) => (prev ? { ...prev, colOrder } : prev));
      updateColOrder(docId, colOrder);
    },
    [docId]
  );

  return {
    document,
    loading,
    writeState,
    setCellValue,
    setCellFormat,
    setColWidth,
    setRowHeight,
    setTitle,
    setColOrder,
  };
}
