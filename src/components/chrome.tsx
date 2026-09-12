import { useState, useRef, useEffect } from "react";
import { BulkUploadModal } from "./modals";
import { TableRow } from "./table";
import { HAMBURGER_ITEMS } from "../types";

export function ClipboardOverlay({ count, uniqueCount, separator, onSeparatorChange, onCopy, onClear, onClose }: {
  count: number; uniqueCount: number; separator: string;
  onSeparatorChange: (v: string) => void;
  onCopy: () => void; onClear: () => void; onClose: () => void;
}) {
  const [pos, setPos] = useState({ x: window.innerWidth - 260, y: window.innerHeight - 280 });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [copied, setCopied] = useState(false);

  function onMouseDown(e: React.MouseEvent) {
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current) return;
      setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    }
    function onUp() { dragging.current = false; }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  function handleCopy() {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 500, width: 220, background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", userSelect: "none" }}>
      {/* Drag handle / header */}
      <div
        onMouseDown={onMouseDown}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px 8px", cursor: "grab", borderBottom: "1px solid var(--color-border)" }}
      >
        <span style={{ fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>Copy Values</span>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onClose}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, border: "none", borderRadius: 4, background: "transparent", color: "var(--color-muted-foreground)", cursor: "pointer" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--color-muted)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
      </div>
      {/* Stats */}
      <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid var(--color-border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--color-muted-foreground)" }}>Selected</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--color-foreground)", fontWeight: 600 }}>{count}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--color-muted-foreground)" }}>Unique</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--color-foreground)", fontWeight: 600 }}>{uniqueCount}</span>
        </div>
      </div>
      {/* Separator */}
      <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid var(--color-border)" }}>
        <label style={{ display: "block", fontFamily: "var(--font-display)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-muted-foreground)", marginBottom: 5 }}>Separator</label>
        <input
          type="text"
          value={separator}
          onChange={(e) => onSeparatorChange(e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ width: "100%", fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--color-foreground)", background: "var(--color-muted)", border: "1px solid var(--color-border)", borderRadius: 4, padding: "5px 8px", outline: "none", boxSizing: "border-box" }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-primary)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
        />
      </div>
      {/* Actions */}
      <div style={{ display: "flex", gap: 6, padding: "10px 12px" }}>
        <button
          onClick={onClear}
          style={{ flex: 1, fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "6px 0", background: "transparent", color: "var(--color-muted-foreground)", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", cursor: "pointer", transition: "background 0.15s" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--color-muted)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >Clear</button>
        <button
          onClick={handleCopy}
          disabled={count === 0}
          style={{ flex: 2, fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "6px 0", background: count === 0 ? "var(--color-muted)" : copied ? "#16a34a" : "var(--color-secondary)", color: count === 0 ? "var(--color-muted-foreground)" : "#ffffff", border: "1px solid transparent", borderRadius: "var(--radius)", cursor: count === 0 ? "default" : "pointer", transition: "background 0.2s" }}
        >{copied ? "Copied!" : "Copy"}</button>
      </div>
    </div>
  );
}

// ─── HamburgerMenu ────────────────────────────────────────────────────────────

// ─── BulkUploadModal ──────────────────────────────────────────────────────────


export function HamburgerMenu({ onTemporaryExclusions, onHideShowColumns, onDownloadCsv, onBulkUpload }: { onTemporaryExclusions: () => void; onHideShowColumns: () => void; onDownloadCsv: () => void; onBulkUpload: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  function handleItem(label: string) {
    setOpen(false);
    if (label === "Temporary Exclusions") onTemporaryExclusions();
    if (label === "Hide / Show Columns") onHideShowColumns();
    if (label === "Download as CSV") onDownloadCsv();
    if (label === "Upload Images") onBulkUpload();
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, background: open ? "var(--color-primary)" : "var(--color-secondary)", color: "#ffffff", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", cursor: "pointer", transition: "background 0.15s", flexShrink: 0 }}
        onMouseEnter={(e) => { if (!open) (e.currentTarget as HTMLButtonElement).style.opacity = "0.8"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1 3h12M1 7h12M1 11h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 4, boxShadow: "0 6px 20px rgba(0,0,0,0.12)", zIndex: 200, minWidth: 200, overflow: "hidden" }}>
          {HAMBURGER_ITEMS.map((label) => (
            <button
              key={label}
              onClick={() => handleItem(label)}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 16px", fontFamily: "var(--font-sans)", fontSize: "13px", fontWeight: 500, color: "var(--color-foreground)", background: "transparent", border: "none", cursor: "pointer", transition: "background 0.1s" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--color-muted)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TableRow ─────────────────────────────────────────────────────────────────

