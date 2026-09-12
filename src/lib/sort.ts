import { ColumnManagerModal } from "../components/table";
import { Row, SortLevel } from "../types";

export function sortRows(rows: Row[], levels: SortLevel[]): Row[] {
  if (levels.length === 0) return rows;
  return [...rows].sort((a, b) => {
    for (const { key, dir } of levels) {
      const av = a[key] ?? "";
      const bv = b[key] ?? "";
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
      if (cmp !== 0) return dir === "asc" ? cmp : -cmp;
    }
    return 0;
  });
}

// ─── ColumnManagerModal ───────────────────────────────────────────────────────

