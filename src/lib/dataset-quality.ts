export type ColumnStats = {
  name: string;
  type: "numeric" | "categorical" | "boolean" | "empty";
  missing: number;
  missingPct: number;
  unique: number;
  min?: number;
  max?: number;
  mean?: number;
  std?: number;
  outliers?: number;
};

export type QualityReport = {
  rows: number;
  columns: number;
  missingPercentage: number;
  duplicates: number;
  columnStats: ColumnStats[];
  classBalance?: Record<string, number>;
  targetColumn?: string;
  warnings: string[];
};

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.length > 0);
  if (!lines.length) return { headers: [], rows: [] };
  const headers = splitLine(lines[0]);
  const rows = lines.slice(1).map(splitLine);
  return { headers, rows };
}

function splitLine(line: string): string[] {
  // Simple CSV split; handles basic quoted fields.
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === "," && !inQ) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function isEmpty(v: string) {
  return v === "" || v === undefined || v == null || /^(na|n\/a|null|none|\?)$/i.test(v);
}

function detectTarget(headers: string[]): string | undefined {
  const candidates = ["outcome", "target", "class", "label", "diagnosis", "result", "disease"];
  for (const h of headers) {
    if (candidates.includes(h.toLowerCase())) return h;
  }
  // common dataset targets
  for (const h of headers) {
    if (/(outcome|target|class|label|diagnosis)/i.test(h)) return h;
  }
  return headers[headers.length - 1];
}

export function analyzeCSV(text: string): QualityReport {
  const { headers, rows } = parseCSV(text);
  const totalRows = rows.length;
  const totalCells = totalRows * headers.length || 1;
  let missingCells = 0;

  // Duplicates (exact row matches)
  const seen = new Set<string>();
  let duplicates = 0;
  for (const r of rows) {
    const key = r.join("\u0001");
    if (seen.has(key)) duplicates++;
    else seen.add(key);
  }

  const columnStats: ColumnStats[] = headers.map((h, idx) => {
    const col = rows.map((r) => r[idx] ?? "");
    const nonMissing = col.filter((v) => !isEmpty(v));
    const missing = col.length - nonMissing.length;
    missingCells += missing;
    const nums = nonMissing.map((v) => Number(v)).filter((n) => Number.isFinite(n));
    const allNumeric = nonMissing.length > 0 && nums.length === nonMissing.length;
    const uniqueVals = new Set(nonMissing.map((v) => v.toLowerCase()));
    const unique = uniqueVals.size;

    let type: ColumnStats["type"] = "categorical";
    if (!nonMissing.length) type = "empty";
    else if (allNumeric) type = "numeric";
    else if (unique <= 2) type = "boolean";

    let min: number | undefined, max: number | undefined, mean: number | undefined, std: number | undefined, outliers: number | undefined;
    if (type === "numeric") {
      min = Math.min(...nums);
      max = Math.max(...nums);
      mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      const v = nums.reduce((a, b) => a + (b - (mean ?? 0)) ** 2, 0) / nums.length;
      std = Math.sqrt(v);
      // outliers: |z| > 3
      outliers = std > 0 ? nums.filter((n) => Math.abs((n - (mean ?? 0)) / std!) > 3).length : 0;
    }

    return {
      name: h,
      type,
      missing,
      missingPct: col.length ? (missing / col.length) * 100 : 0,
      unique,
      min, max, mean, std, outliers,
    };
  });

  const targetColumn = detectTarget(headers);
  let classBalance: Record<string, number> | undefined;
  if (targetColumn) {
    const idx = headers.indexOf(targetColumn);
    if (idx >= 0) {
      classBalance = {};
      for (const r of rows) {
        const v = (r[idx] ?? "").toString();
        if (isEmpty(v)) continue;
        classBalance[v] = (classBalance[v] ?? 0) + 1;
      }
      if (Object.keys(classBalance).length > 10) classBalance = undefined; // not classification
    }
  }

  const warnings: string[] = [];
  const missingPct = (missingCells / totalCells) * 100;
  if (missingPct > 5) warnings.push(`High missingness: ${missingPct.toFixed(1)}% of cells are empty.`);
  if (duplicates > 0) warnings.push(`${duplicates} duplicate row(s) detected.`);
  if (totalRows < 100) warnings.push(`Small dataset: only ${totalRows} rows.`);
  if (classBalance) {
    const counts = Object.values(classBalance);
    const ratio = Math.min(...counts) / Math.max(...counts);
    if (ratio < 0.4) warnings.push(`Class imbalance detected (ratio ${ratio.toFixed(2)}).`);
  }
  const emptyCols = columnStats.filter((c) => c.type === "empty").length;
  if (emptyCols > 0) warnings.push(`${emptyCols} column(s) are entirely empty.`);

  return {
    rows: totalRows,
    columns: headers.length,
    missingPercentage: +missingPct.toFixed(2),
    duplicates,
    columnStats,
    classBalance,
    targetColumn,
    warnings,
  };
}
