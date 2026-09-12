import { InfoButton } from "./components/inputs";

export type Column = {
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


export type Row = Record<string, string | number | boolean>;


export type TableData = {
  columns: Column[];
  rows: Row[];
};


export const TABLES: Record<string, TableData> = {
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


export const TABS = ["Products", "Brands", "Sub-Brands", "Packages"] as const;

export type Tab = (typeof TABS)[number];

// ─── InfoButton ───────────────────────────────────────────────────────────────


export const REQUIRED_HEADERS = [
  "Warehouse ID", "Warehouse", "Product ID", "Product Description",
  "Sub ID", "Sub Description", "Sub R12 Volume",
  "Brand ID", "Brand", "Package ID", "Package",
  "Product Ownership", "Product Status",
];


export type ParsedRow = Record<string, string>;


export type DataSettings = {
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


export const EMPTY_SETTINGS: DataSettings = {
  fileName: null, csvText: null, parsedRows: [],
  statusesToInclude: [], brandsToExclude: [], packagesToExclude: [], fountainPackages: [],
  pcnyWarehouse: null, pnbWarehouse: null, cddvWarehouse: null, cdpWarehouse: null,
};


export type BulkFileStatus = "pending" | "matched" | "unmatched" | "uploading" | "done" | "error";


export interface BulkFile {
  file: File;
  productId: string | null; // null = unmatched
  assignedId: string;       // editable by user for unmatched
  status: BulkFileStatus;
  webUrl?: string;
  error?: string;
}


export const BRAND_CATEGORIES = ["Carbonated Soft Drinks", "Non-Carbonated Soft Drinks", "Water", "Sparkling Water & Seltzer", "Tea", "Coffee", "Isotonic, Sports & Protein", "Energy"];


export const HAMBURGER_ITEMS = ["Hide / Show Columns", "Download as CSV", "Upload Images", "Delete Records", "Temporary Exclusions"];


export type CatalogFilter = "PCNY" | "PNB" | "CDDV" | "CDP";

export type SortDir = "asc" | "desc";

export type SortLevel = { key: string; dir: SortDir };


export const DEFAULT_FILTERS: Record<string, string[]> = { status: ["Active"] };


export const CATALOG_PRESETS: Record<CatalogFilter, Record<string, string[]>> = {
  PCNY: { status: ["Active"], pcny: ["true"], channelRestricted: ["false"] },
  PNB:  { status: ["Active"], pnb: ["true"],  channelRestricted: ["false"] },
  CDDV: { status: ["Active"], cddv: ["true"], channelRestricted: ["false"] },
  CDP:  { status: ["Active"], cdp: ["true"],  channelRestricted: ["false"] },
};


export type ColConfig = { key: string; visible: boolean };


export type TabViewState = { sortLevels: SortLevel[]; colFilters: Record<string, string[]>; colExcludes: Record<string, boolean>; pageSize: number; page: number };
