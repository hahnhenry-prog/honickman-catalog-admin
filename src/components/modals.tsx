import { useState, useRef, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { ClipboardOverlay, HamburgerMenu } from "./chrome";
import { MultiSelectDropdown, SingleSelectDropdown } from "./inputs";
import { parseCsvText } from "../lib/csv";
import { uploadToS3 } from "../lib/s3";
import { BRAND_CATEGORIES, BulkFile, BulkFileStatus, DataSettings, REQUIRED_HEADERS } from "../types";

export function DataSettingsModal({ settings, onSave, onClose }: {
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


export function TemporaryExclusionsModal({ onClose }: { onClose: () => void }) {
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


export function BulkUploadModal({ onClose, productIds, onUploaded }: {
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


export function AddBrandModal({ existingBrands, onClose, onAdded }: {
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

