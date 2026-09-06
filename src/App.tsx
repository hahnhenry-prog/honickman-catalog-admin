// v5 — header-update
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { supabase } from "./lib/supabase";
import honickmanLogo from "./assets/TheHonickmanCompanies-1.svg";

type Column = {
  key: string;
  label: string;
  mono?: boolean;
  thumbnail?: boolean;
  boolean?: boolean;
  status?: boolean;
  editable?: boolean;
  readonly?: boolean;
  info?: string;
  options?: string[];
};

type Row = Record<string, string | number | boolean>;

type TableData = {
  columns: Column[];
  rows: Row[];
};

const TABLES: Record<string, TableData> = {
  Products: {
    columns: [
      { key: "thumbnail", label: "Retail Image", thumbnail: true },
      { key: "id", label: "ID", mono: true, info: "Product ID imported directly from VIP. Cannot be edited." },
      { key: "description", label: "Description", info: "Product Description imported directly from VIP. Cannot be edited." },
      { key: "subId", label: "Sub ID", mono: true },
      { key: "subDescription", label: "Sub Description", info: "Description of the sub-brand associated with this product." },
      { key: "brandLogo", label: "Brand Logo", thumbnail: true, readonly: true, info: "Brand logo from the Brands table. Upload logos on the Brands tab." },
      { key: "brand", label: "Brand", info: "Set on the Sub-Brands table." },
      { key: "flavor", label: "Flavor", info: "Set on the Sub-Brands table." },
      { key: "containerTypeId", label: "Package ID", mono: true },
      { key: "package", label: "Package", info: "Set on the Packages table." },
      { key: "retailUpc", label: "Retail UPC", editable: true, info: "Retail UPC code for this product." },
      { key: "size", label: "Size", info: "From the Packages table." },
      { key: "retailUnitsPerCase", label: "Retail Units / Case", info: "From the Packages table." },
      { key: "consumableUnitsPerCase", label: "Consumable Units / Case", info: "From the Packages table." },
      { key: "channelRestricted", label: "Channel Restricted", boolean: true, info: "Hides the product from catalogs if it can only be sold into specific channels or customers." },
      { key: "pcny", label: "PCNY", boolean: true, info: "Sellable in PCNY" },
      { key: "pnb", label: "PNB", boolean: true, info: "Sellable in PNB" },
      { key: "cddv", label: "CDDV", boolean: true, info: "Sellable in CDDV" },
      { key: "cdp", label: "CDP", boolean: true, info: "Sellable in CDP" },
      { key: "new", label: "New", boolean: true, editable: true, info: "Mark this product as new." },
      { key: "seasonal", label: "Seasonal", boolean: true, editable: true, info: "Mark this product as seasonal." },
      { key: "dataComplete", label: "Data Complete", boolean: true, readonly: true, info: "Automatically set to Yes when Retail Image, Brand, Flavor, and Package are all filled in." },
      { key: "status", label: "Status", status: true, info: "System Status. Cannot be directly edited. A product is automatically set to inactive when it is discontinued in VIP in all three warehouses: Queens, Pennsauken, and Landover." },
    ],
    rows: [],
  },
  Brands: {
    columns: [
      { key: "brandLogo", label: "Brand Logo", thumbnail: true },
      { key: "id", label: "ID", mono: true, info: "Brand ID." },
      { key: "description", label: "Brand" },
      { key: "category", label: "Category", editable: true, options: ["Carbonated Soft Drinks", "Non-Carbonated Soft Drinks", "Water", "Sparkling Water & Seltzer", "Tea", "Coffee", "Isotonic, Sports & Protein", "Energy"] },
      { key: "status", label: "Status", status: true, info: "Active if at least one active product references this brand." },
    ],
    rows: [],
  },
  "Sub-Brands": {
    columns: [
      { key: "id", label: "ID", mono: true, info: "Sub-Brand ID imported directly from VIP. Cannot be edited." },
      { key: "description", label: "Description" },
      { key: "brand", label: "Brand", editable: true, info: "Parent brand for this sub-brand." },
      { key: "flavor", label: "Flavor", editable: true, info: "Flavor associated with this sub-brand." },
      { key: "status", label: "Status", status: true, info: "Active if at least one active product references this sub-brand." },
    ],
    rows: [],
  },
  Packages: {
    columns: [
      { key: "id", label: "ID", mono: true },
      { key: "description", label: "Description" },
      { key: "package", label: "Package" },
      { key: "size", label: "Size" },
      { key: "material", label: "Material" },
      { key: "retailUnitsPerCase", label: "Retail Units / Case" },
      { key: "consumableUnitsPerCase", label: "Consumable Units / Case" },
      { key: "status", label: "Status", status: true, info: "Active if at least one active product references this package." },
    ],
    rows: [],
  },
};

const TABS = ["Products", "Brands", "Sub-Brands", "Packages"] as const;
type Tab = (typeof TABS)[number];

// ─── InfoButton ───────────────────────────────────────────────────────────────

function InfoButton({ text, alignRight }: { text: string; alignRight?: boolean }) {
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

function ColumnMenu({ col, isSortedAsc, isSortedDesc, filterValue, filterExclude, filterOptions, onSort, onFilter, onHideColumn, onClose, showFilter = true }: {
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

function RowMenu({ canDelete }: { canDelete: boolean }) {
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

const S3_BUCKET = import.meta.env.VITE_AWS_S3_BUCKET as string | undefined;
const S3_REGION = "us-east-1";
const S3_ACCESS_KEY = import.meta.env.VITE_AWS_ACCESS_KEY_ID as string | undefined;
const S3_SECRET_KEY = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY as string | undefined;
const S3_ENABLED = !!(S3_BUCKET && S3_ACCESS_KEY && S3_SECRET_KEY);

async function fileToWebP(file: File, maxPx: number, quality: number): Promise<Blob> {
  const isSvg = file.type === "image/svg+xml";
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  if (isSvg) {
    // Load SVG via <img> to rasterize at a fixed size
    const url = URL.createObjectURL(file);
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || maxPx;
        const h = img.naturalHeight || maxPx;
        // For SVGs, always scale UP to maxPx on the longest side so the
        // rasterized WebP is high-res regardless of the SVG's intrinsic size.
        const scale = maxPx / Math.max(w, h);
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve();
      };
      img.onerror = reject;
      img.src = url;
    });
  } else {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  }
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => b ? resolve(b) : reject(new Error("toBlob failed")), "image/webp", quality)
  );
}

async function s3Put(client: unknown, key: string, body: File | Blob, contentType: string): Promise<void> {
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const url = await (getSignedUrl as Function)(
    client,
    new PutObjectCommand({ Bucket: S3_BUCKET!, Key: key, ContentType: contentType }),
    { expiresIn: 60 }
  );
  const res = await fetch(url, { method: "PUT", body, headers: { "Content-Type": contentType } });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
}

async function uploadToS3(file: File, folder: string, id: string): Promise<{ fullUrl: string; webUrl: string }> {
  const { S3Client } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    region: S3_REGION,
    credentials: { accessKeyId: S3_ACCESS_KEY!, secretAccessKey: S3_SECRET_KEY! },
  });
  const ext = file.name.split(".").pop() ?? "bin";
  const fullKey = `${folder}/full/${id}.${ext}`;
  const webKey = `${folder}/web/${id}.webp`;
  const webBlob = await fileToWebP(file, 1200, 0.85);
  await Promise.all([
    s3Put(client, fullKey, file, file.type),
    s3Put(client, webKey, webBlob, "image/webp"),
  ]);
  return {
    fullUrl: `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${fullKey}`,
    webUrl: `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${webKey}`,
  };
}

// ─── UploadButton ─────────────────────────────────────────────────────────────

