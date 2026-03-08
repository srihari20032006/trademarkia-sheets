"use client";

import { useCallback } from "react";
import type { CellData, CellFormat, SpreadsheetDocument } from "@/types";

interface Props {
  docId: string;
  selectedCell: string;
  cellData: CellData | undefined;
  onFormat: (format: Partial<CellFormat>) => void;
  document: SpreadsheetDocument;
}

function ToolbarBtn({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`h-7 px-2 rounded text-sm font-medium transition-colors flex items-center gap-1
        ${active ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"}
      `}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-gray-200 mx-1" />;
}

export function Toolbar({ docId, selectedCell, cellData, onFormat, document }: Props) {
  const fmt = cellData?.format ?? {};

  const toggle = useCallback(
    (key: keyof CellFormat) => {
      onFormat({ [key]: !fmt[key as keyof typeof fmt] });
    },
    [fmt, onFormat]
  );

  // Export to CSV
  const handleExportCSV = useCallback(() => {
    const cols = document.colOrder;
    const rows = Array.from({ length: 100 }, (_, i) => i + 1);
    const lines = rows.map((row) =>
      cols
        .map((col) => {
          const val = document.cells[`${col}${row}`];
          const display = val?.computed ?? val?.value ?? "";
          return `"${display.replace(/"/g, '""')}"`;
        })
        .join(",")
    );
    const csv = [cols.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${document.title}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [document]);

  // Export to XLSX (uses SheetJS if available, else CSV fallback)
  const handleExportXLSX = useCallback(async () => {
    try {
      const XLSX = await import("xlsx");
      const cols = document.colOrder;
      const data: string[][] = [cols];
      for (let row = 1; row <= 100; row++) {
        data.push(
          cols.map((col) => {
            const cell = document.cells[`${col}${row}`];
            return cell?.computed ?? cell?.value ?? "";
          })
        );
      }
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(wb, `${document.title}.xlsx`);
    } catch {
      handleExportCSV();
    }
  }, [document, handleExportCSV]);

  return (
    <div className="toolbar">
      {/* Bold */}
      <ToolbarBtn active={fmt.bold} onClick={() => toggle("bold")} title="Bold (Ctrl+B)">
        <strong>B</strong>
      </ToolbarBtn>

      {/* Italic */}
      <ToolbarBtn active={fmt.italic} onClick={() => toggle("italic")} title="Italic (Ctrl+I)">
        <em>I</em>
      </ToolbarBtn>

      <Divider />

      {/* Text align */}
      <ToolbarBtn
        active={!fmt.align || fmt.align === "left"}
        onClick={() => onFormat({ align: "left" })}
        title="Align left"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
          <rect x="1" y="2" width="10" height="2" />
          <rect x="1" y="6" width="14" height="2" />
          <rect x="1" y="10" width="8" height="2" />
        </svg>
      </ToolbarBtn>
      <ToolbarBtn
        active={fmt.align === "center"}
        onClick={() => onFormat({ align: "center" })}
        title="Align center"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
          <rect x="3" y="2" width="10" height="2" />
          <rect x="1" y="6" width="14" height="2" />
          <rect x="4" y="10" width="8" height="2" />
        </svg>
      </ToolbarBtn>
      <ToolbarBtn
        active={fmt.align === "right"}
        onClick={() => onFormat({ align: "right" })}
        title="Align right"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
          <rect x="5" y="2" width="10" height="2" />
          <rect x="1" y="6" width="14" height="2" />
          <rect x="8" y="10" width="7" height="2" />
        </svg>
      </ToolbarBtn>

      <Divider />

      {/* Text color */}
      <label className="flex items-center gap-1 h-7 px-2 rounded hover:bg-gray-100 cursor-pointer text-sm text-gray-700" title="Text color">
        <span className="text-xs font-medium">A</span>
        <div
          className="w-3 h-1.5 rounded-sm"
          style={{ backgroundColor: fmt.color ?? "#1f2937" }}
        />
        <input
          type="color"
          className="sr-only"
          value={fmt.color ?? "#1f2937"}
          onChange={(e) => onFormat({ color: e.target.value })}
        />
      </label>

      {/* Background color */}
      <label className="flex items-center gap-1 h-7 px-2 rounded hover:bg-gray-100 cursor-pointer text-sm text-gray-700" title="Background color">
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
          <path d="M7 1l7 7-4 4-1-1-5 5H1v-3L6 8 5 7l2-6zm0 3L3 9h3l1 1 3-3-3-3z" />
        </svg>
        <div
          className="w-3 h-1.5 rounded-sm border border-gray-300"
          style={{ backgroundColor: fmt.bgColor ?? "#ffffff" }}
        />
        <input
          type="color"
          className="sr-only"
          value={fmt.bgColor ?? "#ffffff"}
          onChange={(e) => onFormat({ bgColor: e.target.value })}
        />
      </label>

      <Divider />

      {/* Font size */}
      <select
        value={fmt.fontSize ?? 13}
        onChange={(e) => onFormat({ fontSize: parseInt(e.target.value, 10) })}
        className="h-7 border border-gray-200 rounded px-1 text-xs text-gray-700 bg-white"
        title="Font size"
      >
        {[10, 11, 12, 13, 14, 16, 18, 20, 24].map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <div className="flex-1" />

      {/* Export */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleExportCSV}
          className="h-7 px-3 rounded border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          title="Export as CSV"
        >
          CSV
        </button>
        <button
          onClick={handleExportXLSX}
          className="h-7 px-3 rounded border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          title="Export as Excel"
        >
          XLSX
        </button>
      </div>
    </div>
  );
}
