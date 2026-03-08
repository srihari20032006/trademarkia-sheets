"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useDocument } from "@/hooks/useDocument";
import { usePresence } from "@/hooks/usePresence";
import { getPresenceColor } from "@/lib/firebase/auth";
import { Grid } from "./Grid";
import { Toolbar } from "./Toolbar";
import { FormulaBar } from "./FormulaBar";
import { PresenceBar } from "../presence/PresenceBar";
import { WriteIndicator } from "./WriteIndicator";
import type { CellId, PresenceEntry, UserProfile, CellFormat } from "@/types";

interface Props {
  docId: string;
}

export function SpreadsheetEditor({ docId }: Props) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const userProfile: UserProfile | null = user
    ? {
        uid: user.uid,
        displayName: user.displayName ?? "Anonymous",
        email: user.email,
        photoURL: user.photoURL,
        color: getPresenceColor(user.uid),
      }
    : null;

  const {
    document,
    loading: docLoading,
    writeState,
    setCellValue,
    setCellFormat,
    setColWidth,
    setRowHeight,
    setTitle,
    setColOrder,
  } = useDocument(docId);

  const [selectedCell, setSelectedCell] = useState<CellId>("A1");
  const [editingCell, setEditingCell] = useState<CellId | null>(null);
  const [presenceEntries, setPresenceEntries] = useState<PresenceEntry[]>([]);
  const [titleEditing, setTitleEditing] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const handlePresenceChange = useCallback(
    (entries: PresenceEntry[]) => setPresenceEntries(entries),
    []
  );

  const { updateCell: updatePresenceCell } = usePresence(
    docId,
    userProfile,
    handlePresenceChange
  );

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  const handleSelectCell = useCallback(
    (cellId: CellId) => {
      setSelectedCell(cellId);
      updatePresenceCell(cellId);
    },
    [updatePresenceCell]
  );

  const handleFormulaBarChange = useCallback(
    (value: string) => {
      setCellValue(selectedCell, value);
    },
    [selectedCell, setCellValue]
  );

  const handleFormat = useCallback(
    (format: Partial<CellFormat>) => {
      setCellFormat(selectedCell, format);
    },
    [selectedCell, setCellFormat]
  );

  if (authLoading || docLoading || !document) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const selectedCellData = document.cells[selectedCell];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white select-none">
      {/* Header: title + presence + write state */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 min-h-[48px]">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 transition-colors shrink-0"
          aria-label="Back to dashboard"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>

        {/* Document title */}
        {titleEditing ? (
          <input
            ref={titleRef}
            defaultValue={document.title}
            className="text-sm font-medium text-gray-900 border-b border-blue-500 outline-none bg-transparent px-1 w-48"
            onBlur={(e) => {
              setTitle(e.target.value || "Untitled");
              setTitleEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") {
                if (e.key === "Enter") setTitle((e.target as HTMLInputElement).value || "Untitled");
                setTitleEditing(false);
              }
            }}
            autoFocus
          />
        ) : (
          <span
            className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 px-1 truncate max-w-[200px]"
            onClick={() => setTitleEditing(true)}
            title="Click to rename"
          >
            {document.title}
          </span>
        )}

        <WriteIndicator state={writeState} />

        <div className="flex-1" />

        <PresenceBar entries={presenceEntries} currentUid={userProfile?.uid ?? ""} />

        {/* User info */}
        {userProfile && (
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-full text-white text-xs font-medium shrink-0"
            style={{ backgroundColor: userProfile.color }}
          >
            {userProfile.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={userProfile.photoURL} alt="" className="w-4 h-4 rounded-full" />
            ) : null}
            {userProfile.displayName}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <Toolbar
        docId={docId}
        selectedCell={selectedCell}
        cellData={selectedCellData}
        onFormat={handleFormat}
        document={document}
      />

      {/* Formula bar */}
      <FormulaBar
        selectedCell={selectedCell}
        rawValue={selectedCellData?.value ?? ""}
        onChange={handleFormulaBarChange}
      />

      {/* Grid */}
      <div className="flex-1 overflow-hidden">
        <Grid
          document={document}
          selectedCell={selectedCell}
          editingCell={editingCell}
          presenceEntries={presenceEntries}
          currentUid={userProfile?.uid ?? ""}
          onSelectCell={handleSelectCell}
          onEditingCell={setEditingCell}
          onCellChange={setCellValue}
          onColWidth={setColWidth}
          onRowHeight={setRowHeight}
          onColOrder={setColOrder}
        />
      </div>
    </div>
  );
}
