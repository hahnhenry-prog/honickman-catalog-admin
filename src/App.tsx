// Catalog admin — table views for Products, Brands, Sub-Brands and Packages.
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { supabase } from "./lib/supabase";
import honickmanLogo from "./assets/TheHonickmanCompanies-1.svg";
import { CATALOG_PRESETS, CatalogFilter, ColConfig, Column, DEFAULT_FILTERS, DataSettings, EMPTY_SETTINGS, Row, SortDir, SortLevel, TABLES, TABS, Tab } from "./types";
import { parseCsvText } from "./lib/csv";
import { sortRows } from "./lib/sort";
import { getTabDefaults, loadViewState, saveViewState } from "./lib/viewState";
import { InfoButton } from "./components/inputs";
import { ColumnManagerModal, ColumnMenu, SortModal, TableRow } from "./components/table";
import { AddBrandModal, BulkUploadModal, DataSettingsModal, TemporaryExclusionsModal } from "./components/modals";
import { ClipboardOverlay, HamburgerMenu } from "./components/chrome";

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

