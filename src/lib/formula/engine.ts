import type { GridData, FormulaResult } from "@/types";

// ─── Cell Address Helpers ────────────────────────────────────────────────────

export function colLetterToIndex(col: string): number {
  let idx = 0;
  for (let i = 0; i < col.length; i++) {
    idx = idx * 26 + col.charCodeAt(i) - 64;
  }
  return idx - 1;
}

export function indexToColLetter(idx: number): string {
  let letter = "";
  let n = idx + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

export function parseCellId(cellId: string): { col: string; row: number } {
  const match = cellId.match(/^([A-Z]+)(\d+)$/);
  if (!match) throw new Error(`Invalid cell id: ${cellId}`);
  return { col: match[1], row: parseInt(match[2], 10) };
}

// ─── Range expansion ─────────────────────────────────────────────────────────

function expandRange(range: string): string[] {
  const [start, end] = range.split(":");
  if (!end) return [start];

  const { col: startCol, row: startRow } = parseCellId(start);
  const { col: endCol, row: endRow } = parseCellId(end);

  const startColIdx = colLetterToIndex(startCol);
  const endColIdx = colLetterToIndex(endCol);

  const cells: string[] = [];
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startColIdx; c <= endColIdx; c++) {
      cells.push(`${indexToColLetter(c)}${r}`);
    }
  }
  return cells;
}

// ─── Get numeric value of a cell ─────────────────────────────────────────────

function getCellNumber(
  cellId: string,
  grid: GridData,
  visited: Set<string>
): number {
  if (visited.has(cellId)) return 0; // circular ref guard
  const cell = grid[cellId];
  if (!cell) return 0;
  const computed = evaluateCell(cell.value, grid, new Set(visited));
  const n = parseFloat(computed.value);
  return isNaN(n) ? 0 : n;
}

// ─── Built-in functions ──────────────────────────────────────────────────────

type FnHandler = (args: string[], grid: GridData, visited: Set<string>) => number;

const FUNCTIONS: Record<string, FnHandler> = {
  SUM: (args, grid, visited) => {
    let total = 0;
    for (const arg of args) {
      if (arg.includes(":")) {
        expandRange(arg.trim()).forEach(
          (c) => (total += getCellNumber(c, grid, visited))
        );
      } else if (/^[A-Z]+\d+$/.test(arg.trim())) {
        total += getCellNumber(arg.trim(), grid, visited);
      } else {
        const n = parseFloat(arg.trim());
        if (!isNaN(n)) total += n;
      }
    }
    return total;
  },

  AVERAGE: (args, grid, visited) => {
    let total = 0;
    let count = 0;
    for (const arg of args) {
      if (arg.includes(":")) {
        expandRange(arg.trim()).forEach((c) => {
          total += getCellNumber(c, grid, visited);
          count++;
        });
      } else if (/^[A-Z]+\d+$/.test(arg.trim())) {
        total += getCellNumber(arg.trim(), grid, visited);
        count++;
      } else {
        const n = parseFloat(arg.trim());
        if (!isNaN(n)) { total += n; count++; }
      }
    }
    return count ? total / count : 0;
  },

  MIN: (args, grid, visited) => {
    const nums: number[] = [];
    for (const arg of args) {
      if (arg.includes(":")) {
        expandRange(arg.trim()).forEach((c) =>
          nums.push(getCellNumber(c, grid, visited))
        );
      } else if (/^[A-Z]+\d+$/.test(arg.trim())) {
        nums.push(getCellNumber(arg.trim(), grid, visited));
      } else {
        const n = parseFloat(arg.trim());
        if (!isNaN(n)) nums.push(n);
      }
    }
    return nums.length ? Math.min(...nums) : 0;
  },

  MAX: (args, grid, visited) => {
    const nums: number[] = [];
    for (const arg of args) {
      if (arg.includes(":")) {
        expandRange(arg.trim()).forEach((c) =>
          nums.push(getCellNumber(c, grid, visited))
        );
      } else if (/^[A-Z]+\d+$/.test(arg.trim())) {
        nums.push(getCellNumber(arg.trim(), grid, visited));
      } else {
        const n = parseFloat(arg.trim());
        if (!isNaN(n)) nums.push(n);
      }
    }
    return nums.length ? Math.max(...nums) : 0;
  },

  COUNT: (args, grid, visited) => {
    let count = 0;
    for (const arg of args) {
      if (arg.includes(":")) {
        expandRange(arg.trim()).forEach((c) => {
          const cell = grid[c];
          if (cell && cell.value !== "") count++;
        });
      } else if (/^[A-Z]+\d+$/.test(arg.trim())) {
        const cell = grid[arg.trim()];
        if (cell && cell.value !== "") count++;
      }
    }
    return count;
  },

  IF: (args, grid, visited) => {
    if (args.length < 2) return 0;
    const condition = evaluateExpression(args[0].trim(), grid, visited);
    const condNum = parseFloat(condition);
    const truthy =
      !isNaN(condNum) ? condNum !== 0 : condition.toLowerCase() !== "false";
    const branch = truthy ? args[1] : args[2] ?? "0";
    const result = evaluateExpression(branch.trim(), grid, visited);
    return parseFloat(result) || 0;
  },
};

