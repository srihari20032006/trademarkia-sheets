// ─── Cell & Grid Types ───────────────────────────────────────────────────────

export interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  color?: string;
  bgColor?: string;
  fontSize?: number;
  align?: "left" | "center" | "right";
}

export interface CellData {
  value: string; // raw input (could be formula)
  computed?: string; // evaluated result
  format?: CellFormat;
}

// e.g. "A1", "B3"
export type CellId = string;

export type GridData = Record<CellId, CellData>;

// ─── Column/Row sizing ───────────────────────────────────────────────────────

export interface ColWidths {
  [col: string]: number; // col letter -> px width
}

export interface RowHeights {
  [row: number]: number; // row number -> px height
}

// ─── Document ────────────────────────────────────────────────────────────────

export interface SpreadsheetDocument {
  id: string;
  title: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
  cells: GridData;
  colWidths: ColWidths;
  rowHeights: RowHeights;
  colOrder: string[]; // ordered list of column letters
}

export interface DocumentMeta {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  createdAt: number;
  updatedAt: number;
}

// ─── Auth & Users ─────────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string | null;
  photoURL: string | null;
  color: string; // assigned presence color
}

// ─── Presence ────────────────────────────────────────────────────────────────

export interface PresenceEntry {
  uid: string;
  displayName: string;
  color: string;
  photoURL: string | null;
  selectedCell: CellId | null;
  lastSeen: number;
}

// ─── Write State ─────────────────────────────────────────────────────────────

export type WriteState = "idle" | "pending" | "saved" | "error";

// ─── Formula Evaluation ──────────────────────────────────────────────────────

export interface FormulaResult {
  value: string;
  error?: string;
}
