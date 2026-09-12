import { useState, useRef, useEffect } from "react";
import { ChannelRestrictedPencil, SelectEditPencil, TextEditPencil, UploadButton } from "./inputs";
import { ColConfig, Column, Row, SortDir, SortLevel } from "../types";

export function ColumnMenu({ col, isSortedAsc, isSortedDesc, filterValue, filterExclude, filterOptions, onSort, onFilter, onHideColumn, onClose, showFilter = true }: {
  col: Column; isSortedAsc: boolean; isSortedDesc: boolean; filterValue: string[]; filterExclude: boolean;
  filterOptions: { id: string; label: string }[];
  onSort: (dir: "asc" | "desc") => void; onFilter: (val: string[], exclude: boolean) => void; onHideColumn: () => void; onClose: () => void;
  showFilter?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [exclude, setExclude] = useState(filterExclude);

  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 30);
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const menuItem = (label: string, icon: string, active: boolean, onClick: () => void) => (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
        padding: "7px 12px", fontFamily: "var(--font-sans)", fontSize: "13px",
        color: active ? "var(--color-primary)" : "var(--color-foreground)",
        fontWeight: active ? 600 : 400,
        background: active ? "rgba(222,133,0,0.07)" : "transparent",
        border: "none", cursor: "pointer", transition: "background 0.1s",
      }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "var(--color-muted)"; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
    >
      {icon && <span style={{ fontSize: "12px", opacity: 0.7, width: 14, textAlign: "center" }}>{icon}</span>}
      {label}
    </button>
  );

  return (
    <div ref={ref} onClick={(e) => e.stopPropagation()} style={{
      position: "absolute", top: "calc(100% + 4px)", left: 0,
      background: "var(--color-card)", border: "1px solid var(--color-border)",
      borderRadius: 6, boxShadow: "0 6px 20px rgba(0,0,0,0.12)", minWidth: 260, zIndex: 50, overflow: "visible",
    }}>
      {menuItem("▲ Add to Sort (ASC)", "", isSortedAsc, () => { onSort("asc"); onClose(); })}
      {menuItem("▼ Add to Sort (DESC)", "", isSortedDesc, () => { onSort("desc"); onClose(); })}
      <div style={{ borderTop: "1px solid var(--color-border)", margin: "4px 0" }} />
      {menuItem("Remove From View", "", false, () => { onHideColumn(); onClose(); })}
      {showFilter && (() => {
        const searchTerms = search.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
        const filtered = filterOptions
          .filter((o) => searchTerms.length === 0 || searchTerms.some((t) => o.label.toLowerCase().includes(t)))
          .sort((a, b) => {
            const aChecked = filterValue.includes(a.id);
            const bChecked = filterValue.includes(b.id);
            if (aChecked && !bChecked) return -1;
            if (!aChecked && bChecked) return 1;
            return 0;
          });
        const allSelected = filtered.length > 0 && filtered.every((o) => filterValue.includes(o.id));
        const toggleAll = () => {
          const next = allSelected ? filterValue.filter((v) => !filtered.some((o) => o.id === v)) : [...new Set([...filterValue, ...filtered.map((o) => o.id)])];
          onFilter(next, exclude);
        };
        const toggle = (id: string) => {
          const next = filterValue.includes(id) ? filterValue.filter((v) => v !== id) : [...filterValue, id];
          onFilter(next, exclude);
        };
        const highlightMatch = (label: string) => {
          if (searchTerms.length === 0) return <span>{label}</span>;
          const term = searchTerms.find((t) => label.toLowerCase().includes(t));
          if (!term) return <span>{label}</span>;
          const idx = label.toLowerCase().indexOf(term);
          return <span>{label.slice(0, idx)}<strong>{label.slice(idx, idx + term.length)}</strong>{label.slice(idx + term.length)}</span>;
        };
        return (
          <>
            <div style={{ height: 1, background: "var(--color-border)", margin: "2px 0" }} />
            <div style={{ padding: "8px 10px 4px" }}>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const terms = search.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
                    if (terms.length === 0) return;
                    const matched = filterOptions.filter((o) => terms.includes(o.label.toLowerCase())).map((o) => o.id);
                    if (matched.length > 0) onFilter([...new Set([...filterValue, ...matched])], exclude);
                    setSearch("");
                  }
                }}
                placeholder="Search…"
                style={{ width: "100%", padding: "5px 8px", fontFamily: "var(--font-sans)", fontSize: "12px", background: "var(--color-muted)", border: "1px solid var(--color-border)", borderRadius: 4, color: "var(--color-foreground)", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            {/* Select all / Clear / Exclude row */}
            <div style={{ display: "flex", alignItems: "center", padding: "4px 12px 4px", gap: 8, borderBottom: "1px solid var(--color-border)" }}>
              <button onClick={toggleAll} style={{ fontFamily: "var(--font-sans)", fontSize: "11px", color: "var(--color-primary)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                {allSelected ? "Deselect all" : "Select all"}
              </button>
              {filterValue.length > 0 && <>
                <span style={{ color: "var(--color-border)" }}>·</span>
                <button onClick={() => onFilter([], false)} style={{ fontFamily: "var(--font-sans)", fontSize: "11px", color: "var(--color-muted-foreground)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Clear</button>
              </>}
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontFamily: "var(--font-sans)", fontSize: "11px", color: "var(--color-muted-foreground)" }}>Exclude</span>
                <button
                  onClick={() => { const next = !exclude; setExclude(next); onFilter(filterValue, next); }}
                  style={{ width: 28, height: 16, borderRadius: 8, background: exclude ? "var(--color-primary)" : "var(--color-border)", border: "none", cursor: "pointer", position: "relative", transition: "background 0.15s", padding: 0, flexShrink: 0 }}
                >
                  <span style={{ position: "absolute", top: 2, left: exclude ? 14 : 2, width: 12, height: 12, borderRadius: "50%", background: "#fff", transition: "left 0.15s", display: "block" }} />
                </button>
              </div>
            </div>
            {/* Options list */}
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              {filtered.length === 0 ? (
                <div style={{ padding: "10px 12px", fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--color-muted-foreground)" }}>No matches</div>
              ) : filtered.map((o) => (
                <label key={o.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px", cursor: "pointer", background: filterValue.includes(o.id) ? "rgba(222,133,0,0.07)" : "transparent" }}
                  onMouseEnter={(e) => { if (!filterValue.includes(o.id)) (e.currentTarget as HTMLElement).style.background = "var(--color-muted)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = filterValue.includes(o.id) ? "rgba(222,133,0,0.07)" : "transparent"; }}
                >
                  <input type="checkbox" checked={filterValue.includes(o.id)} onChange={() => toggle(o.id)} style={{ accentColor: "var(--color-primary)", width: 12, height: 12, flexShrink: 0 }} />
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--color-foreground)" }}>{highlightMatch(o.label)}</span>
                </label>
              ))}
            </div>
          </>
        );
      })()}
    </div>
  );
}

// ─── RowMenu ──────────────────────────────────────────────────────────────────


export function RowMenu({ canDelete }: { canDelete: boolean }) {
  const [open, setOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 28, height: 28, border: "none", borderRadius: 4,
          background: open ? "var(--color-muted)" : "transparent",
          color: "var(--color-muted-foreground)", cursor: "pointer",
          transition: "background 0.15s, color 0.15s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--color-muted)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--color-foreground)"; }}
        onMouseLeave={(e) => { if (!open) { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--color-muted-foreground)"; } }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <circle cx="7" cy="2.5" r="1.2" />
          <circle cx="7" cy="7" r="1.2" />
          <circle cx="7" cy="11.5" r="1.2" />
        </svg>
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 4, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: 120, zIndex: 100 }}>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => { if (canDelete) setOpen(false); }}
              onMouseEnter={(e) => { if (!canDelete) setShowTooltip(true); if (canDelete) (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.07)"; }}
              onMouseLeave={(e) => { setShowTooltip(false); (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 14px", fontFamily: "var(--font-sans)", fontSize: "13px", fontWeight: 400, color: canDelete ? "#ef4444" : "var(--color-muted-foreground)", background: "transparent", border: "none", cursor: canDelete ? "pointer" : "not-allowed", opacity: canDelete ? 1 : 0.45, transition: "background 0.1s" }}
            >
              Delete
            </button>
            {showTooltip && !canDelete && (
              <div style={{ position: "absolute", top: "50%", right: "calc(100% + 8px)", transform: "translateY(-50%)", background: "#1a2533", color: "#f0f2f4", fontFamily: "var(--font-sans)", fontSize: "12px", fontWeight: 400, padding: "6px 10px", borderRadius: 4, whiteSpace: "nowrap", pointerEvents: "none", zIndex: 200, boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
                Products must be inactive in order to be deleted.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── S3 upload helper ─────────────────────────────────────────────────────────


export function TableRow({ index, row, columns, onToggle, onEdit, onUpload, uploadFolder = "products", uploadAccept = "image/*", clipboardActive, clipboardColKey, clipboardSelected, onClipboardClick }: { index: number; row: Row; columns: Column[]; onToggle: (key: string, val: boolean) => void; onEdit?: (key: string, val: string) => void; onUpload?: (urls: { fullUrl: string; webUrl: string } | string) => void; uploadFolder?: string; uploadAccept?: string; clipboardActive?: boolean; clipboardColKey?: string | null; clipboardSelected?: boolean; onClipboardClick?: (colKey: string, shiftKey: boolean) => void }) {
  const [hovered, setHovered] = useState(false);
  const inClipboardMode = !!clipboardActive;

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: hovered && !inClipboardMode ? "rgba(40,58,77,0.06)" : index % 2 === 0 ? "transparent" : "rgba(0,0,0,0.018)", transition: "background 0.1s", cursor: inClipboardMode ? "pointer" : "default" }}
    >
      {columns.map((col) => (
        <td
          key={col.key}
          style={{ padding: col.thumbnail ? "4px 8px" : "8px 12px", textAlign: "left", borderBottom: "1px solid var(--color-border)", background: clipboardSelected && clipboardColKey === col.key ? "rgba(222,133,0,0.18)" : undefined, boxShadow: clipboardSelected && clipboardColKey === col.key ? "inset 3px 0 0 #de8500" : undefined }}
          onClick={inClipboardMode && !col.thumbnail && (!clipboardColKey || clipboardColKey === col.key) ? (e) => onClipboardClick?.(col.key, e.shiftKey) : undefined}
        >
          {col.thumbnail ? (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {!col.readonly && <UploadButton visible={hovered} onUpload={(url) => onUpload?.(url)} folder={uploadFolder} itemId={row.id as string} accept={uploadAccept} />}
              <div style={{ width: 75, height: 50, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {(row[col.key] as string | undefined) ? (
                  <img src={row[col.key] as string} alt="" style={{ maxHeight: 50, maxWidth: 75, objectFit: "contain", display: "block", borderRadius: 3 }} />
                ) : (
                  <div style={{ height: 34, width: 48, borderRadius: 3, background: "var(--color-muted)", border: "1px dashed var(--color-border)", flexShrink: 0 }} />
                )}
              </div>
            </div>
          ) : col.status ? (
            <span style={{ fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 8px", borderRadius: 3, background: row[col.key] === "Active" ? "rgba(34,197,94,0.12)" : "rgba(100,116,139,0.12)", color: row[col.key] === "Active" ? "#16a34a" : "#64748b", display: "inline-block" }}>
              {row[col.key] as string}
            </span>
          ) : col.boolean ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 15, display: "flex", alignItems: "center" }}>
                {row[col.key] ? (
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M3 7.5L6.5 11L12 4" stroke="var(--color-primary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : col.key === "dataComplete" ? (
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M2 2l9 9M11 2L2 11" stroke="#e53e3e" strokeWidth="1.75" strokeLinecap="round" />
                  </svg>
                ) : null}
              </div>
              {col.key === "channelRestricted" && (
                <ChannelRestrictedPencil value={!!row[col.key]} visible={hovered} onChange={(val) => onToggle("channelRestricted", val)} />
              )}
              {(col.key === "new" || col.key === "seasonal") && (
                <ChannelRestrictedPencil value={!!row[col.key]} visible={hovered} onChange={(val) => onToggle(col.key, val)} />
              )}
            </div>
          ) : onEdit && col.editable && col.options ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "var(--color-foreground)" }}>{row[col.key] as string}</span>
              <SelectEditPencil value={row[col.key] as string} visible={hovered} label={col.label} options={col.options} onChange={(val) => onEdit(col.key, val)} />
            </div>
          ) : onEdit && col.editable ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "var(--color-foreground)" }}>{row[col.key] as string}</span>
              <TextEditPencil value={row[col.key] as string} visible={hovered} label={col.label} onChange={(val) => onEdit(col.key, val)} />
            </div>
          ) : (
            <span style={{ fontFamily: col.mono ? "var(--font-mono)" : "var(--font-sans)", fontSize: col.mono ? "12px" : "13px", color: col.mono ? "var(--color-primary)" : "var(--color-foreground)", letterSpacing: col.mono ? "0.04em" : 0 }}>
              {String(row[col.key] ?? "")}
            </span>
          )}
        </td>
      ))}
      <td style={{ padding: "6px 16px 6px 8px", borderBottom: "1px solid var(--color-border)", width: 36 }}>
        <div style={{ opacity: hovered ? 1 : 0, transition: "opacity 0.15s" }}>
          <RowMenu canDelete={row.status !== "Active"} />
        </div>
      </td>
    </tr>
  );
}

// ─── Types & constants ────────────────────────────────────────────────────────


export function ColumnManagerModal({ columns, config, onChange, onClose }: {
  columns: Column[];
  config: ColConfig[];
  onChange: (next: ColConfig[]) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<ColConfig[]>(config);
  const dragIdx = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  useEffect(() => {
    function handle(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onClose]);

  function toggleVisible(key: string) {
    setLocal((prev) => prev.map((c) => c.key === key ? { ...c, visible: !c.visible } : c));
  }

  function onDragStart(i: number) { dragIdx.current = i; }
  function onDragEnter(i: number) { setDragOver(i); }
  function onDragEnd() {
    if (dragIdx.current !== null && dragOver !== null && dragIdx.current !== dragOver) {
      const next = [...local];
      const [moved] = next.splice(dragIdx.current, 1);
      next.splice(dragOver, 0, moved);
      setLocal(next);
    }
    dragIdx.current = null;
    setDragOver(null);
  }

  const labelOf = (key: string) => columns.find((c) => c.key === key)?.label || key;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(26,37,51,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", width: 380, maxWidth: "calc(100vw - 48px)", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid var(--color-border)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-secondary)" }}>
            Columns
          </div>
          <button onClick={onClose} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, border: "none", borderRadius: 4, background: "transparent", color: "var(--color-muted-foreground)", cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          <div style={{ padding: "4px 24px 10px", fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--color-muted-foreground)" }}>
            Toggle visibility or drag to reorder.
          </div>
          {local.map((cfg, i) => {
            const label = labelOf(cfg.key);
            const isDraggingOver = dragOver === i;
            return (
              <div
                key={cfg.key}
                draggable
                onDragStart={() => onDragStart(i)}
                onDragEnter={() => onDragEnter(i)}
                onDragOver={(e) => e.preventDefault()}
                onDragEnd={onDragEnd}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 24px", cursor: "grab", background: isDraggingOver ? "rgba(40,58,77,0.08)" : "transparent", borderTop: isDraggingOver ? "2px solid var(--color-primary)" : "2px solid transparent", transition: "background 0.1s", userSelect: "none" }}
              >
                {/* drag handle */}
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: "var(--color-muted-foreground)", flexShrink: 0 }}>
                  <circle cx="4" cy="3" r="1" fill="currentColor" /><circle cx="8" cy="3" r="1" fill="currentColor" />
                  <circle cx="4" cy="6" r="1" fill="currentColor" /><circle cx="8" cy="6" r="1" fill="currentColor" />
                  <circle cx="4" cy="9" r="1" fill="currentColor" /><circle cx="8" cy="9" r="1" fill="currentColor" />
                </svg>
                {/* toggle */}
                <button
                  onClick={() => toggleVisible(cfg.key)}
                  style={{ width: 32, height: 18, borderRadius: 9, border: "none", cursor: "pointer", flexShrink: 0, background: cfg.visible ? "var(--color-secondary)" : "var(--color-muted)", transition: "background 0.2s", position: "relative", padding: 0 }}
                >
                  <span style={{ position: "absolute", top: 2, left: cfg.visible ? 16 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s", display: "block" }} />
                </button>
                <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: cfg.visible ? "var(--color-foreground)" : "var(--color-muted-foreground)", flex: 1 }}>{label}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8, padding: "16px 24px", borderTop: "1px solid var(--color-border)" }}>
          <button
            onClick={() => { onChange(local); onClose(); }}
            style={{ flex: 1, fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "8px 0", background: "var(--color-secondary)", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
          >
            Apply
          </button>
          <button
            onClick={onClose}
            style={{ flex: 1, fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "8px 0", background: "var(--color-muted)", color: "var(--color-muted-foreground)", border: "1px solid var(--color-border)", borderRadius: 4, cursor: "pointer" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SortModal ────────────────────────────────────────────────────────────────


export function SortModal({ columns, levels, onApply, onClose }: {
  columns: Column[];
  levels: SortLevel[];
  onApply: (levels: SortLevel[]) => void;
  onClose: () => void;
}) {
  const sortableColumns = columns.filter((c) => !c.thumbnail);
  const [draft, setDraft] = useState<SortLevel[]>(levels.length > 0 ? [...levels] : [{ key: sortableColumns[0]?.key ?? "", dir: "asc" }]);

  const addLevel = () => {
    if (draft.length >= 10) return;
    const used = new Set(draft.map((l) => l.key));
    const next = sortableColumns.find((c) => !used.has(c.key));
    if (next) setDraft([...draft, { key: next.key, dir: "asc" }]);
  };

  const removeLevel = (i: number) => setDraft(draft.filter((_, idx) => idx !== i));
  const moveUp = (i: number) => { if (i === 0) return; const d = [...draft]; [d[i - 1], d[i]] = [d[i], d[i - 1]]; setDraft(d); };
  const moveDown = (i: number) => { if (i === draft.length - 1) return; const d = [...draft]; [d[i], d[i + 1]] = [d[i + 1], d[i]]; setDraft(d); };
  const setKey = (i: number, key: string) => { const d = [...draft]; d[i] = { ...d[i], key }; setDraft(d); };
  const setDir = (i: number, dir: SortDir) => { const d = [...draft]; d[i] = { ...d[i], dir }; setDraft(d); };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)" }} onClick={onClose}>
      <div style={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.18)", width: 520, maxWidth: "95vw", padding: 0, overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 12px", borderBottom: "1px solid var(--color-border)" }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "14px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-foreground)" }}>Sort</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "var(--color-muted-foreground)", lineHeight: 1, padding: "0 2px" }}>×</button>
        </div>
        <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 8, maxHeight: "60vh", overflowY: "auto" }}>
          {draft.length === 0 && (
            <div style={{ color: "var(--color-muted-foreground)", fontSize: "13px", textAlign: "center", padding: "24px 0" }}>No sort levels. Add one below.</div>
          )}
          {draft.map((level, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <button onClick={() => moveUp(i)} disabled={i === 0} style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "var(--color-border)" : "var(--color-muted-foreground)", lineHeight: 1, fontSize: "11px", padding: "1px 3px" }}>▲</button>
                <button onClick={() => moveDown(i)} disabled={i === draft.length - 1} style={{ background: "none", border: "none", cursor: i === draft.length - 1 ? "default" : "pointer", color: i === draft.length - 1 ? "var(--color-border)" : "var(--color-muted-foreground)", lineHeight: 1, fontSize: "11px", padding: "1px 3px" }}>▼</button>
              </div>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "11px", color: "var(--color-muted-foreground)", letterSpacing: "0.06em", width: 24, textAlign: "center", flexShrink: 0 }}>{i === 0 ? "BY" : "THEN"}</span>
              <select
                value={level.key}
                onChange={(e) => setKey(i, e.target.value)}
                style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-card)", color: "var(--color-foreground)", fontSize: "13px", fontFamily: "var(--font-sans)" }}
              >
                {sortableColumns.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
              <select
                value={level.dir}
                onChange={(e) => setDir(i, e.target.value as SortDir)}
                style={{ width: 120, padding: "6px 10px", borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-card)", color: "var(--color-foreground)", fontSize: "13px", fontFamily: "var(--font-sans)" }}
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
              <button onClick={() => removeLevel(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted-foreground)", fontSize: "16px", lineHeight: 1, padding: "0 4px", flexShrink: 0 }} onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#e53e3e")} onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--color-muted-foreground)")}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px 16px", borderTop: "1px solid var(--color-border)" }}>
          <button
            onClick={addLevel}
            disabled={draft.length >= 10}
            style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: draft.length >= 10 ? "var(--color-border)" : "var(--color-primary)", background: "none", border: "none", cursor: draft.length >= 10 ? "default" : "pointer", padding: 0, fontWeight: 500 }}
          >
            + Add Level
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { setDraft([]); }}
              style={{ fontFamily: "var(--font-sans)", fontSize: "13px", padding: "7px 16px", borderRadius: 6, border: "1px solid var(--color-border)", background: "transparent", color: "var(--color-foreground)", cursor: "pointer" }}
            >
              Clear All
            </button>
            <button
              onClick={() => onApply(draft)}
              style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "7px 20px", borderRadius: 6, border: "none", background: "var(--color-primary)", color: "#fff", cursor: "pointer" }}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

