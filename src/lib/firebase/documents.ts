import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "./config";
import type {
  SpreadsheetDocument,
  DocumentMeta,
  GridData,
  ColWidths,
  RowHeights,
} from "@/types";

const DOCS_COLLECTION = "documents";

export const DEFAULT_COL_WIDTH = 120;
export const DEFAULT_ROW_HEIGHT = 25;
export const DEFAULT_COLS = 26; // A–Z
export const DEFAULT_ROWS = 100;

function buildDefaultColOrder(): string[] {
  return Array.from({ length: DEFAULT_COLS }, (_, i) =>
    String.fromCharCode(65 + i)
  );
}

export async function createDocument(
  ownerId: string,
  ownerName: string,
  title = "Untitled Spreadsheet"
): Promise<string> {
  const ref = doc(collection(db, DOCS_COLLECTION));
  const now = Date.now();

  const docData: SpreadsheetDocument = {
    id: ref.id,
    title,
    ownerId,
    createdAt: now,
    updatedAt: now,
    cells: {},
    colWidths: {},
    rowHeights: {},
    colOrder: buildDefaultColOrder(),
  };

  await setDoc(ref, {
    ...docData,
    ownerName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export async function getDocument(
  docId: string
): Promise<SpreadsheetDocument | null> {
  const snap = await getDoc(doc(db, DOCS_COLLECTION, docId));
  if (!snap.exists()) return null;

  const data = snap.data();
  return {
    id: snap.id,
    title: data.title ?? "Untitled",
    ownerId: data.ownerId,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toMillis()
        : data.createdAt,
    updatedAt:
      data.updatedAt instanceof Timestamp
        ? data.updatedAt.toMillis()
        : data.updatedAt,
    cells: data.cells ?? {},
    colWidths: data.colWidths ?? {},
    rowHeights: data.rowHeights ?? {},
    colOrder: data.colOrder ?? buildDefaultColOrder(),
  };
}

export async function listDocumentsByUser(
  userId: string
): Promise<DocumentMeta[]> {
  const q = query(
    collection(db, DOCS_COLLECTION),
    where("ownerId", "==", userId),
    orderBy("updatedAt", "desc")
  );
  const snaps = await getDocs(q);
  return snaps.docs.map((s) => {
    const d = s.data();
    return {
      id: s.id,
      title: d.title,
      ownerId: d.ownerId,
      ownerName: d.ownerName ?? "Unknown",
      createdAt:
        d.createdAt instanceof Timestamp ? d.createdAt.toMillis() : d.createdAt,
      updatedAt:
        d.updatedAt instanceof Timestamp ? d.updatedAt.toMillis() : d.updatedAt,
    };
  });
}

export async function updateDocumentTitle(
  docId: string,
  title: string
): Promise<void> {
  await updateDoc(doc(db, DOCS_COLLECTION, docId), {
    title,
    updatedAt: serverTimestamp(),
  });
}

export async function updateCells(
  docId: string,
  cells: GridData
): Promise<void> {
  // Flatten cells into Firestore-safe dot-notation updates
  const updates: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  for (const [cellId, cellData] of Object.entries(cells)) {
    updates[`cells.${cellId}`] = cellData;
  }
  await updateDoc(doc(db, DOCS_COLLECTION, docId), updates);
}

export async function updateColWidths(
  docId: string,
  colWidths: ColWidths
): Promise<void> {
  const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };
  for (const [col, width] of Object.entries(colWidths)) {
    updates[`colWidths.${col}`] = width;
  }
  await updateDoc(doc(db, DOCS_COLLECTION, docId), updates);
}

export async function updateRowHeights(
  docId: string,
  rowHeights: RowHeights
): Promise<void> {
  const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };
  for (const [row, height] of Object.entries(rowHeights)) {
    updates[`rowHeights.${row}`] = height;
  }
  await updateDoc(doc(db, DOCS_COLLECTION, docId), updates);
}

export async function updateColOrder(
  docId: string,
  colOrder: string[]
): Promise<void> {
  await updateDoc(doc(db, DOCS_COLLECTION, docId), {
    colOrder,
    updatedAt: serverTimestamp(),
  });
}
