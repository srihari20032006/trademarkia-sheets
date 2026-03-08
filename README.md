# Trademarkia Sheets

A lightweight, real-time collaborative spreadsheet built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Firebase**.

## Live Demo

🔗 **[Live URL]** — *(add after deploying to Vercel)*

## Features

### Core
- **Real-time collaboration** — changes sync instantly across all open sessions of the same document via Firestore `onSnapshot`
- **Presence system** — see other users' avatars and which cell they're focused on; backed by Firebase Realtime Database with `onDisconnect` cleanup
- **Write-state indicator** — three-state indicator (saving / saved / error) with optimistic local updates and debounced Firestore writes
- **Formula engine** — custom recursive-descent parser supporting:
  - `=SUM(A1:A10)`, `=AVERAGE(...)`, `=MIN(...)`, `=MAX(...)`, `=COUNT(...)`, `=IF(...)`
  - Cell references (`=A1+B2`)
  - Range expansion (`A1:C5`)
  - Arithmetic with operator precedence and parentheses (`=(A1+B1)*C1^2`)
  - Circular reference guard
  - Error values: `#ERROR`, `#NAME?`, `#DIV/0`

### Identity
- **Google Sign-In** via Firebase Auth
- **Anonymous / guest mode** — set a display name, no account required
- Deterministic presence color per `uid` hash

### Editor
- Scrollable grid — 26 columns (A–Z), 100 rows
- Row numbers + column letters; selected row/col highlighted
- **Cell formatting**: bold, italic, text color, background color, font size, text alignment
- **Column resize** — drag the right edge of any column header
- **Row resize** — drag the bottom edge of any row header
- **Column reorder** — drag column headers left/right
- **Keyboard navigation**: ↑↓←→, Tab (next col), Enter (next row), Delete (clear cell)
- Formula bar with cell address display; formula cells marked with a green corner indicator
- Inline cell editing on double-click or any printable keypress
- **Export to CSV and XLSX** (via SheetJS)

### Dashboard
- Lists all documents owned by the current user
- Create new documents
- Last-modified timestamp per document

## Architecture Decisions

### Where state lives

State is split across three layers:

1. **Firestore** (persistent, structured) — document metadata and cell data. Each cell is a document field (`cells.A1`, `cells.B2`, etc.), so partial updates are cheap dot-notation writes rather than full document overwrites. Firestore's `onSnapshot` drives all real-time sync.

2. **Firebase Realtime Database** (ephemeral, low-latency) — presence only. RTDB is chosen over Firestore here because presence requires sub-second writes and `onDisconnect` semantics. Each user's presence is a single leaf node; `onDisconnect().remove()` guarantees cleanup on tab close or network drop.

3. **React state** (in-memory, optimistic) — the `useDocument` hook maintains a local copy of the document and applies optimistic writes immediately. Firestore's `onSnapshot` reconciles remote changes from other users. This means the user's own edits feel instant while the network write races behind the scenes.

### Conflict handling

The system uses **last-write-wins** at the cell level. A cell update is a Firestore dot-notation partial update (`cells.A1 = { value, format }`), which is atomic for that cell. Two users editing different cells simultaneously have no conflict. Two users editing the same cell concurrently will see the last write win — acceptable for a spreadsheet where true OT/CRDT would be disproportionate complexity. Firestore's consistency guarantees ensure all clients converge to the same state.

Writes are debounced by 400ms per cell to reduce the write rate while keeping perceived latency low.

### Formula engine

The formula parser is a hand-rolled recursive-descent parser instead of `eval()` for security, and instead of a library for minimal bundle size. It covers the most-used spreadsheet functions and handles cell references with a visited-set guard against circular references. The depth is justified because any deeper (e.g. VLOOKUP, array formulas) would require a full range-address resolver and is out of scope.

### App Router patterns

- Server component at the page level (`/editor/[docId]/page.tsx`) receives params, passes `docId` to a client component boundary
- All Firebase SDK code is in client components (marked `"use client"`)
- No `useEffect` data-fetching on the server — all real-time subscriptions live in custom hooks

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project with:
  - Authentication (Google + Anonymous providers enabled)
  - Firestore database
  - Realtime Database

### Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd trademarkia-sheets
npm install

# 2. Configure environment
cp .env.local.example .env.local
# Fill in your Firebase project values

# 3. Deploy Firebase security rules
firebase deploy --only firestore:rules,database

# 4. Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Firebase Security Rules

**Firestore** (`firestore.rules`): Any authenticated user can read/update documents (enabling URL-based sharing). Only the owner can create/delete.

**Realtime Database** (`database.rules.json`): Any authenticated user can read presence. Users can only write their own presence entry.

### Type-checking

```bash
npm run type-check
```

Zero TypeScript errors required for deployment — `tsconfig.json` is set to `strict: true`.

## Deployment (Vercel)

1. Push to GitHub (private repo)
2. Import project in Vercel
3. Set the environment variables from `.env.local.example` in Vercel's project settings
4. Deploy

## Project Structure

```
src/
├── app/
│   ├── auth/page.tsx          # Sign-in / guest name
│   ├── dashboard/page.tsx     # Document list
│   ├── editor/[docId]/page.tsx
│   ├── layout.tsx
│   ├── page.tsx               # Redirect logic
│   └── globals.css
├── components/
│   ├── grid/
│   │   ├── SpreadsheetEditor.tsx  # Editor shell, wires hooks + UI
│   │   ├── Grid.tsx               # Virtualized-ish grid, keyboard nav, resize, reorder
│   │   ├── Cell.tsx               # Individual cell (view + edit mode)
│   │   ├── FormulaBar.tsx
│   │   ├── Toolbar.tsx            # Formatting + export
│   │   └── WriteIndicator.tsx
│   └── presence/
│       └── PresenceBar.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useDocument.ts         # Firestore subscription + optimistic writes
│   └── usePresence.ts         # RTDB presence
├── lib/
│   ├── firebase/
│   │   ├── config.ts
│   │   ├── auth.ts
│   │   ├── documents.ts       # Firestore CRUD
│   │   └── presence.ts        # RTDB presence helpers
│   └── formula/
│       └── engine.ts          # Recursive-descent formula parser
└── types/index.ts
```

## What Was Intentionally Left Out

- **Virtual scrolling** — 100 rows × 26 cols = 2600 DOM nodes, which is fine for a demo; production would need windowing
- **Multi-cell selection / paste** — adds significant state complexity for marginal demo value
- **VLOOKUP / array formulas** — requires full range resolver, out of scope
- **OT/CRDT** — last-write-wins is correct for cell-granularity edits
- **Undo/redo** — would require a command stack; deferred

## Commit Narrative

The repository follows incremental commits:
1. `init: project scaffold with Next.js 14, TypeScript, Tailwind`
2. `feat: Firebase config, auth (Google + anonymous), presence helpers`
3. `feat: Firestore document CRUD and real-time subscription hook`
4. `feat: formula engine — recursive-descent parser with SUM, AVERAGE, IF`
5. `feat: Grid component with keyboard navigation and cell editing`
6. `feat: presence system via RTDB with onDisconnect cleanup`
7. `feat: toolbar — cell formatting, column/row resize, column reorder`
8. `feat: export to CSV and XLSX`
9. `fix: TypeScript strict mode compliance`
10. `docs: README with architecture decisions`
