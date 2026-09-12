import { useState, useRef, useEffect, useMemo } from "react";
import { DataSettingsModal } from "./modals";
import { ColumnMenu } from "./table";
import { S3_ENABLED, uploadToS3 } from "../lib/s3";

export function InfoButton({ text, alignRight }: { text: string; alignRight?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <span
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 13, height: 13, borderRadius: "50%", border: "1px solid currentColor",
          fontSize: "8px", fontWeight: 700, fontFamily: "var(--font-sans)",
          color: "var(--color-muted-foreground)", cursor: "default", flexShrink: 0,
          lineHeight: 1, letterSpacing: 0, textTransform: "none", opacity: 0.6,
          transition: "opacity 0.15s",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.6")}
      >
        i
      </span>
      {show && (
        <span style={{
          position: "absolute", top: "calc(100% + 7px)",
          ...(alignRight ? { right: 0 } : { left: "50%", transform: "translateX(-50%)" }),
          background: "#1a2533", color: "#e8eaf0", fontFamily: "var(--font-sans)",
          fontSize: "12px", fontWeight: 400, lineHeight: 1.5, padding: "7px 10px",
          borderRadius: 4, whiteSpace: "normal", width: 220, pointerEvents: "none",
          zIndex: 200, boxShadow: "0 4px 12px rgba(0,0,0,0.2)", letterSpacing: 0, textTransform: "none",
        }}>
          {text}
        </span>
      )}
    </span>
  );
}

// ─── ColumnMenu ───────────────────────────────────────────────────────────────


export function UploadButton({ visible, onUpload, folder = "products", itemId, accept = "image/*" }: { visible: boolean; onUpload: (urls: { fullUrl: string; webUrl: string } | string) => void; folder?: string; itemId?: string; accept?: string }) {
  const [uploading, setUploading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (S3_ENABLED && itemId) {
      setUploading(true);
      try {
        const urls = await uploadToS3(file, folder, itemId);
        onUpload(urls);
      } catch (err) {
        console.error("S3 upload failed:", err);
      } finally {
        setUploading(false);
      }
    } else {
      // Fallback: base64 for local dev without credentials
      const reader = new FileReader();
      reader.onload = () => onUpload(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  if (uploading) {
    return <div style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: "spin 1s linear infinite", color: "var(--color-secondary)" }}>
        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20" strokeDashoffset="10" strokeLinecap="round" />
      </svg>
    </div>;
  }

  return (
    <label
      title="Upload image"
      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 4, border: "1px solid var(--color-border)", background: "var(--color-card)", cursor: "pointer", flexShrink: 0, opacity: visible ? 1 : 0, transition: "opacity 0.15s", color: "var(--color-muted-foreground)" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-primary)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--color-primary)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-muted-foreground)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)"; }}
    >
      <input type="file" accept={accept} style={{ display: "none" }} onChange={handleChange} />
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="2" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="5" cy="5.5" r="1.2" stroke="currentColor" strokeWidth="1.2" />
        <path d="M1 11l4-4 3 3 2-2 5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );
}

// ─── ChannelRestrictedPencil ──────────────────────────────────────────────────