// ─── Tokenise & evaluate arithmetic ─────────────────────────────────────────

function evaluateExpression(
  expr: string,
  grid: GridData,
  visited: Set<string>
): string {
  // Replace cell references with their computed values
  const withValues = expr.replace(/([A-Z]+)(\d+)/g, (match) => {
    const val = getCellNumber(match, grid, visited);
    return String(val);
  });

  // Evaluate arithmetic safely (no eval — use a mini recursive descent)
  try {
    const result = parseArithmetic(withValues.trim());
    // Trim unnecessary decimals
    if (Number.isFinite(result)) {
      return parseFloat(result.toFixed(10)).toString();
    }
    return String(result);
  } catch {
    return "#ERROR";
  }
}

// ─── Mini arithmetic parser ───────────────────────────────────────────────────

function parseArithmetic(expr: string): number {
  return parseAddSub(expr.replace(/\s/g, ""), { pos: 0 });
}

function parseAddSub(expr: string, state: { pos: number }): number {
  let left = parseMulDiv(expr, state);
  while (state.pos < expr.length) {
    const op = expr[state.pos];
    if (op !== "+" && op !== "-") break;
    state.pos++;
    const right = parseMulDiv(expr, state);
    left = op === "+" ? left + right : left - right;
  }
  return left;
}

function parseMulDiv(expr: string, state: { pos: number }): number {
  let left = parsePow(expr, state);
  while (state.pos < expr.length) {
    const op = expr[state.pos];
    if (op !== "*" && op !== "/") break;
    state.pos++;
    const right = parsePow(expr, state);
    if (op === "/") {
      if (right === 0) throw new Error("DIV/0");
      left = left / right;
    } else {
      left = left * right;
    }
  }
  return left;
}

function parsePow(expr: string, state: { pos: number }): number {
  const base = parseUnary(expr, state);
  if (state.pos < expr.length && expr[state.pos] === "^") {
    state.pos++;
    const exp = parseUnary(expr, state);
    return Math.pow(base, exp);
  }
  return base;
}

function parseUnary(expr: string, state: { pos: number }): number {
  if (expr[state.pos] === "-") {
    state.pos++;
    return -parseAtom(expr, state);
  }
  if (expr[state.pos] === "+") {
    state.pos++;
  }
  return parseAtom(expr, state);
}

function parseAtom(expr: string, state: { pos: number }): number {
  if (expr[state.pos] === "(") {
    state.pos++;
    const val = parseAddSub(expr, state);
    if (expr[state.pos] === ")") state.pos++;
    return val;
  }
  // Number literal
  const numMatch = expr.slice(state.pos).match(/^-?\d+(\.\d+)?([eE][+-]?\d+)?/);
  if (numMatch) {
    state.pos += numMatch[0].length;
    return parseFloat(numMatch[0]);
  }
  throw new Error(`Unexpected token at pos ${state.pos}: ${expr.slice(state.pos)}`);
}

// ─── Main entry point ────────────────────────────────────────────────────────

export function evaluateCell(
  raw: string,
  grid: GridData,
  visited: Set<string> = new Set()
): FormulaResult {
  if (!raw || !raw.startsWith("=")) {
    return { value: raw };
  }

  const formula = raw.slice(1).trim();

  // Check for function call: FUNCNAME(...)
  const fnMatch = formula.match(/^([A-Z]+)\((.*)?\)$/s);
  if (fnMatch) {
    const fnName = fnMatch[1];
    const argsStr = fnMatch[2] ?? "";

    if (FUNCTIONS[fnName]) {
      // Split args on commas not inside nested parens
      const args = splitArgs(argsStr);
      try {
        const result = FUNCTIONS[fnName](args, grid, visited);
        return { value: parseFloat(result.toFixed(10)).toString() };
      } catch (e) {
        return { value: "#ERROR", error: String(e) };
      }
    }
    return { value: "#NAME?", error: `Unknown function: ${fnName}` };
  }

  // Pure expression / cell reference
  try {
    const result = evaluateExpression(formula, grid, visited);
    if (result === "#ERROR") return { value: "#ERROR", error: "Calculation error" };
    return { value: result };
  } catch (e) {
    return { value: "#ERROR", error: String(e) };
  }
}

function splitArgs(argsStr: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of argsStr) {
    if (ch === "(" ) depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      args.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (current) args.push(current);
  return args;
}

// ─── Recompute entire grid ────────────────────────────────────────────────────

export function recomputeGrid(grid: GridData): GridData {
  const result = { ...grid };
  for (const [cellId, cell] of Object.entries(grid)) {
    if (cell.value.startsWith("=")) {
      const evaluated = evaluateCell(cell.value, grid, new Set([cellId]));
      result[cellId] = { ...cell, computed: evaluated.value };
    } else {
      result[cellId] = { ...cell, computed: cell.value };
    }
  }
  return result;
}