function UploadButton({ visible, onUpload, folder = "products", itemId, accept = "image/*" }: { visible: boolean; onUpload: (urls: { fullUrl: string; webUrl: string } | string) => void; folder?: string; itemId?: string; accept?: string }) {
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

function ChannelRestrictedPencil({ value, visible, onChange }: { value: boolean; visible: boolean; onChange: (val: boolean) => void }) {
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

function TextEditPencil({ value, visible, label, onChange }: { value: string; visible: boolean; label: string; onChange: (val: string) => void }) {
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

function SelectEditPencil({ value, visible, label, options, onChange }: { value: string; visible: boolean; label: string; options: string[]; onChange: (val: string) => void }) {
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

const REQUIRED_HEADERS = [
  "Warehouse ID", "Warehouse", "Product ID", "Product Description",
  "Sub ID", "Sub Description", "Sub R12 Volume",
  "Brand ID", "Brand", "Package ID", "Package",
  "Product Ownership", "Product Status",
];

type ParsedRow = Record<string, string>;

type DataSettings = {
  fileName: string | null;
  csvText: string | null;  // raw text for re-download and re-parse; not base64
  parsedRows: ParsedRow[];
  statusesToInclude: string[];
  brandsToExclude: string[];   // Brand IDs
  packagesToExclude: string[]; // Package IDs
  fountainPackages: string[];  // Package IDs
  pcnyWarehouse: string | null;   // Warehouse ID
  pnbWarehouse: string | null;
  cddvWarehouse: string | null;
  cdpWarehouse: string | null;
};

const EMPTY_SETTINGS: DataSettings = {
  fileName: null, csvText: null, parsedRows: [],
  statusesToInclude: [], brandsToExclude: [], packagesToExclude: [], fountainPackages: [],
  pcnyWarehouse: null, pnbWarehouse: null, cddvWarehouse: null, cdpWarehouse: null,
};

function parseCsvText(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const parseRow = (line: string): string[] => {
    const cols: string[] = [];
    let cur = "", inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === "," && !inQuote) { cols.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    cols.push(cur.trim());
    return cols;
  };
  const headers = parseRow(lines[0]);
  return lines.slice(1).map((line) => {
    const vals = parseRow(line);
    const obj: ParsedRow = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
    return obj;
  });
}

// Multi-select dropdown with search, used for each filter
function MultiSelectDropdown({
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

function SingleSelectDropdown({
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

function DataSettingsModal({ settings, onSave, onClose }: {
  settings: DataSettings;
  onSave: (s: DataSettings) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<DataSettings>(settings);
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    function handle(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onClose]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      // Validate: must be text (CSV). xlsx is binary — detect by checking for PK header
      if (text.startsWith("PK") || !text.includes(",")) {
        setParseError("This file doesn't appear to be a CSV. Please export your spreadsheet as CSV and re-upload.");
        e.target.value = "";
        return;
      }
      const rows = parseCsvText(text);
      if (rows.length === 0) {
        setParseError("The file appears to be empty or has no data rows.");
        e.target.value = "";
        return;
      }
      const actualHeaders = Object.keys(rows[0]);
      const missing = REQUIRED_HEADERS.filter((h) => !actualHeaders.includes(h));
      if (missing.length > 0) {
        setParseError(`Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. Please check your file against the template.`);
        e.target.value = "";
        return;
      }
      // Validate that each ID maps to exactly one display value (duplicates ok, conflicts not)
      const isAlphanumeric = (s: string) => /^[a-zA-Z0-9]+$/.test(s);
      const checkIdConsistency = (idCol: string, valueCol: string, requireAlphanumericId = false, blankAs?: string): string | null => {
        const idToValue = new Map<string, string>();
        for (const r of rows) {
          const id = r[idCol]; const rawValue = r[valueCol];
          const value = (!rawValue || rawValue.trim() === "") && blankAs !== undefined ? blankAs : rawValue;
          if (!id || !value) continue;
          if (requireAlphanumericId && !isAlphanumeric(id)) continue;
          if (idToValue.has(id) && idToValue.get(id) !== value)
            return `${idCol} "${id}" has conflicting ${valueCol} values ("${idToValue.get(id)}" and "${value}").`;
          idToValue.set(id, value);
        }
        return null;
      };
      const cardinalityErrors = [
        checkIdConsistency("Product ID", "Product Description"),
        checkIdConsistency("Sub ID", "Sub Description", true),
        checkIdConsistency("Sub ID", "Sub R12 Volume", true, "0"),
        checkIdConsistency("Warehouse ID", "Warehouse"),
        checkIdConsistency("Brand ID", "Brand"),
        checkIdConsistency("Package ID", "Package"),
      ].filter(Boolean) as string[];
      if (cardinalityErrors.length > 0) {
        setParseError(`Data consistency errors found — please correct your file and re-upload:\n${cardinalityErrors.join("\n")}`);
        e.target.value = "";
        return;
      }
      // Store raw CSV text (not base64) — small enough for localStorage
      setLocal((prev) => ({
        ...prev,
        fileName: file.name,
        csvText: text,
        parsedRows: rows,
        // Preserve existing selections where the ID still exists in the new file
        statusesToInclude: prev.statusesToInclude.filter((s) => rows.some((r) => r["Product Status"] === s)),
        brandsToExclude: prev.brandsToExclude.filter((id) => rows.some((r) => r["Brand ID"] === id)),
        packagesToExclude: prev.packagesToExclude.filter((id) => rows.some((r) => r["Package ID"] === id)),
        fountainPackages: prev.fountainPackages.filter((id) => rows.some((r) => r["Package ID"] === id)),
        pcnyWarehouse: rows.some((r) => r["Warehouse ID"] === prev.pcnyWarehouse) ? prev.pcnyWarehouse : null,
        pnbWarehouse: rows.some((r) => r["Warehouse ID"] === prev.pnbWarehouse) ? prev.pnbWarehouse : null,
        cddvWarehouse: rows.some((r) => r["Warehouse ID"] === prev.cddvWarehouse) ? prev.cddvWarehouse : null,
        cdpWarehouse: rows.some((r) => r["Warehouse ID"] === prev.cdpWarehouse) ? prev.cdpWarehouse : null,
      }));
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleDownload() {
    if (!local.csvText || !local.fileName) return;
    const blob = new Blob([local.csvText], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = local.fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadTemplate() {
    const headers = ["Warehouse ID", "Warehouse", "Product ID", "Product Description", "Sub ID", "Sub Description", "Sub R12 Volume", "Brand ID", "Brand", "Package ID", "Package", "Product Ownership", "Product Status"];
    const csv = headers.map((h) => `"${h}"`).join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Derive unique option lists from parsed rows
  const rows = local.parsedRows ?? [];

  const statusOptions = useMemo(() =>
    [...new Set(rows.map((r) => r["Product Status"]).filter(Boolean))].sort()
      .map((s) => ({ id: s, label: s })),
    [rows]);

  const brandOptions = useMemo(() => {
    const seen = new Map<string, string>();
    rows.forEach((r) => { if (r["Brand ID"] && r["Brand"]) seen.set(r["Brand ID"], r["Brand"]); });
    return [...seen.entries()].map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const packageOptions = useMemo(() => {
    const seen = new Map<string, string>();
    rows.forEach((r) => { if (r["Package ID"] && r["Package"]) seen.set(r["Package ID"], r["Package"]); });
    return [...seen.entries()].map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const warehouseOptions = useMemo(() => {
    const seen = new Map<string, string>();
    rows.forEach((r) => { if (r["Warehouse ID"] && r["Warehouse"]) seen.set(r["Warehouse ID"], r["Warehouse"]); });
    return [...seen.entries()].map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const hasData = rows.length > 0;
  const isDirty = JSON.stringify(local) !== JSON.stringify(settings);
  const [triedToSave, setTriedToSave] = useState(false);
  const missingWarehouses = [
    !local.pcnyWarehouse && "PCNY Warehouse",
    !local.pnbWarehouse  && "PNB Warehouse",
    !local.cddvWarehouse && "CDDV Warehouse",
    !local.cdpWarehouse  && "CDP Warehouse",
  ].filter(Boolean) as string[];

  function downloadResults() {
    if (!hasData) return;

    const {
      statusesToInclude, brandsToExclude, packagesToExclude,
      pcnyWarehouse, pnbWarehouse, cddvWarehouse, cdpWarehouse,
    } = local;

    const inCatalog = (warehouseId: string | null, ownershipFilter: string | null) => {
      if (!warehouseId) return new Set<string>();
      return new Set(
        rows
          .filter((r) =>
            r["Warehouse ID"] === warehouseId &&
            (statusesToInclude.length === 0 || statusesToInclude.includes(r["Product Status"])) &&
            !brandsToExclude.includes(r["Brand ID"]) &&
            !packagesToExclude.includes(r["Package ID"]) &&
            (ownershipFilter === null || r["Product Ownership"] === ownershipFilter)
          )
          .map((r) => r["Product ID"])
      );
    };

    const pcnySet  = inCatalog(pcnyWarehouse,  null);
    const cdpSet   = inCatalog(cdpWarehouse,   null);
    const pnbSet   = inCatalog(pnbWarehouse,   "Pepsi");
    const cddvSet  = inCatalog(cddvWarehouse,  "Canada Dry");

    // Collect unique products (by Product ID) across all catalogs
    const allIds = new Set([...pcnySet, ...cdpSet, ...pnbSet, ...cddvSet]);
    const descriptionMap = new Map<string, string>();
    rows.forEach((r) => { if (r["Product ID"]) descriptionMap.set(r["Product ID"], r["Product Description"]); });

    const csvRows = [["Product ID", "Product Description", "PCNY", "PNB", "CDDV", "CDP"]];
    [...allIds].sort().forEach((id) => {
      csvRows.push([
        id,
        descriptionMap.get(id) ?? "",
        pcnySet.has(id) ? "Yes" : "",
        pnbSet.has(id)  ? "Yes" : "",
        cddvSet.has(id) ? "Yes" : "",
        cdpSet.has(id)  ? "Yes" : "",
      ]);
    });

    const csv = csvRows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "catalog_results.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const sectionLabel = (text: string) => (
    <div style={{ fontFamily: "var(--font-display)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-muted-foreground)", marginBottom: 6 }}>
      {text}
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(26,37,51,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, boxShadow: "0 24px 64px rgba(0,0,0,0.3)", width: 540, maxWidth: "calc(100vw - 48px)", maxHeight: "calc(100vh - 80px)", overflowY: "auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 28px 18px", borderBottom: "1px solid var(--color-border)" }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-secondary)", lineHeight: 1 }}>
              Data Settings
            </div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--color-muted-foreground)", marginTop: 4 }}>
              Manage your data source and import filters
            </div>
          </div>
          <button onClick={onClose} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, border: "none", borderRadius: 4, background: "transparent", color: "var(--color-muted-foreground)", cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Products file */}
          <div>
            {sectionLabel("Products File")}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--color-muted)", border: `1px solid ${parseError ? "#e05252" : "var(--color-border)"}`, borderRadius: 6 }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0, color: local.fileName && !parseError ? "var(--color-secondary)" : "var(--color-muted-foreground)" }}>
                <rect x="5" y="3" width="22" height="26" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M11 10h10M11 15h10M11 20h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: "13px", fontWeight: 500, color: local.fileName ? "var(--color-foreground)" : "var(--color-muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {local.fileName ?? "No file selected"}
                </div>
                {local.fileName && local.csvText && !parseError && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
                    <span style={{ fontFamily: "var(--font-sans)", fontSize: "11px", color: "var(--color-muted-foreground)" }}>
                      {local.parsedRows.length.toLocaleString()} rows parsed
                    </span>
                    <button onClick={handleDownload} style={{ fontFamily: "var(--font-sans)", fontSize: "11px", color: "var(--color-primary)", background: "transparent", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                      Download current file
                    </button>
                  </div>
                )}
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "var(--color-secondary)", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 4l3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /><path d="M1 9v1a1 1 0 001 1h8a1 1 0 001-1V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                {local.fileName ? "Replace" : "Upload"}
                <input type="file" accept=".csv" style={{ display: "none" }} onChange={handleFile} />
              </label>
            </div>

            {/* Parse error */}
            {parseError && (
              <div style={{ marginTop: 8, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 6, fontFamily: "var(--font-sans)", fontSize: "12px", color: "#b91c1c", lineHeight: 1.5 }}>
                <strong>Format error:</strong>{" "}
                {parseError.split("\n").map((line, i) => <span key={i} style={{ display: "block" }}>{line}</span>)}
              </div>
            )}
          </div>

          {/* Template download */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ color: "var(--color-muted-foreground)", flexShrink: 0 }}>
              <path d="M6.5 1v8M3.5 6l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M1 10v1a1 1 0 001 1h9a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--color-muted-foreground)" }}>
              Need the right format?
            </span>
            <button onClick={handleDownloadTemplate} style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--color-primary)", background: "transparent", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
              Download CSV template
            </button>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "var(--color-border)" }} />

          {/* Filters */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-secondary)" }}>
              Warehouse Assignments
            </div>

            <div>
              {sectionLabel("PCNY Warehouse")}
              <SingleSelectDropdown
                items={warehouseOptions}
                selected={local.pcnyWarehouse}
                onChange={(v) => setLocal((p) => ({ ...p, pcnyWarehouse: v }))}
                placeholder="Select warehouse…"
                emptyText={hasData ? "No warehouses found in file" : "Upload a file to populate"}
              />
            </div>

            <div>
              {sectionLabel("PNB Warehouse")}
              <SingleSelectDropdown
                items={warehouseOptions}
                selected={local.pnbWarehouse}
                onChange={(v) => setLocal((p) => ({ ...p, pnbWarehouse: v }))}
                placeholder="Select warehouse…"
                emptyText={hasData ? "No warehouses found in file" : "Upload a file to populate"}
              />
            </div>

            <div>
              {sectionLabel("CDDV Warehouse")}
              <SingleSelectDropdown
                items={warehouseOptions}
                selected={local.cddvWarehouse}
                onChange={(v) => setLocal((p) => ({ ...p, cddvWarehouse: v }))}
                placeholder="Select warehouse…"
                emptyText={hasData ? "No warehouses found in file" : "Upload a file to populate"}
              />
            </div>

            <div>
              {sectionLabel("CDP Warehouse")}
              <SingleSelectDropdown
                items={warehouseOptions}
                selected={local.cdpWarehouse}
                onChange={(v) => setLocal((p) => ({ ...p, cdpWarehouse: v }))}
                placeholder="Select warehouse…"
                emptyText={hasData ? "No warehouses found in file" : "Upload a file to populate"}
              />
            </div>

            <div style={{ height: 1, background: "var(--color-border)" }} />

            <div style={{ fontFamily: "var(--font-display)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-secondary)" }}>
              Data Filters
            </div>

            <div>
              {sectionLabel("Product Statuses to Include")}
              <MultiSelectDropdown
                items={statusOptions}
                selected={local.statusesToInclude}
                onChange={(v) => setLocal((p) => ({ ...p, statusesToInclude: v }))}
                placeholder="Select statuses…"
                emptyText={hasData ? "No statuses found in file" : "Upload a file to populate"}
              />
            </div>

            <div>
              {sectionLabel("Brands to Exclude")}
              <MultiSelectDropdown
                items={brandOptions}
                selected={local.brandsToExclude}
                onChange={(v) => setLocal((p) => ({ ...p, brandsToExclude: v }))}
                placeholder="Select brands…"
                emptyText={hasData ? "No brands found in file" : "Upload a file to populate"}
              />
            </div>

            <div>
              {sectionLabel("Packages to Exclude")}
              <MultiSelectDropdown
                items={packageOptions}
                selected={local.packagesToExclude}
                onChange={(v) => setLocal((p) => ({ ...p, packagesToExclude: v }))}
                placeholder="Select packages…"
                emptyText={hasData ? "No packages found in file" : "Upload a file to populate"}
              />
            </div>

            <div>
              {sectionLabel("Fountain Packages")}
              <MultiSelectDropdown
                items={packageOptions}
                selected={local.fountainPackages}
                onChange={(v) => setLocal((p) => ({ ...p, fountainPackages: v }))}
                placeholder="Select fountain packages…"
                emptyText={hasData ? "No packages found in file" : "Upload a file to populate"}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "18px 28px", borderTop: "1px solid var(--color-border)" }}>
          {triedToSave && missingWarehouses.length > 0 && (
            <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 6, fontFamily: "var(--font-sans)", fontSize: "12px", color: "#b91c1c", lineHeight: 1.5 }}>
              <strong>Required:</strong> Please select values for {missingWarehouses.join(", ")} before saving.
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => { setTriedToSave(true); if (missingWarehouses.length === 0) { onSave(local); onClose(); } }}
              style={{ flex: 1, fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "10px 0", background: "var(--color-secondary)", color: "#fff", border: "none", borderRadius: 5, cursor: "pointer", transition: "background 0.15s, color 0.15s" }}
            >
              Save Changes
            </button>
            <button
              onClick={onClose}
              style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "10px 20px", background: "transparent", color: "var(--color-muted-foreground)", border: "1px solid var(--color-border)", borderRadius: 5, cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
          <button
            onClick={downloadResults}
            disabled={!hasData}
            style={{ width: "100%", fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "10px 0", background: "transparent", color: hasData ? "var(--color-primary)" : "var(--color-muted-foreground)", border: `1px solid ${hasData ? "var(--color-primary)" : "var(--color-border)"}`, borderRadius: 5, cursor: hasData ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 7l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /><path d="M1 10v.5A.5.5 0 001.5 11h9a.5.5 0 00.5-.5V10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
            Download Parsed Results
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TemporaryExclusionsModal ─────────────────────────────────────────────────

function TemporaryExclusionsModal({ onClose }: { onClose: () => void }) {
  const [company, setCompany] = useState("PCNY");
  const [skus, setSkus] = useState("");

  useEffect(() => {
    function handle(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(26,37,51,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", width: 520, maxWidth: "calc(100vw - 48px)" }}
      >
        {/* Modal header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid var(--color-border)" }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-secondary)" }}>
              Temporary Exclusions
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, border: "none", borderRadius: 4, background: "transparent", color: "var(--color-muted-foreground)", cursor: "pointer", transition: "background 0.15s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--color-muted)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Modal body */}
        <div style={{ padding: "20px 24px 24px" }}>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "13px", lineHeight: 1.65, color: "var(--color-muted-foreground)", margin: "0 0 20px" }}>
            Manually exclude items from appearing in a catalog by selecting a company, and writing the SKU numbers below (comma separated). To be used as a temporary emergency measure to quickly hide products from appearing on the website. These exclude lists reset on a weekly basis.
          </p>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontFamily: "var(--font-display)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-muted-foreground)", marginBottom: 6 }}>
              Company
            </label>
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              style={{ width: "100%", fontFamily: "var(--font-sans)", fontSize: "13px", color: "var(--color-foreground)", background: "var(--color-muted)", border: "1px solid var(--color-border)", borderRadius: 4, padding: "8px 10px", outline: "none", cursor: "pointer" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-primary)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
            >
              {["PCNY", "PNB", "CDDV", "CDP"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontFamily: "var(--font-display)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-muted-foreground)", marginBottom: 6 }}>
              SKU Numbers <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(comma separated)</span>
            </label>
            <textarea
              value={skus}
              onChange={(e) => setSkus(e.target.value)}
              placeholder="e.g. 063059, 063060, 062703"
              rows={4}
              style={{ width: "100%", fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--color-foreground)", background: "var(--color-muted)", border: "1px solid var(--color-border)", borderRadius: 4, padding: "8px 10px", outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-primary)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              onClick={onClose}
              style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "7px 18px", background: "transparent", color: "var(--color-muted-foreground)", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", cursor: "pointer", transition: "background 0.15s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--color-muted)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "7px 18px", background: "var(--color-secondary)", color: "#ffffff", border: "1px solid transparent", borderRadius: "var(--radius)", cursor: "pointer", transition: "opacity 0.15s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
            >
              Apply Exclusions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ClipboardOverlay ─────────────────────────────────────────────────────────

function ClipboardOverlay({ count, uniqueCount, separator, onSeparatorChange, onCopy, onClear, onClose }: {
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

type BulkFileStatus = "pending" | "matched" | "unmatched" | "uploading" | "done" | "error";

interface BulkFile {
  file: File;
  productId: string | null; // null = unmatched
  assignedId: string;       // editable by user for unmatched
  status: BulkFileStatus;
  webUrl?: string;
  error?: string;
}

function BulkUploadModal({ onClose, productIds, onUploaded }: {
  onClose: () => void;
  productIds: string[];
  onUploaded: (updates: { id: string; fullUrl: string; webUrl: string }[]) => void;
}) {
  const [files, setFiles] = useState<BulkFile[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const productIdSet = useMemo(() => new Set(productIds.map(String)), [productIds]);

  useEffect(() => {
    function handle(e: KeyboardEvent) { if (e.key === "Escape" && !running) onClose(); }
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onClose, running]);

  function handleFiles(picked: FileList | null) {
    if (!picked) return;
    const arr: BulkFile[] = Array.from(picked).filter((file) =>
      file.type.startsWith("image/") && !file.name.startsWith(".")
    ).map((file) => {
      const ext = file.name.lastIndexOf(".");
      const base = ext >= 0 ? file.name.slice(0, ext) : file.name;
      const matched = productIdSet.has(base);
      return {
        file,
        productId: matched ? base : null,
        assignedId: matched ? base : "",
        status: matched ? "matched" : "unmatched",
      };
    });
    setFiles(arr);
    setDone(false);
  }

  function setAssignedId(idx: number, val: string) {
    setFiles((prev) => prev.map((f, i) => i !== idx ? f : {
      ...f,
      assignedId: val,
      productId: productIdSet.has(val) ? val : null,
      status: productIdSet.has(val) ? "matched" : "unmatched",
    }));
  }

  async function runUpload() {
    const toUpload = files.filter((f) => f.productId);
    if (toUpload.length === 0) return;
    setRunning(true);

    const updates: { id: string; fullUrl: string; webUrl: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f.productId) continue;
      setFiles((prev) => prev.map((x, j) => j === i ? { ...x, status: "uploading" } : x));
      try {
        const { fullUrl, webUrl } = await uploadToS3(f.file, "products", f.productId);
        await supabase.from("products").update({ image_full_url: fullUrl, image_web_url: webUrl }).eq("id", f.productId);
        updates.push({ id: f.productId, fullUrl, webUrl });
        setFiles((prev) => prev.map((x, j) => j === i ? { ...x, status: "done", webUrl } : x));
      } catch (err: any) {
        setFiles((prev) => prev.map((x, j) => j === i ? { ...x, status: "error", error: err?.message ?? "Upload failed" } : x));
      }
    }

    onUploaded(updates);
    setRunning(false);
    setDone(true);
  }

  const matched = files.filter((f) => f.productId).length;
  const unmatched = files.filter((f) => !f.productId).length;
  const succeeded = files.filter((f) => f.status === "done").length;
  const errored = files.filter((f) => f.status === "error").length;
  const progress = files.length > 0 ? files.filter((f) => f.status === "done" || f.status === "error").length / files.filter((f) => f.productId).length : 0;

  const statusColor = (s: BulkFileStatus) => {
    if (s === "done") return "#16a34a";
    if (s === "error") return "#dc2626";
    if (s === "uploading") return "var(--color-primary)";
    if (s === "unmatched") return "#d97706";
    return "var(--color-muted-foreground)";
  };
  const statusLabel = (f: BulkFile) => {
    if (f.status === "done") return "✓ Uploaded";
    if (f.status === "error") return `✗ ${f.error}`;
    if (f.status === "uploading") return "Uploading…";
    if (f.status === "unmatched") return "No match — assign ID to upload, or leave blank to skip";
    return `→ ${f.productId}`;
  };

  return (
    <div
      onClick={() => { if (!running) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(26,37,51,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", width: 640, maxWidth: "calc(100vw - 48px)", maxHeight: "calc(100vh - 80px)", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid var(--color-border)", flexShrink: 0 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-secondary)" }}>
            Bulk Upload Images
          </div>
          {!running && (
            <button
              onClick={onClose}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, border: "none", borderRadius: 4, background: "transparent", color: "var(--color-muted-foreground)", cursor: "pointer", transition: "background 0.15s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--color-muted)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {/* Drop zone */}
          {!running && !done && (
            <div style={{ border: "2px dashed var(--color-border)", borderRadius: 6, padding: "24px", marginBottom: files.length > 0 ? 20 : 0 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted-foreground)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 12px" }}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <label
                  style={{ fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "7px 16px", background: "var(--color-secondary)", color: "#ffffff", borderRadius: "var(--radius)", cursor: "pointer", transition: "opacity 0.15s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLLabelElement).style.opacity = "0.85"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLLabelElement).style.opacity = "1"; }}
                >
                  Choose Files
                  <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />
                </label>
                <label
                  style={{ fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "7px 16px", background: "transparent", color: "var(--color-secondary)", border: "1px solid var(--color-secondary)", borderRadius: "var(--radius)", cursor: "pointer", transition: "opacity 0.15s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLLabelElement).style.opacity = "0.75"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLLabelElement).style.opacity = "1"; }}
                >
                  Choose Folder
                  <input type="file" accept="image/*" multiple style={{ display: "none" }}
                    {...{ webkitdirectory: "" } as any}
                    onChange={(e) => handleFiles(e.target.files)} />
                </label>
              </div>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--color-muted-foreground)", textAlign: "center", margin: "10px 0 0" }}>
                Subfolders are included when choosing a folder
              </p>
            </div>
          )}

          {/* File list */}
          {files.length > 0 && (
            <div>
              {/* Summary bar */}
              <div style={{ display: "flex", gap: 16, marginBottom: 12, fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                <span style={{ color: "var(--color-muted-foreground)" }}>{files.length} files</span>
                {matched > 0 && <span style={{ color: "#16a34a" }}>{matched} matched</span>}
                {unmatched > 0 && <span style={{ color: "#d97706" }}>{unmatched} unmatched</span>}
                {done && errored > 0 && <span style={{ color: "#dc2626" }}>{errored} failed</span>}
              </div>

              {/* Progress bar */}
              {running && (
                <div style={{ height: 4, background: "var(--color-muted)", borderRadius: 2, marginBottom: 16, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.round(progress * 100)}%`, background: "var(--color-primary)", borderRadius: 2, transition: "width 0.3s" }} />
                </div>
              )}

              {/* File rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {files.map((f, i) => (
                  <div key={i} style={{ border: "1px solid var(--color-border)", borderRadius: 4, padding: "10px 12px", background: f.status === "error" ? "rgba(220,38,38,0.04)" : f.status === "done" ? "rgba(22,163,74,0.04)" : "transparent" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--color-foreground)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.file.name}</span>
                      <span style={{ fontFamily: "var(--font-sans)", fontSize: "11px", color: statusColor(f.status), whiteSpace: "nowrap", flexShrink: 0 }}>{statusLabel(f)}</span>
                    </div>
                    {f.status === "unmatched" && !running && (
                      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                        <label style={{ fontFamily: "var(--font-display)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-muted-foreground)", whiteSpace: "nowrap" }}>Product ID</label>
                        <input
                          type="text"
                          value={f.assignedId}
                          onChange={(e) => setAssignedId(i, e.target.value)}
                          placeholder="Enter product ID"
                          style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--color-foreground)", background: "var(--color-muted)", border: `1px solid ${f.assignedId && !f.productId ? "#d97706" : "var(--color-border)"}`, borderRadius: 4, padding: "5px 8px", outline: "none" }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-primary)")}
                          onBlur={(e) => (e.currentTarget.style.borderColor = f.assignedId && !f.productId ? "#d97706" : "var(--color-border)")}
                        />
                        {f.assignedId && !f.productId && (
                          <span style={{ fontFamily: "var(--font-sans)", fontSize: "11px", color: "#d97706", whiteSpace: "nowrap" }}>ID not found</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderTop: "1px solid var(--color-border)", flexShrink: 0 }}>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--color-muted-foreground)" }}>
            {done
              ? `${succeeded} uploaded successfully${errored > 0 ? `, ${errored} failed` : ""}`
              : files.length > 0
              ? `${matched} of ${files.length} images will upload. ${unmatched > 0 ? `${unmatched} unmatched will be skipped — assign a product ID to include them.` : ""}`
              : "Image filenames must match product IDs for automatic matching."}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            {!running && (
              <button
                onClick={onClose}
                style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "7px 18px", background: "transparent", color: "var(--color-muted-foreground)", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", cursor: "pointer", transition: "background 0.15s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--color-muted)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                {done ? "Close" : "Cancel"}
              </button>
            )}
            {!done && (
              <button
                onClick={runUpload}
                disabled={running || matched === 0}
                style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "7px 18px", background: matched === 0 ? "var(--color-muted)" : "var(--color-secondary)", color: matched === 0 ? "var(--color-muted-foreground)" : "#ffffff", border: "1px solid transparent", borderRadius: "var(--radius)", cursor: matched === 0 || running ? "default" : "pointer", transition: "opacity 0.15s", opacity: running ? 0.7 : 1 }}
                onMouseEnter={(e) => { if (matched > 0 && !running) (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = running ? "0.7" : "1"; }}
              >
                {running ? "Uploading…" : `Upload ${matched > 0 ? matched : ""} Image${matched !== 1 ? "s" : ""}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AddBrandModal ────────────────────────────────────────────────────────────

const BRAND_CATEGORIES = ["Carbonated Soft Drinks", "Non-Carbonated Soft Drinks", "Water", "Sparkling Water & Seltzer", "Tea", "Coffee", "Isotonic, Sports & Protein", "Energy"];

function AddBrandModal({ existingBrands, onClose, onAdded }: {
  existingBrands: { id: string; description: string }[];
  onClose: () => void;
  onAdded: (brand: { id: string; description: string; category: string; brandLogo: string; brandLogoFull: string; status: string }) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 50);
    function handle(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onClose]);

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function nextId(): string {
    const max = existingBrands.reduce((acc, b) => Math.max(acc, parseInt(b.id, 10) || 0), 0);
    return String(max + 1).padStart(4, "0");
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) { setError("Brand name is required."); return; }
    if (existingBrands.some((b) => b.description.toLowerCase() === trimmed.toLowerCase())) {
      setError("A brand with this name already exists.");
      return;
    }
    setSaving(true);
    setError("");
    const id = nextId();
    let webUrl = "";
    let fullUrl = "";
    if (logoFile) {
      try {
        const urls = await uploadToS3(logoFile, "brands", id);
        webUrl = urls.webUrl;
        fullUrl = urls.fullUrl;
      } catch {
        setError("Logo upload failed. Brand was not saved.");
        setSaving(false);
        return;
      }
    }
    const { error: dbErr } = await supabase.from("brands").insert({
      id,
      description: trimmed,
      category: category || null,
      brand_logo_web_url: webUrl || null,
      brand_logo_url: fullUrl || null,
      status: "Inactive",
    });
    if (dbErr) {
      setError(`Database error: ${dbErr.message}`);
      setSaving(false);
      return;
    }
    onAdded({ id, description: trimmed, category, brandLogo: webUrl, brandLogoFull: fullUrl, status: "Inactive" });
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,37,51,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--color-card)", borderRadius: 10, boxShadow: "0 16px 48px rgba(0,0,0,0.22)", width: 440, padding: "28px 32px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 700, letterSpacing: "0.04em", color: "var(--color-foreground)" }}>Add New Brand</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted-foreground)", padding: 4, display: "flex" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 72, height: 52, borderRadius: 6, border: "1px dashed var(--color-border)", background: "var(--color-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
            {logoPreview ? (
              <img src={logoPreview} alt="" style={{ maxWidth: 68, maxHeight: 48, objectFit: "contain" }} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="12" rx="2" stroke="var(--color-border)" strokeWidth="1.3"/><circle cx="7" cy="8.5" r="1.5" fill="var(--color-border)"/><path d="M2 13l4-3 3 2.5 3-4 4 4.5" stroke="var(--color-border)" strokeWidth="1.2" strokeLinejoin="round"/></svg>
            )}
          </div>
          <div>
            <label style={{ display: "inline-block", fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "6px 14px", background: "var(--color-secondary)", color: "#fff", borderRadius: "var(--radius)", cursor: "pointer" }}>
              {logoFile ? "Change Logo" : "Upload Logo"}
              <input type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" style={{ display: "none" }} onChange={handleLogoFile} />
            </label>
            {logoFile && <div style={{ marginTop: 4, fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--color-muted-foreground)" }}>{logoFile.name}</div>}
            <div style={{ marginTop: logoFile ? 0 : 4, fontFamily: "var(--font-sans)", fontSize: "11px", color: "var(--color-muted-foreground)" }}>Optional — can be uploaded later</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>Brand Name <span style={{ color: "var(--color-primary)" }}>*</span></label>
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            placeholder="e.g. Canada Dry"
            style={{ fontFamily: "var(--font-sans)", fontSize: "14px", color: "var(--color-foreground)", background: "var(--color-muted)", border: "1px solid var(--color-border)", borderRadius: 5, padding: "8px 12px", outline: "none", width: "100%", boxSizing: "border-box" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-primary)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ fontFamily: "var(--font-sans)", fontSize: "14px", color: category ? "var(--color-foreground)" : "var(--color-muted-foreground)", background: "var(--color-muted)", border: "1px solid var(--color-border)", borderRadius: 5, padding: "8px 12px", outline: "none", width: "100%", cursor: "pointer" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-primary)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
          >
            <option value="">Select a category…</option>
            {BRAND_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div style={{ background: "var(--color-muted)", borderRadius: 6, padding: "10px 14px" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-muted-foreground)", marginBottom: 6 }}>Auto-assigned</div>
          <div style={{ display: "flex", gap: 24 }}>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--color-muted-foreground)" }}>ID <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-primary)", fontSize: "12px" }}>{nextId()}</span></span>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--color-muted-foreground)" }}>Status <span style={{ color: "var(--color-foreground)" }}>Inactive</span> until products link to this brand</span>
          </div>
        </div>

        {error && <div style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#dc2626" }}>{error}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} disabled={saving} style={{ flex: 1, fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "9px 0", background: "var(--color-muted)", color: "var(--color-muted-foreground)", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", cursor: "pointer" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "9px 0", background: saving ? "var(--color-muted)" : "var(--color-primary)", color: saving ? "var(--color-muted-foreground)" : "#fff", border: "none", borderRadius: "var(--radius)", cursor: saving ? "default" : "pointer" }}>
            {saving ? "Saving…" : "Add Brand"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── HamburgerMenu ────────────────────────────────────────────────────────────

const HAMBURGER_ITEMS = ["Hide / Show Columns", "Download as CSV", "Upload Images", "Delete Records", "Temporary Exclusions"];

function HamburgerMenu({ onTemporaryExclusions, onHideShowColumns, onDownloadCsv, onBulkUpload }: { onTemporaryExclusions: () => void; onHideShowColumns: () => void; onDownloadCsv: () => void; onBulkUpload: () => void }) {
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

function TableRow({ index, row, columns, onToggle, onEdit, onUpload, uploadFolder = "products", uploadAccept = "image/*", clipboardActive, clipboardColKey, clipboardSelected, onClipboardClick }: { index: number; row: Row; columns: Column[]; onToggle: (key: string, val: boolean) => void; onEdit?: (key: string, val: string) => void; onUpload?: (urls: { fullUrl: string; webUrl: string } | string) => void; uploadFolder?: string; uploadAccept?: string; clipboardActive?: boolean; clipboardColKey?: string | null; clipboardSelected?: boolean; onClipboardClick?: (colKey: string, shiftKey: boolean) => void }) {
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

type CatalogFilter = "PCNY" | "PNB" | "CDDV" | "CDP";
type SortDir = "asc" | "desc";
type SortLevel = { key: string; dir: SortDir };

const DEFAULT_FILTERS: Record<string, string[]> = { status: ["Active"] };

const CATALOG_PRESETS: Record<CatalogFilter, Record<string, string[]>> = {
  PCNY: { status: ["Active"], pcny: ["true"], channelRestricted: ["false"] },
  PNB:  { status: ["Active"], pnb: ["true"],  channelRestricted: ["false"] },
  CDDV: { status: ["Active"], cddv: ["true"], channelRestricted: ["false"] },
  CDP:  { status: ["Active"], cdp: ["true"],  channelRestricted: ["false"] },
};

function sortRows(rows: Row[], levels: SortLevel[]): Row[] {
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

type ColConfig = { key: string; visible: boolean };

function ColumnManagerModal({ columns, config, onChange, onClose }: {
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

function SortModal({ columns, levels, onApply, onClose }: {
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

type TabViewState = { sortLevels: SortLevel[]; colFilters: Record<string, string[]>; colExcludes: Record<string, boolean>; pageSize: number; page: number };
const SS_KEY = "catalogAdminViewState";
function loadViewState(): Record<string, TabViewState> {
  try { return JSON.parse(sessionStorage.getItem(SS_KEY) ?? "{}"); } catch { return {}; }
}
function saveViewState(state: Record<string, TabViewState>) {
  try { sessionStorage.setItem(SS_KEY, JSON.stringify(state)); } catch {}
}
function getTabDefaults(tab: Tab): TabViewState {
  return { sortLevels: [], colFilters: { status: ["Active"] }, colExcludes: {}, pageSize: 25, page: 0 };
}

export default function App() {
  const initialViewState = loadViewState();
  const initialTab = (sessionStorage.getItem("catalogAdminActiveTab") as Tab | null) ?? "Products";
  const initialTabState = initialViewState[initialTab] ?? getTabDefaults(initialTab);

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [pageSize, setPageSize] = useState<number>(initialTabState.pageSize ?? 25);
  const [page, setPage] = useState(0); // always reset to 0 on refresh
  const [catalogFilter, setCatalogFilter] = useState<CatalogFilter | null>(null);
  const [sortLevels, setSortLevels] = useState<SortLevel[]>(initialTabState.sortLevels);
  const [showSortModal, setShowSortModal] = useState(false);
  const [colFilters, setColFilters] = useState<Record<string, string[]>>(initialTabState.colFilters);
  const [colExcludes, setColExcludes] = useState<Record<string, boolean>>(initialTabState.colExcludes);

  // Persist view state to sessionStorage whenever it changes
  useEffect(() => {
    const all = loadViewState();
    all[activeTab] = { sortLevels, colFilters, colExcludes, pageSize, page };
    saveViewState(all);
  }, [activeTab, sortLevels, colFilters, colExcludes, pageSize, page]);

  useEffect(() => {
    sessionStorage.setItem("catalogAdminActiveTab", activeTab);
  }, [activeTab]);
  const [openColMenu, setOpenColMenu] = useState<string | null>(null);
  const [incompleteFilter, setIncompleteFilter] = useState(false);
  const [showExclusions, setShowExclusions] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [clipboardActive, setClipboardActive] = useState(false);
  const [clipboardColKey, setClipboardColKey] = useState<string | null>(null);
  const [clipboardRowIds, setClipboardRowIds] = useState<string[]>([]);
  const [clipboardSeparator, setClipboardSeparator] = useState(",");
  const lastClickedIdx = useRef<number>(-1);
  const [showColManager, setShowColManager] = useState(false);
  const [showDataImport, setShowDataImport] = useState(false);
  const [dataSettings, setDataSettings] = useState<DataSettings>(EMPTY_SETTINGS);
  const [dbLoading, setDbLoading] = useState(true);
  const defaultColConfigs = Object.fromEntries(Object.entries(TABLES).map(([k, v]) => [k, v.columns.map((c) => ({ key: c.key, visible: !(k === "Products" && ["subId", "containerTypeId", "subDescription", "brandLogo", "size", "retailUnitsPerCase", "consumableUnitsPerCase", "retailUpc", "new", "seasonal", "dataComplete"].includes(c.key)) }))]));
  const [colConfigs, setColConfigs] = useState<Record<string, ColConfig[]>>(() => {
    try {
      const saved = localStorage.getItem("honickman-col-configs");
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, ColConfig[]>;
        // Merge saved with defaults to handle any newly added columns
        return Object.fromEntries(Object.entries(defaultColConfigs).map(([tab, defaults]) => {
          const savedTab = parsed[tab] ?? [];
          return [tab, defaults.map((d) => {
            const match = savedTab.find((s) => s.key === d.key);
            return match ?? d;
          })];
        }));
      }
    } catch {}
    return defaultColConfigs;
  });
  const [tableData, setTableData] = useState<Record<string, Row[]>>(
    Object.fromEntries(Object.entries(TABLES).map(([k, v]) => [k, v.rows]))
  );

  async function fetchAllRows(table: string, orderCol: string): Promise<Record<string, unknown>[]> {
    const PAGE = 1000;
    const result: Record<string, unknown>[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase.from(table).select("*").order(orderCol).range(from, from + PAGE - 1);
      if (error || !data || data.length === 0) break;
      result.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    return result;
  }

  useEffect(() => {
    async function loadAll() {
      const [products, subBrands, brands, packages, settings] = await Promise.all([
        fetchAllRows("products", "id"),
        fetchAllRows("sub_brands", "id"),
        fetchAllRows("brands", "description"),
        fetchAllRows("packages", "id"),
        supabase.from("data_settings").select("*").eq("id", 1).maybeSingle(),
      ]);
      setTableData({
        Products: (products as any[]).map((r) => ({
          id: r.id, description: r.description, subId: r.sub_id, containerTypeId: r.container_type_id,
          thumbnail: r.image_web_url ?? "", channelRestricted: r.channel_restricted ?? false,
          pcny: r.pcny ?? false, pnb: r.pnb ?? false, cddv: r.cddv ?? false, cdp: r.cdp ?? false,
          retailUpc: r.retail_upc ?? "",
          new: r.new ?? false, seasonal: r.seasonal ?? false,
          status: r.status ?? "Active",
        })),
        "Sub-Brands": (subBrands as any[]).map((r) => ({
          id: r.id, description: r.description, brand: r.brand ?? "", flavor: r.flavor ?? "", status: r.status ?? "Inactive",
        })),
        Brands: (brands as any[]).map((r) => ({ id: r.id, description: r.description, brandLogo: r.brand_logo_web_url ?? "", brandLogoFull: r.brand_logo_url ?? "", category: r.category ?? "", status: r.status ?? "Inactive" })),
        Packages: (packages as any[]).map((r) => ({
          id: r.id, description: r.description, package: r.package ?? "", size: r.size ?? "",
          material: r.material ?? "", retailUnitsPerCase: r.retail_units_per_case ?? "",
          consumableUnitsPerCase: r.consumable_units_per_case ?? "", status: r.status ?? "Inactive",
        })),
      });
      if (settings.data) {
        const s = settings.data;
        const csvText = s.csv_text ?? null;
        const parsedRows = csvText ? parseCsvText(csvText) : [];
        setDataSettings({
          fileName: s.file_name ?? null, csvText, parsedRows,
          statusesToInclude: s.statuses_to_include ?? [],
          brandsToExclude: s.brands_to_exclude ?? [],
          packagesToExclude: s.packages_to_exclude ?? [],
          fountainPackages: s.fountain_packages ?? [],
          pcnyWarehouse: s.pcny_warehouse ?? null,
          pnbWarehouse: s.pnb_warehouse ?? null,
          cddvWarehouse: s.cddv_warehouse ?? null,
          cdpWarehouse: s.cdp_warehouse ?? null,
        });
      }
      setDbLoading(false);
    }
    loadAll();
  }, []);

  const allTabCols = TABLES[activeTab].columns;
  const brandNameOptions = useMemo(
    () => tableData["Brands"].map((r) => r.description as string).filter(Boolean).sort(),
    [tableData["Brands"]]
  );
  const columns = colConfigs[activeTab]
    .filter((cfg) => cfg.visible)
    .map((cfg) => {
      const col = allTabCols.find((c) => c.key === cfg.key)!;
      if (activeTab === "Sub-Brands" && col?.key === "brand" && brandNameOptions.length > 0) {
        return { ...col, options: brandNameOptions };
      }
      return col;
    })
    .filter(Boolean);

  const subBrandMap = useMemo(() => {
    const map: Record<string, { brand: string; flavor: string; subDescription: string }> = {};
    for (const row of tableData["Sub-Brands"]) {
      map[row.id as string] = { brand: row.brand as string, flavor: row.flavor as string, subDescription: row.description as string };
    }
    return map;
  }, [tableData["Sub-Brands"]]);

  const packageMap = useMemo(() => {
    const map: Record<string, { package: string; size: string; retailUnitsPerCase: string; consumableUnitsPerCase: string }> = {};
    for (const row of tableData["Packages"]) {
      map[row.id as string] = {
        package: row.package as string,
        size: row.size as string,
        retailUnitsPerCase: row.retailUnitsPerCase as string,
        consumableUnitsPerCase: row.consumableUnitsPerCase as string,
      };
    }
    return map;
  }, [tableData["Packages"]]);

  const brandLogoMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of tableData["Brands"]) {
      map[row.description as string] = row.brandLogo as string;
    }
    return map;
  }, [tableData["Brands"]]);

  const rawRows = tableData[activeTab];
  const allRows: Row[] = activeTab === "Products"
    ? rawRows.map((row) => {
        const sub = subBrandMap[row.subId as string];
        const pkg = packageMap[row.containerTypeId as string];
        const brand = sub?.brand ?? "";
        const flavor = sub?.flavor ?? "";
        const packageName = pkg?.package ?? "";
        const brandLogo = brandLogoMap[brand] ?? "";
        const dataComplete = !!(row.thumbnail && brand && flavor && packageName && brandLogo);
        return {
          ...row,
          brand,
          flavor,
          brandLogo,
          subDescription: sub?.subDescription ?? "",
          package: packageName,
          size: pkg?.size ?? "",
          retailUnitsPerCase: pkg?.retailUnitsPerCase ?? "",
          consumableUnitsPerCase: pkg?.consumableUnitsPerCase ?? "",
          dataComplete,
        };
      })
    : (() => {
        const activeProducts = tableData["Products"].filter((p) => p.status === "Active");
        if (activeTab === "Sub-Brands") {
          const activeSubIds = new Set(activeProducts.map((p) => p.subId as string));
          return rawRows.map((row) => ({ ...row, status: activeSubIds.has(row.id as string) ? "Active" : "Inactive" }));
        }
        if (activeTab === "Packages") {
          const activeContainerIds = new Set(activeProducts.map((p) => p.containerTypeId as string));
          return rawRows.map((row) => ({ ...row, status: activeContainerIds.has(row.id as string) ? "Active" : "Inactive" }));
        }
        if (activeTab === "Brands") {
          const activeSubIds = new Set(activeProducts.map((p) => p.subId as string));
          const activeBrandNames = new Set<string>();
          tableData["Sub-Brands"].forEach((sub) => { if (activeSubIds.has(sub.id as string)) activeBrandNames.add(sub.brand as string); });
          return rawRows.map((row) => ({ ...row, status: activeBrandNames.has(row.description as string) ? "Active" : "Inactive" }));
        }
        return rawRows;
      })();

  // Sync derived statuses to DB after data loads
  useEffect(() => {
    if (tableData["Products"].length === 0) return;
    const activeProducts = tableData["Products"].filter((p) => p.status === "Active");
    const activeSubIds = new Set(activeProducts.map((p) => p.subId as string));
    const activeContainerIds = new Set(activeProducts.map((p) => p.containerTypeId as string));
    const activeBrandNames = new Set<string>();
    tableData["Sub-Brands"].forEach((sub) => { if (activeSubIds.has(sub.id as string)) activeBrandNames.add(sub.brand as string); });

    const subBrandUpdates = tableData["Sub-Brands"].map((r) => ({ id: r.id, status: activeSubIds.has(r.id as string) ? "Active" : "Inactive" }));
    const packageUpdates = tableData["Packages"].map((r) => ({ id: r.id, status: activeContainerIds.has(r.id as string) ? "Active" : "Inactive" }));
    const brandUpdates = tableData["Brands"].map((r) => ({ id: r.id, status: activeBrandNames.has(r.description as string) ? "Active" : "Inactive" }));

    if (subBrandUpdates.length > 0) supabase.from("sub_brands").upsert(subBrandUpdates, { onConflict: "id" }).then(() => {});
    if (packageUpdates.length > 0) supabase.from("packages").upsert(packageUpdates, { onConflict: "id" }).then(() => {});
    if (brandUpdates.length > 0) supabase.from("brands").upsert(brandUpdates, { onConflict: "id" }).then(() => {});
  }, [tableData["Products"], tableData["Sub-Brands"], tableData["Packages"], tableData["Brands"]]);

  const incompleteCount = activeTab === "Products" ? allRows.filter((r) => !r.dataComplete).length : 0;
  const hasIncomplete = incompleteCount > 0;

  function handleToggle(rowIndex: number, key: string, val: boolean) {
    setTableData((prev) => {
      const rows = [...prev[activeTab]];
      const updated = { ...rows[rowIndex], [key]: val };
      if (activeTab === "Products" && ["pcny", "pnb", "cddv", "cdp"].includes(key)) {
        const active = updated.pcny || updated.pnb || updated.cddv || updated.cdp;
        updated.status = active ? "Active" : "Inactive";
        const dbKey = key === "channelRestricted" ? "channel_restricted" : key;
        supabase.from("products").update({ [dbKey]: val, status: updated.status }).eq("id", updated.id).then(() => {});
      } else {
        const dbKey = key === "channelRestricted" ? "channel_restricted" : key;
        supabase.from("products").update({ [dbKey]: val }).eq("id", updated.id).then(() => {});
      }
      rows[rowIndex] = updated;
      return { ...prev, [activeTab]: rows };
    });
  }

  function handleEdit(rowIndex: number, key: string, val: string) {
    setTableData((prev) => {
      const rows = [...prev[activeTab]];
      const updated = { ...rows[rowIndex], [key]: val };
      rows[rowIndex] = updated;
      if (activeTab === "Products" && key === "retailUpc") {
        supabase.from("products").update({ retail_upc: val || null }).eq("id", updated.id).then(() => {});
      } else if (activeTab === "Sub-Brands") {
        supabase.from("sub_brands").update({ [key]: val }).eq("id", updated.id).then(() => {});
      } else if (activeTab === "Brands") {
        supabase.from("brands").update({ [key]: val || null }).eq("id", updated.id).then(() => {});
      }
      return { ...prev, [activeTab]: rows };
    });
  }

  const nextBrandId = useMemo(() => {
    const ids = (tableData["Brands"] ?? []).map((r) => parseInt(String(r.id), 10)).filter((n) => !isNaN(n));
    const max = ids.length > 0 ? Math.max(...ids) : 0;
    return String(max + 1).padStart(4, "0");
  }, [tableData["Brands"]]);

  function downloadCsv() {
    const headers = columns.filter((c) => !c.thumbnail).map((c) => c.label);
    const csvRows = [headers, ...rows.map((row) =>
      columns.filter((c) => !c.thumbnail).map((c) => {
        const val = (row as Row)[c.key];
        const str = val === true ? "Yes" : val === false ? "No" : String(val ?? "");
        return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str.replace(/"/g, '""')}"` : str;
      })
    )];
    const csv = csvRows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeTab.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const colFiltered = allRows.filter((row) => {
    return columns.every((col) => {
      const f = colFilters[col.key];
      if (!f || f.length === 0) return true;
      const val = col.boolean ? (row[col.key] ? "true" : "false") : String(row[col.key] ?? "");
      return colExcludes[col.key] ? !f.includes(val) : f.includes(val);
    });
  });

  const rows = sortRows(colFiltered, sortLevels);
  const totalPages = Math.ceil(rows.length / pageSize);
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const pagedRows = rows.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const applyCatalogFilter = useCallback((preset: CatalogFilter) => {
    if (catalogFilter === preset) {
      setCatalogFilter(null);
      setColFilters(DEFAULT_FILTERS);
    } else {
      setCatalogFilter(preset);
      setColFilters(CATALOG_PRESETS[preset]);
    }
    setOpenColMenu(null);
    setPage(0);
  }, [catalogFilter]);

  function setColFilter(key: string, value: string[], exclude?: boolean) {
    setCatalogFilter("ALL" as CatalogFilter);
    setColFilters((prev) => ({ ...prev, [key]: value }));
    if (exclude !== undefined) setColExcludes((prev) => ({ ...prev, [key]: exclude }));
    setPage(0);
  }

  function handleHeaderClick(key: string) {
    if (clipboardActive) {
      if (clipboardColKey === key) {
        // Second click on same header clears selection
        setClipboardRowIds([]);
        setClipboardColKey(null);
        lastClickedIdx.current = -1;
      } else if (!clipboardColKey) {
        // No column locked yet — select all filtered rows for this column
        setClipboardColKey(key);
        setClipboardRowIds(rows.map((r) => String(r.id)));
        lastClickedIdx.current = rows.length - 1;
      }
      // If a different column is already locked, ignore
      return;
    }
    setOpenColMenu((prev) => (prev === key ? null : key));
  }

  function handleClipboardCellClick(rowId: string, colKey: string, shiftKey: boolean) {
    // Ignore clicks from a different column when one is already locked
    if (clipboardColKey && clipboardColKey !== colKey) return;

    // Lock to this column on first click
    if (!clipboardColKey) setClipboardColKey(colKey);

    const clickedIdx = rows.findIndex((r) => String(r.id) === rowId);
    if (shiftKey && lastClickedIdx.current >= 0) {
      const lo = Math.min(lastClickedIdx.current, clickedIdx);
      const hi = Math.max(lastClickedIdx.current, clickedIdx);
      const rangeIds = rows.slice(lo, hi + 1).map((r) => String(r.id));
      setClipboardRowIds((prev) => Array.from(new Set([...prev, ...rangeIds])));
    } else {
      setClipboardRowIds((prev) =>
        prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
      );
      lastClickedIdx.current = clickedIdx;
    }
  }

  function applyQuickSort(key: string, dir: SortDir) {
    setSortLevels([{ key, dir }]);
  }

  return (
    <div className="size-full flex flex-col" style={{ background: "var(--color-background)", color: "var(--color-foreground)", fontFamily: "var(--font-sans)" }}>
      {showExclusions && <TemporaryExclusionsModal onClose={() => setShowExclusions(false)} />}
      {showAddBrand && (
        <AddBrandModal
          existingBrands={(tableData["Brands"] ?? []).map((r) => ({ id: String(r.id), description: String(r.description) }))}
          onClose={() => setShowAddBrand(false)}
          onAdded={(brand) => setTableData((prev) => ({ ...prev, Brands: [brand, ...(prev["Brands"] ?? [])] }))}
        />
      )}
      {showBulkUpload && (
        <BulkUploadModal
          onClose={() => setShowBulkUpload(false)}
          productIds={(tableData["Products"] ?? []).map((r) => String(r.id))}
          onUploaded={(updates) => {
            setTableData((prev) => ({
              ...prev,
              Products: (prev["Products"] ?? []).map((r) => {
                const u = updates.find((x) => String(x.id) === String(r.id));
                return u ? { ...r, thumbnail: u.webUrl } : r;
              }),
            }));
          }}
        />
      )}
      {showDataImport && <DataSettingsModal settings={dataSettings} onSave={async (s) => {
        setDataSettings(s);
        await supabase.from("data_settings").upsert({
          id: 1,
          file_name: s.fileName, csv_text: s.csvText,
          statuses_to_include: s.statusesToInclude, brands_to_exclude: s.brandsToExclude,
          packages_to_exclude: s.packagesToExclude, fountain_packages: s.fountainPackages,
          pcny_warehouse: s.pcnyWarehouse, pnb_warehouse: s.pnbWarehouse,
          cddv_warehouse: s.cddvWarehouse, cdp_warehouse: s.cdpWarehouse,
          updated_at: new Date().toISOString(),
        });

        // Sync products table from parsed CSV data
        if (s.parsedRows.length > 0 && (s.pcnyWarehouse || s.pnbWarehouse || s.cddvWarehouse || s.cdpWarehouse)) {
          const rows = s.parsedRows;
          const { statusesToInclude, brandsToExclude, packagesToExclude,
                  pcnyWarehouse, pnbWarehouse, cddvWarehouse, cdpWarehouse } = s;

          const inCatalog = (warehouseId: string | null, ownershipFilter: string | null) => {
            if (!warehouseId) return new Set<string>();
            return new Set(
              rows.filter((r) =>
                r["Warehouse ID"] === warehouseId &&
                (statusesToInclude.length === 0 || statusesToInclude.includes(r["Product Status"])) &&
                !brandsToExclude.includes(r["Brand ID"]) &&
                !packagesToExclude.includes(r["Package ID"]) &&
                (ownershipFilter === null || r["Product Ownership"] === ownershipFilter)
              ).map((r) => r["Product ID"])
            );
          };

          const pcnySet  = inCatalog(pcnyWarehouse,  null);
          const pnbSet   = inCatalog(pnbWarehouse,   "Pepsi");
          const cddvSet  = inCatalog(cddvWarehouse,  "Canada Dry");
          const cdpSet   = inCatalog(cdpWarehouse,   null);

          console.log("[sync] parsedRows:", rows.length, "pcny:", pcnySet.size, "pnb:", pnbSet.size, "cddv:", cddvSet.size, "cdp:", cdpSet.size);

          // Build map of products that appear in at least one company's filtered set
          const allFilteredIds = new Set([...pcnySet, ...pnbSet, ...cddvSet, ...cdpSet]);
          const csvProducts = new Map<string, string>();
          rows.forEach((r) => { if (r["Product ID"] && allFilteredIds.has(r["Product ID"])) csvProducts.set(r["Product ID"], r["Product Description"]); });

          console.log("[sync] products to upsert:", csvProducts.size);

          // Fetch existing products from DB
          const { data: existingProducts } = await supabase.from("products").select("id");
          const existingIds = new Set((existingProducts ?? []).map((p: { id: string }) => p.id));
          console.log("[sync] existing in DB:", existingIds.size);

          // Upsert all products in CSV with computed company flags
          const upsertRows = [...csvProducts.entries()].map(([id, description]) => {
            const pcny  = pcnySet.has(id);
            const pnb   = pnbSet.has(id);
            const cddv  = cddvSet.has(id);
            const cdp   = cdpSet.has(id);
            return { id, description, pcny, pnb, cddv, cdp, status: (pcny || pnb || cddv || cdp) ? "Active" : "Inactive" };
          });

          // Batch upserts in chunks of 500
          for (let i = 0; i < upsertRows.length; i += 500) {
            const { error } = await supabase.from("products").upsert(upsertRows.slice(i, i + 500), { onConflict: "id" });
            console.log(`[sync] upsert batch ${i}-${i+500}:`, error ?? "ok");
          }

          // Products in DB but not in CSV → set all flags to false, status Inactive
          const removedIds = [...existingIds].filter((id) => !csvProducts.has(id));
          for (let i = 0; i < removedIds.length; i += 500) {
            await supabase.from("products").update({ pcny: false, pnb: false, cddv: false, cdp: false, status: "Inactive" })
              .in("id", removedIds.slice(i, i + 500));
          }

          // Upsert sub-brands and packages only for filtered products
          const filteredRows = rows.filter((r) => r["Product ID"] && csvProducts.has(r["Product ID"]));

          const subBrandMap = new Map<string, string>();
          filteredRows.forEach((r) => { if (r["Sub ID"] && r["Sub Description"]) subBrandMap.set(r["Sub ID"], r["Sub Description"]); });
          const subBrandRows = [...subBrandMap.entries()].map(([id, description]) => ({ id, description }));
          for (let i = 0; i < subBrandRows.length; i += 500) {
            await supabase.from("sub_brands").upsert(subBrandRows.slice(i, i + 500), { onConflict: "id" });
          }

          const packageMap = new Map<string, string>();
          filteredRows.forEach((r) => { if (r["Package ID"] && r["Package"]) packageMap.set(r["Package ID"], r["Package"]); });
          const packageRows = [...packageMap.entries()].map(([id, description]) => ({ id, description }));
          for (let i = 0; i < packageRows.length; i += 500) {
            await supabase.from("packages").upsert(packageRows.slice(i, i + 500), { onConflict: "id" });
          }

          // Refresh local Products, Sub-Brands, and Packages table state
          const [refreshedProducts, refreshedSubBrands, refreshedPackages] = await Promise.all([
            fetchAllRows("products", "id"),
            fetchAllRows("sub_brands", "id"),
            fetchAllRows("packages", "id"),
          ]);
          setTableData((prev) => ({
            ...prev,
            ...(refreshedProducts.length > 0 ? { Products: refreshedProducts.map((r: any) => ({
              id: r.id, description: r.description, subId: r.sub_id, containerTypeId: r.container_type_id,
              thumbnail: r.image_web_url ?? "", channelRestricted: r.channel_restricted ?? false,
              pcny: r.pcny ?? false, pnb: r.pnb ?? false, cddv: r.cddv ?? false, cdp: r.cdp ?? false,
              retailUpc: r.retail_upc ?? "",
              status: r.status ?? "Active",
            })) } : {}),
            ...(refreshedSubBrands.length > 0 ? { "Sub-Brands": refreshedSubBrands.map((r: any) => ({
              id: r.id, description: r.description, brand: r.brand ?? "", flavor: r.flavor ?? "", status: r.status ?? "Inactive",
            })) } : {}),
            ...(refreshedPackages.length > 0 ? { Packages: refreshedPackages.map((r: any) => ({
              id: r.id, description: r.description, package: r.package ?? "", size: r.size ?? "",
              material: r.material ?? "", retailUnitsPerCase: r.retail_units_per_case ?? "",
              consumableUnitsPerCase: r.consumable_units_per_case ?? "", status: r.status ?? "Inactive",
            })) } : {}),
          }));
        }
      }} onClose={() => setShowDataImport(false)} />}
      {showColManager && (
        <ColumnManagerModal
          columns={allTabCols}
          config={colConfigs[activeTab]}
          onChange={(next) => setColConfigs((prev) => { const updated = { ...prev, [activeTab]: next }; try { localStorage.setItem("honickman-col-configs", JSON.stringify(updated)); } catch {} return updated; })}
          onClose={() => setShowColManager(false)}
        />
      )}
      {/* Header */}
      <header style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-secondary)" }} className="px-8 pt-5 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src={honickmanLogo} alt="The Honickman Companies" style={{ height: "36px", display: "block" }} />
            <span style={{ width: "1px", height: "16px", background: "rgba(255,255,255,0.25)", display: "inline-block" }} />
            <span style={{ fontFamily: "var(--font-display)", fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.6)", letterSpacing: "0.12em", textTransform: "uppercase", lineHeight: 1 }}>
              Catalog Admin Portal
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Sync */}
            <button
              title="Data Import"
              onClick={() => setShowDataImport(true)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, border: "1px solid rgba(255,255,255,0.15)", borderRadius: "var(--radius)", background: "transparent", color: "rgba(255,255,255,0.6)", cursor: "pointer", transition: "color 0.15s, border-color 0.15s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#ffffff"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.4)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.6)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.15)"; }}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M13.5 2.5A6.5 6.5 0 0 0 2 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M13.5 2.5V6h-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2.5 13.5A6.5 6.5 0 0 0 14 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M2.5 13.5V10H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {/* Profile */}
            <button
              title="Profile"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, border: "1px solid rgba(255,255,255,0.15)", borderRadius: "50%", background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", cursor: "pointer", transition: "color 0.15s, background 0.15s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.2)"; (e.currentTarget as HTMLButtonElement).style.color = "#ffffff"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)"; }}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M2 13.5c0-2.485 2.686-4.5 6-4.5s6 2.015 6 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
        <nav className="flex gap-0" role="tablist">
          {TABS.map((tab) => {
            const active = tab === activeTab;
            return (
              <button
                key={tab}
                role="tab"
                aria-selected={active}
                onClick={() => {
                  const saved = loadViewState()[tab] ?? getTabDefaults(tab);
                  setActiveTab(tab);
                  setSortLevels(saved.sortLevels);
                  setColFilters(saved.colFilters);
                  setColExcludes(saved.colExcludes);
                  setPageSize(saved.pageSize ?? 25);
                  setPage(saved.page ?? 0);
                  setOpenColMenu(null); setCatalogFilter(null);
                }}
                style={{ fontFamily: "var(--font-display)", fontSize: "13px", fontWeight: active ? 700 : 500, letterSpacing: "0.1em", textTransform: "uppercase", padding: "9px 22px", border: "none", borderBottom: active ? "3px solid var(--color-primary)" : "3px solid transparent", background: active ? "rgba(222,133,0,0.1)" : "transparent", color: active ? "var(--color-primary)" : "rgba(255,255,255,0.6)", cursor: "pointer", transition: "color 0.15s, border-color 0.15s, background 0.15s", outline: "none", borderRadius: 0, whiteSpace: "nowrap" }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = "#ffffff"; }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.6)"; }}
              >
                {tab}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Toolbar */}
      <div className="px-8 py-3 flex items-center justify-between shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-3">
          {activeTab === "Products" && (
            <>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>Quick Views</span>
              <div style={{ display: "flex", gap: 2, background: "var(--color-muted)", borderRadius: 4, padding: 2, border: "1px solid var(--color-border)" }}>
                {(["PCNY", "PNB", "CDDV", "CDP"] as CatalogFilter[]).map((opt) => {
                  const selected = catalogFilter === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => applyCatalogFilter(opt)}
                      style={{ fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 12px", border: "none", borderRadius: 3, cursor: "pointer", transition: "background 0.15s, color 0.15s", background: selected ? "var(--color-secondary)" : "transparent", color: selected ? "#ffffff" : "var(--color-muted-foreground)" }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {activeTab === "Products" && (
            <button
              onClick={() => {
                if (hasIncomplete) {
                  const isActive = colFilters["dataComplete"]?.includes("false");
                  setColFilters(isActive ? (prev) => { const next = { ...prev }; delete next["dataComplete"]; return next; } : (prev) => ({ ...prev, dataComplete: ["false"] }));
                  setCatalogFilter(null);
                  setPage(0);
                }
              }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "4px 10px", border: "1px solid", borderRadius: 4,
                fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 600,
                letterSpacing: "0.07em", textTransform: "uppercase",
                cursor: hasIncomplete ? "pointer" : "default",
                transition: "opacity 0.15s",
                background: colFilters["dataComplete"]?.includes("false")
                  ? "rgba(222,133,0,0.1)"
                  : hasIncomplete ? "rgba(239,68,68,0.07)" : "rgba(34,197,94,0.07)",
                borderColor: colFilters["dataComplete"]?.includes("false")
                  ? "var(--color-primary)"
                  : hasIncomplete ? "rgba(239,68,68,0.35)" : "rgba(34,197,94,0.35)",
                color: colFilters["dataComplete"]?.includes("false")
                  ? "var(--color-primary)"
                  : hasIncomplete ? "#dc2626" : "#16a34a",
              }}
              onMouseEnter={(e) => { if (hasIncomplete) (e.currentTarget as HTMLButtonElement).style.opacity = "0.8"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
            >
              {hasIncomplete ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1L11 10H1L6 1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                    <path d="M6 5v2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    <circle cx="6" cy="9" r="0.6" fill="currentColor" />
                  </svg>
                  {colFilters["dataComplete"]?.includes("false") ? `Showing ${incompleteCount.toLocaleString()} Incomplete` : `${incompleteCount.toLocaleString()} Record${incompleteCount === 1 ? " Needs" : "s Need"} Updating`}
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6.5L4.5 9L10 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  All Records Up to Date
                </>
              )}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "Brands" && (
            <button
              onClick={() => setShowAddBrand(true)}
              style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "5px 16px", background: "var(--color-primary)", color: "#ffffff", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", cursor: "pointer", transition: "opacity 0.15s" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = "0.8")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = "1")}
            >
              + Add Brand
            </button>
          )}
          <button
            onClick={() => {
              const next = !clipboardActive;
              setClipboardActive(next);
              if (!next) { setClipboardColKey(null); setClipboardRowIds([]); window.getSelection()?.removeAllRanges(); }
            }}
            title="Copy values"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, background: clipboardActive ? "var(--color-primary)" : "var(--color-secondary)", color: "#ffffff", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", cursor: "pointer", transition: "background 0.15s, opacity 0.15s", flexShrink: 0 }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = "0.8")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = "1")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {/* Clipboard body */}
              <rect x="3" y="4" width="13" height="16" rx="2" />
              {/* Clipboard tab */}
              <rect x="7" y="2" width="5" height="3" rx="1" />
              {/* Document overlay */}
              <rect x="10" y="11" width="11" height="10" rx="1.5" fill={clipboardActive ? "var(--color-primary)" : "var(--color-secondary)"} stroke="currentColor" />
              {/* Document lines */}
              <line x1="12.5" y1="14.5" x2="18.5" y2="14.5" />
              <line x1="12.5" y1="17" x2="18.5" y2="17" />
              <line x1="12.5" y1="19.5" x2="16" y2="19.5" />
            </svg>
          </button>
          <button
            onClick={() => setShowSortModal(true)}
            style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "5px 16px", background: sortLevels.length > 0 ? "var(--color-primary)" : "var(--color-secondary)", color: "#ffffff", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", cursor: "pointer", transition: "opacity 0.15s" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = "0.8")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = "1")}
          >
            {sortLevels.length > 0 ? `Sort (${sortLevels.length})` : "Sort"}
          </button>
          <HamburgerMenu onTemporaryExclusions={() => setShowExclusions(true)} onHideShowColumns={() => setShowColManager(true)} onDownloadCsv={downloadCsv} onBulkUpload={() => setShowBulkUpload(true)} />
        </div>
      </div>

      {clipboardActive && (
        <ClipboardOverlay
          count={clipboardRowIds.length}
          uniqueCount={clipboardColKey ? new Set(clipboardRowIds.map((id) => { const r = rows.find((row) => String(row.id) === id); return r ? String(r[clipboardColKey] ?? "") : ""; })).size : 0}
          separator={clipboardSeparator}
          onSeparatorChange={setClipboardSeparator}
          onCopy={() => {
            if (!clipboardColKey) return;
            const vals = Array.from(new Set(clipboardRowIds.map((id) => { const r = rows.find((row) => String(row.id) === id); return r ? String(r[clipboardColKey] ?? "") : ""; }).filter(Boolean)));
            navigator.clipboard.writeText(vals.join(clipboardSeparator));
          }}
          onClear={() => { setClipboardRowIds([]); setClipboardColKey(null); lastClickedIdx.current = -1; }}
          onClose={() => { setClipboardActive(false); setClipboardColKey(null); setClipboardRowIds([]); window.getSelection()?.removeAllRanges(); }}
        />
      )}

      {showSortModal && (
        <SortModal
          columns={columns}
          levels={sortLevels}
          onApply={(levels) => { setSortLevels(levels); setShowSortModal(false); }}
          onClose={() => setShowSortModal(false)}
        />
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto" style={clipboardActive ? { userSelect: "none" } : undefined}>
        <table style={{ tableLayout: "auto", width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--color-muted)", position: "sticky", top: 0, zIndex: 10 }}>
              {columns.map((col) => {
                const interactive = !col.thumbnail;
                const isActive = sortLevels.some((l) => l.key === col.key);
                const hasFilter = (colFilters[col.key]?.length ?? 0) > 0;
                const isExclude = !!colExcludes[col.key];
                const menuOpen = openColMenu === col.key;
                const colMinWidth = (c: Column): string => {
                  if (c.thumbnail) return "80px";
                  if (c.key === "id") return "80px";
                  if (c.key === "description") return "150px";
                  if (c.key === "brand" || c.key === "flavor" || c.key === "package") return "100px";
                  if (c.key === "retailUpc") return "80px";
                  if (c.key === "channelRestricted") return "60px";
                  if (c.boolean) return "60px";
                  if (c.status) return "80px";
                  return "60px";
                };
                const colWidth = (_c: Column): string => "auto";
                return (
                  <th
                    key={col.key}
                    style={{ minWidth: colMinWidth(col), width: col.thumbnail ? "120px" : undefined, padding: col.thumbnail ? "9px 8px" : "9px 12px", textAlign: col.thumbnail ? "center" : "left", fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 600, color: isActive || hasFilter ? "var(--color-primary)" : menuOpen ? "var(--color-foreground)" : "var(--color-muted-foreground)", letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: menuOpen ? "2px solid var(--color-primary)" : "1px solid var(--color-border)", userSelect: "none", lineHeight: 1.3, cursor: interactive ? "pointer" : "default", position: "relative", transition: "color 0.15s" }}
                    onClick={() => interactive && handleHeaderClick(col.key)}
                    onMouseEnter={(e) => { if (interactive && !isActive && !hasFilter && !menuOpen) (e.currentTarget as HTMLElement).style.color = "var(--color-foreground)"; }}
                    onMouseLeave={(e) => { if (!isActive && !hasFilter && !menuOpen) (e.currentTarget as HTMLElement).style.color = "var(--color-muted-foreground)"; }}
                  >
                    {col.label && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                        {col.label}
                        {interactive && (isActive || hasFilter) && (
                          <span style={{ fontSize: "10px", lineHeight: 1 }}>
                            {isActive ? (sortLevels.find((l) => l.key === col.key)?.dir === "desc" ? "▼" : "▲") : "◉"}
                          </span>
                        )}
                        {col.info && <InfoButton text={col.info} alignRight={col.key === "status"} />}
                      </span>
                    )}
                    {menuOpen && (
                      <ColumnMenu
                        col={col}
                        isSortedAsc={sortLevels.length === 1 && sortLevels[0].key === col.key && sortLevels[0].dir === "asc"}
                        isSortedDesc={sortLevels.length === 1 && sortLevels[0].key === col.key && sortLevels[0].dir === "desc"}
                        filterValue={colFilters[col.key] ?? []}
                        filterExclude={isExclude}
                        filterOptions={col.boolean
                          ? [{ id: "true", label: "✓ Yes" }, { id: "false", label: "— No" }]
                          : (() => { const vals = [...new Set(allRows.map((r) => String((r as Record<string, unknown>)[col.key] ?? "")))]; const hasBlank = vals.includes(""); return [...(hasBlank ? [{ id: "", label: "(Blank)" }] : []), ...vals.filter(Boolean).sort().map((v) => ({ id: v, label: v }))]; })()}
                        onSort={(dir) => { applyQuickSort(col.key, dir); }}
                        onFilter={(val, exclude) => setColFilter(col.key, val, exclude)}
                        onHideColumn={() => setColConfigs((prev) => { const updated = { ...prev, [activeTab]: prev[activeTab].map((c) => c.key === col.key ? { ...c, visible: false } : c) }; try { localStorage.setItem("honickman-col-configs", JSON.stringify(updated)); } catch {} return updated; })}
                        onClose={() => setOpenColMenu(null)}
                        showFilter={true}
                      />
                    )}
                  </th>
                );
              })}
              <th style={{ width: 36, borderBottom: "1px solid var(--color-border)", background: "var(--color-muted)" }} />
            </tr>
          </thead>
          <tbody>
            {dbLoading && (
              <tr><td colSpan={columns.length + 1} style={{ padding: "48px 0", textAlign: "center", fontFamily: "var(--font-sans)", fontSize: "13px", color: "var(--color-muted-foreground)" }}>Loading…</td></tr>
            )}
            {!dbLoading && pagedRows.map((row, i) => (
              <TableRow
                key={i}
                index={i}
                row={row}
                columns={columns}
                clipboardActive={clipboardActive}
                clipboardColKey={clipboardColKey}
                clipboardSelected={clipboardActive && clipboardRowIds.includes(String((row as Row).id))}
                onClipboardClick={(colKey, shiftKey) => handleClipboardCellClick(String((row as Row).id), colKey, shiftKey)}
                onToggle={(key, val) => handleToggle(rawRows.findIndex((r) => r.id === (row as Row).id), key, val)}
                onEdit={(activeTab === "Sub-Brands" || activeTab === "Products" || activeTab === "Brands") ? (key, val) => handleEdit(rawRows.findIndex((r) => r.id === (row as Row).id), key, val) : undefined}
                onUpload={(activeTab === "Products" || activeTab === "Brands") ? (urls) => {
                  const rowId = (row as Row).id as string;
                  const webUrl = typeof urls === "string" ? urls : urls.webUrl;
                  const fullUrl = typeof urls === "string" ? null : urls.fullUrl;
                  if (activeTab === "Products") {
                    setTableData((prev) => {
                      const rs = [...prev["Products"]];
                      const idx = rs.findIndex((r) => r.id === rowId);
                      if (idx >= 0) rs[idx] = { ...rs[idx], thumbnail: webUrl };
                      return { ...prev, Products: rs };
                    });
                    supabase.from("products").update({ image_web_url: webUrl, ...(fullUrl ? { image_full_url: fullUrl } : {}) }).eq("id", rowId).then(() => {});
                  } else if (activeTab === "Brands") {
                    setTableData((prev) => {
                      const rs = [...prev["Brands"]];
                      const idx = rs.findIndex((r) => r.id === rowId);
                      if (idx >= 0) rs[idx] = { ...rs[idx], brandLogo: webUrl, ...(fullUrl ? { brandLogoFull: fullUrl } : {}) };
                      return { ...prev, Brands: rs };
                    });
                    supabase.from("brands").update({ brand_logo_web_url: webUrl, ...(fullUrl ? { brand_logo_url: fullUrl } : {}) }).eq("id", rowId).then(() => {});
                  }
                } : undefined}
                uploadFolder={activeTab === "Brands" ? "brands" : "products"}
                uploadAccept={activeTab === "Brands" ? "image/svg+xml,image/png,image/jpeg,image/webp" : "image/*"}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <footer className="px-8 py-2 flex items-center justify-between shrink-0" style={{ borderTop: "1px solid var(--color-border)", background: "var(--color-muted)" }}>
        <div className="flex items-center gap-3">
          {/* Page size */}
          <span style={{ fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 600, color: "var(--color-muted-foreground)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Show</span>
          <div style={{ display: "flex", gap: 2, background: "var(--color-card)", borderRadius: 4, padding: 2, border: "1px solid var(--color-border)" }}>
            {[25, 100, 500, 1000, 5000].map((opt) => {
              const active = pageSize === opt;
              return (
                <button
                  key={opt}
                  onClick={() => { setPageSize(opt); setPage(0); }}
                  style={{ fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", padding: "3px 10px", border: "none", borderRadius: 3, cursor: "pointer", transition: "background 0.15s, color 0.15s", background: active ? "var(--color-secondary)" : "transparent", color: active ? "#ffffff" : "var(--color-muted-foreground)" }}
                >
                  {opt.toLocaleString()}
                </button>
              );
            })}
          </div>
          <span style={{ width: "1px", height: "10px", background: "var(--color-border)", display: "inline-block" }} />
          {/* Prev / Next */}
          <div style={{ display: "flex", gap: 2 }}>
            {(["←", "→"] as const).map((dir) => {
              const isPrev = dir === "←";
              const disabled = isPrev ? safePage === 0 : safePage >= totalPages - 1;
              return (
                <button
                  key={dir}
                  onClick={() => setPage((p) => isPrev ? p - 1 : p + 1)}
                  disabled={disabled}
                  style={{ fontFamily: "var(--font-display)", fontSize: "13px", fontWeight: 600, padding: "2px 10px", border: "1px solid var(--color-border)", borderRadius: 3, cursor: disabled ? "default" : "pointer", background: "var(--color-card)", color: disabled ? "var(--color-border)" : "var(--color-muted-foreground)", transition: "color 0.15s" }}
                  onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.color = "var(--color-foreground)"; }}
                  onMouseLeave={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.color = "var(--color-muted-foreground)"; }}
                >
                  {dir}
                </button>
              );
            })}
          </div>
        </div>
        <span style={{ fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 600, color: "var(--color-muted-foreground)", letterSpacing: "0.1em" }}>
          {rows.length === 0 ? "0 records" : `${safePage * pageSize + 1}–${Math.min((safePage + 1) * pageSize, rows.length)} of ${rows.length.toLocaleString()} record${rows.length !== 1 ? "s" : ""}`}
        </span>
      </footer>
    </div>
  );
}