export function ChannelRestrictedPencil({ value, visible, onChange }: { value: boolean; visible: boolean; onChange: (val: boolean) => void }) {
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

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, border: "none", borderRadius: 3, background: open ? "var(--color-muted)" : "transparent", color: open ? "var(--color-primary)" : "var(--color-muted-foreground)", cursor: "pointer", opacity: visible || open ? 1 : 0, transition: "opacity 0.15s, color 0.15s", padding: 0, flexShrink: 0 }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--color-primary)")}
        onMouseLeave={(e) => { if (!open) (e.currentTarget as HTMLButtonElement).style.color = "var(--color-muted-foreground)"; }}
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M8.5 1.5a1.414 1.414 0 0 1 2 2L4 10 1 11l1-3 6.5-6.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.12)", zIndex: 100, overflow: "hidden", minWidth: 80 }}>
          {([true, false] as boolean[]).map((opt) => (
            <button
              key={String(opt)}
              onClick={() => { onChange(opt); setOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 12px", fontFamily: "var(--font-sans)", fontSize: "13px", fontWeight: value === opt ? 600 : 400, color: value === opt ? "var(--color-primary)" : "var(--color-foreground)", background: value === opt ? "rgba(222,133,0,0.07)" : "transparent", border: "none", cursor: "pointer", textAlign: "left", transition: "background 0.1s" }}
              onMouseEnter={(e) => { if (value !== opt) (e.currentTarget as HTMLButtonElement).style.background = "var(--color-muted)"; }}
              onMouseLeave={(e) => { if (value !== opt) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              {opt ? "Yes" : "No"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TextEditPencil ───────────────────────────────────────────────────────────


export function TextEditPencil({ value, visible, label, onChange }: { value: string; visible: boolean; label: string; onChange: (val: string) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(value);
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 30);
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  function save() {
    onChange(draft.trim());
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, border: "none", borderRadius: 3, background: open ? "var(--color-muted)" : "transparent", color: open ? "var(--color-primary)" : "var(--color-muted-foreground)", cursor: "pointer", opacity: visible || open ? 1 : 0, transition: "opacity 0.15s, color 0.15s", padding: 0, flexShrink: 0 }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--color-primary)")}
        onMouseLeave={(e) => { if (!open) (e.currentTarget as HTMLButtonElement).style.color = "var(--color-muted-foreground)"; }}
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M8.5 1.5a1.414 1.414 0 0 1 2 2L4 10 1 11l1-3 6.5-6.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 6, boxShadow: "0 6px 20px rgba(0,0,0,0.14)", zIndex: 100, padding: "10px 12px", minWidth: 200 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-muted-foreground)", marginBottom: 6 }}>
            {label}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setOpen(false); }}
            style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "var(--color-foreground)", background: "var(--color-muted)", border: "1px solid var(--color-border)", borderRadius: 4, padding: "5px 8px", outline: "none", width: "100%", boxSizing: "border-box" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-primary)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
          />
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button
              onClick={save}
              style={{ flex: 1, fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "5px 0", background: "var(--color-secondary)", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
            >
              Save
            </button>
            <button
              onClick={() => setOpen(false)}
              style={{ flex: 1, fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "5px 0", background: "var(--color-muted)", color: "var(--color-muted-foreground)", border: "1px solid var(--color-border)", borderRadius: 4, cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SelectEditPencil ─────────────────────────────────────────────────────────


export function SelectEditPencil({ value, visible, label, options, onChange }: { value: string; visible: boolean; label: string; options: string[]; onChange: (val: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) { setQuery(""); return; }
    setTimeout(() => inputRef.current?.focus(), 0);
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = ["", ...options];
    return q ? all.filter((o) => o.toLowerCase().includes(q)) : all;
  }, [query, options]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, border: "none", borderRadius: 3, background: open ? "var(--color-muted)" : "transparent", color: open ? "var(--color-primary)" : "var(--color-muted-foreground)", cursor: "pointer", opacity: visible || open ? 1 : 0, transition: "opacity 0.15s, color 0.15s", padding: 0, flexShrink: 0 }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--color-primary)")}
        onMouseLeave={(e) => { if (!open) (e.currentTarget as HTMLButtonElement).style.color = "var(--color-muted-foreground)"; }}
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M8.5 1.5a1.414 1.414 0 0 1 2 2L4 10 1 11l1-3 6.5-6.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 6, boxShadow: "0 6px 20px rgba(0,0,0,0.14)", zIndex: 100, minWidth: 240 }}>
          <div style={{ padding: "8px 8px 4px" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-muted-foreground)", paddingBottom: 6 }}>{label}</div>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              onClick={(e) => e.stopPropagation()}
              style={{ width: "100%", boxSizing: "border-box", fontFamily: "var(--font-sans)", fontSize: "13px", padding: "5px 8px", border: "1px solid var(--color-border)", borderRadius: 4, background: "var(--color-background)", color: "var(--color-foreground)", outline: "none" }}
            />
          </div>
          <div style={{ maxHeight: 224, overflowY: "auto", padding: "4px 8px 8px" }}>
            {filtered.length === 0 ? (
              <div style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "var(--color-muted-foreground)", padding: "6px 4px" }}>No matches</div>
            ) : filtered.map((opt) => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                style={{ display: "block", width: "100%", textAlign: "left", fontFamily: "var(--font-sans)", fontSize: "13px", padding: "6px 8px", border: "none", borderRadius: 4, cursor: "pointer", background: value === opt ? "var(--color-primary)" : "transparent", color: value === opt ? "#fff" : opt === "" ? "var(--color-muted-foreground)" : "var(--color-foreground)" }}
                onMouseEnter={(e) => { if (value !== opt) (e.currentTarget as HTMLButtonElement).style.background = "var(--color-muted)"; }}
                onMouseLeave={(e) => { if (value !== opt) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                {opt === "" ? "(None)" : opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DataSettingsModal ────────────────────────────────────────────────────────


export function MultiSelectDropdown({
  items, selected, onChange, placeholder, emptyText,
}: {
  items: { id: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  emptyText: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const filtered = items.filter((i) => i.label.toLowerCase().includes(search.toLowerCase()));
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const allFiltered = filtered.length > 0 && filtered.every((i) => selected.includes(i.id));
  const toggleAll = () => onChange(allFiltered ? selected.filter((id) => !filtered.some((i) => i.id === id)) : [...new Set([...selected, ...filtered.map((i) => i.id)])]);

  const summaryText = () => {
    if (selected.length === 0) return placeholder;
    if (selected.length === items.length) return `All (${items.length})`;
    if (selected.length === 1) return items.find((i) => i.id === selected[0])?.label ?? "1 selected";
    return `${selected.length} selected`;
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={items.length === 0}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 12px", background: "var(--color-muted)", border: "1px solid var(--color-border)",
          borderRadius: open ? "6px 6px 0 0" : 6, cursor: items.length === 0 ? "default" : "pointer",
          fontFamily: "var(--font-sans)", fontSize: "13px",
          color: items.length === 0 ? "var(--color-muted-foreground)" : selected.length === 0 ? "var(--color-muted-foreground)" : "var(--color-foreground)",
        }}
      >
        <span>{items.length === 0 ? emptyText : summaryText()}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none" }}>
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && items.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--color-card)", border: "1px solid var(--color-border)", borderTop: "none", borderRadius: "0 0 6px 6px", zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
          {/* Search */}
          <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--color-border)" }}>
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              style={{ width: "100%", padding: "5px 8px", fontFamily: "var(--font-sans)", fontSize: "12px", background: "var(--color-muted)", border: "1px solid var(--color-border)", borderRadius: 4, color: "var(--color-foreground)", outline: "none", boxSizing: "border-box" }}
            />
          </div>
          {/* Select all */}
          <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "var(--color-muted)", borderBottom: "1px solid var(--color-border)", cursor: "pointer" }}>
            <input type="checkbox" checked={allFiltered} onChange={toggleAll} style={{ accentColor: "var(--color-secondary)", width: 12, height: 12, flexShrink: 0 }} />
            <span style={{ fontFamily: "var(--font-sans)", fontSize: "11px", fontWeight: 600, color: "var(--color-foreground)" }}>
              {allFiltered ? "Deselect all" : "Select all"}{search ? " (filtered)" : ""}
            </span>
            <span style={{ marginLeft: "auto", fontFamily: "var(--font-sans)", fontSize: "11px", color: "var(--color-muted-foreground)" }}>
              {selected.length}/{items.length}
            </span>
          </label>
          {/* Items */}
          <div style={{ maxHeight: 180, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "10px 12px", fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--color-muted-foreground)" }}>No matches</div>
            ) : filtered.map((item) => (
              <label key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", cursor: "pointer", borderBottom: "1px solid var(--color-border)" }}>
                <input
                  type="checkbox"
                  checked={selected.includes(item.id)}
                  onChange={() => toggle(item.id)}
                  style={{ accentColor: "var(--color-secondary)", width: 12, height: 12, flexShrink: 0 }}
                />
                <span style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--color-foreground)" }}>{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


export function SingleSelectDropdown({
  items, selected, onChange, placeholder, emptyText,
}: {
  items: { id: string; label: string }[];
  selected: string | null;
  onChange: (next: string | null) => void;
  placeholder: string;
  emptyText: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const filtered = items.filter((i) => i.label.toLowerCase().includes(search.toLowerCase()));
  const selectedLabel = items.find((i) => i.id === selected)?.label;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={items.length === 0}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 12px", background: "var(--color-muted)", border: "1px solid var(--color-border)",
          borderRadius: open ? "6px 6px 0 0" : 6, cursor: items.length === 0 ? "default" : "pointer",
          fontFamily: "var(--font-sans)", fontSize: "13px",
          color: items.length === 0 || !selected ? "var(--color-muted-foreground)" : "var(--color-foreground)",
        }}
      >
        <span>{items.length === 0 ? emptyText : (selectedLabel ?? placeholder)}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none" }}>
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && items.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--color-card)", border: "1px solid var(--color-border)", borderTop: "none", borderRadius: "0 0 6px 6px", zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
          <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--color-border)" }}>
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              style={{ width: "100%", padding: "5px 8px", fontFamily: "var(--font-sans)", fontSize: "12px", background: "var(--color-muted)", border: "1px solid var(--color-border)", borderRadius: 4, color: "var(--color-foreground)", outline: "none", boxSizing: "border-box" }}
            />
          </div>
          {selected && (
            <button
              onClick={() => { onChange(null); setOpen(false); }}
              style={{ width: "100%", textAlign: "left", padding: "6px 12px", fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--color-muted-foreground)", background: "transparent", border: "none", borderBottom: "1px solid var(--color-border)", cursor: "pointer" }}
            >
              — Clear selection
            </button>
          )}
          <div style={{ maxHeight: 180, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "10px 12px", fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--color-muted-foreground)" }}>No matches</div>
            ) : filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => { onChange(item.id); setOpen(false); setSearch(""); }}
                style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--color-foreground)", background: selected === item.id ? "var(--color-muted)" : "transparent", border: "none", borderBottom: "1px solid var(--color-border)", cursor: "pointer" }}
              >
                {selected === item.id && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, color: "var(--color-secondary)" }}>
                    <path d="M1.5 5l3 3 4-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                <span style={{ marginLeft: selected === item.id ? 0 : 18 }}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

