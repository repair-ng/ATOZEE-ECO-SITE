import * as XLSX from "xlsx";

// Bulk upload of inventory items from Excel/CSV. Header matching is loose
// (case/spacing/punctuation-insensitive) so a lightly edited template still works.

export const IMPORT_MAX_ROWS = 1000;
export const IMPORT_MAX_BYTES = 5 * 1024 * 1024;

export class ImportFileError extends Error {
  constructor(public code: "BAD_FILE" | "TOO_MANY_ROWS") {
    super(code);
  }
}

export interface ImportRow {
  row: number; // spreadsheet row (header = 1)
  partNumber: string; nameEn: string; nameZh: string | null; category: string; description: string | null;
  unit: string | null; quantity: number; lowStockAt: number | null; costCny: number | null; priceNgn: number | null;
  marginPct: number | null; invoiceable: boolean | null; engineNumbers: string[];
  linkedTo: string | null; linkQty: number | null;
}
export interface ImportIssue { row: number; partNumber: string; code: string; detail?: string }

type Field =
  | "partNumber" | "nameEn" | "nameZh" | "category" | "description" | "unit" | "quantity" | "lowStockAt"
  | "costCny" | "priceNgn" | "marginPct" | "invoiceable" | "engineNumbers" | "linkedTo" | "linkQty";

const ALIASES: Record<string, Field> = {
  partnumber: "partNumber", partno: "partNumber", part: "partNumber", sku: "partNumber",
  nameenglish: "nameEn", nameen: "nameEn", name: "nameEn", itemname: "nameEn",
  namechinese: "nameZh", namezh: "nameZh", chinesename: "nameZh",
  category: "category", description: "description", desc: "description", unit: "unit",
  quantity: "quantity", qty: "quantity", stock: "quantity",
  lowstockalert: "lowStockAt", lowstock: "lowStockAt", lowstockat: "lowStockAt",
  costcny: "costCny", cost: "costCny", costyuan: "costCny", costrmb: "costCny",
  pricengn: "priceNgn", price: "priceNgn", sellingprice: "priceNgn",
  profitmargin: "marginPct", margin: "marginPct", marginpct: "marginPct",
  canbeinvoicedyesno: "invoiceable", canbeinvoiced: "invoiceable", invoiceable: "invoiceable",
  enginenumberscommaseparated: "engineNumbers", enginenumbers: "engineNumbers", engines: "engineNumbers",
  engine: "engineNumbers", fits: "engineNumbers",
  linkedtopartnumber: "linkedTo", linkedto: "linkedTo", linkedwith: "linkedTo", linkto: "linkedTo",
  linkquantity: "linkQty", linkqty: "linkQty", requiredquantity: "linkQty",
};

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");
const splitList = (v: string) => v.split(/[,;|\n]+/).map((x) => x.trim()).filter(Boolean);

function parseNum(v: string): number | null | "BAD" {
  const c = v.replace(/[,\s₦¥%]/g, "");
  if (c === "") return null;
  const x = Number(c);
  return Number.isFinite(x) ? x : "BAD";
}

function parseBool(v: string, dflt: boolean) {
  const t = v.trim().toLowerCase();
  if (["yes", "y", "true", "1"].includes(t)) return true;
  if (["no", "n", "false", "0"].includes(t)) return false;
  return dflt;
}

export function parseInventoryWorkbook(buffer: Buffer): { rows: ImportRow[]; issues: ImportIssue[] } {
  let raw: Record<string, unknown>[];
  try {
    const wb = XLSX.read(buffer, {
      type: "buffer", sheetRows: IMPORT_MAX_ROWS + 2, // hard stop on huge files
      cellFormula: false, cellHTML: false, cellStyles: false, bookVBA: false,
    });
    const sheetName: string | undefined =
      wb.SheetNames.find((n: string) => norm(n) !== "instructions") ?? wb.SheetNames[0];
    if (!sheetName) throw new Error("no sheet");
    raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], { defval: "", raw: false });
  } catch {
    throw new ImportFileError("BAD_FILE");
  }
  if (raw.length > IMPORT_MAX_ROWS) throw new ImportFileError("TOO_MANY_ROWS");

  const rows: ImportRow[] = [];
  const issues: ImportIssue[] = [];
  const seen = new Set<string>();

  raw.forEach((r: Record<string, unknown>, idx: number) => {
    const row = idx + 2;
    const f: Partial<Record<Field, string>> = {};
    for (const key of Object.keys(r)) {
      const field = ALIASES[norm(key)];
      const val = String(r[key] ?? "").trim();
      if (field && (f[field] === undefined || f[field] === "")) f[field] = val;
    }
    const partNumber = f.partNumber ?? "", nameEn = f.nameEn ?? "", category = f.category ?? "";
    if (!partNumber && !nameEn && !category) return; // blank spreadsheet row

    const bad = (code: string, detail?: string) => issues.push({ row, partNumber, code, detail });
    if (!partNumber) return bad("REQUIRED", "Part Number");
    if (!nameEn) return bad("REQUIRED", "Name (English)");
    if (!category) return bad("REQUIRED", "Category");
    if (partNumber.length > 60 || nameEn.length > 160 || category.length > 80 ||
        (f.nameZh ?? "").length > 160 || (f.description ?? "").length > 2000 || (f.unit ?? "").length > 20) {
      return bad("TOO_LONG");
    }
    if (seen.has(partNumber)) return bad("DUP_IN_FILE");

    const num = (field: Field) => parseNum(f[field] ?? "");
    const quantity = num("quantity"), low = num("lowStockAt"), cost = num("costCny");
    const price = num("priceNgn"), margin = num("marginPct"), linkQty = num("linkQty");
    for (const [label, v] of [["Quantity", quantity], ["Low-stock alert", low], ["Cost (CNY)", cost],
      ["Price (NGN)", price], ["Profit margin %", margin], ["Link Quantity", linkQty]] as const) {
      if (v === "BAD") return bad("BAD_NUMBER", label);
    }
    const q = quantity === null || quantity === "BAD" ? 0 : quantity;
    if (!Number.isInteger(q) || q < 0 || q > 1_000_000) return bad("BAD_NUMBER", "Quantity");
    const lowAt = low === null || low === "BAD" ? null : low;
    if (lowAt !== null && (!Number.isInteger(lowAt) || lowAt < 0 || lowAt > 1_000_000)) return bad("BAD_NUMBER", "Low-stock alert");
    for (const [label, v, max] of [["Cost (CNY)", cost, 1e9], ["Price (NGN)", price, 1e9], ["Profit margin %", margin, 1000]] as const) {
      if (typeof v === "number" && (v < 0 || v > max)) return bad("BAD_NUMBER", label);
    }
    if (typeof linkQty === "number" && (!Number.isInteger(linkQty) || linkQty < 1 || linkQty > 100_000)) return bad("BAD_NUMBER", "Link Quantity");

    const seenEngines = new Set<string>(); // case-insensitive, first spelling wins (same rule as the item form)
    const engines = splitList(f.engineNumbers ?? "").filter((e) => !seenEngines.has(e.toLowerCase()) && seenEngines.add(e.toLowerCase()));
    if (engines.length > 50 || engines.some((e) => e.length > 40)) return bad("TOO_LONG", "Engine Numbers");

    seen.add(partNumber);
    rows.push({
      row, partNumber, nameEn, nameZh: f.nameZh || null, category, description: f.description || null,
      unit: f.unit || null, quantity: q, lowStockAt: lowAt,
      costCny: typeof cost === "number" ? cost : null, priceNgn: typeof price === "number" ? price : null,
      marginPct: typeof margin === "number" ? margin : null, invoiceable: (f.invoiceable ?? "") === "" ? null : parseBool(f.invoiceable ?? "", true),
      engineNumbers: engines, linkedTo: f.linkedTo || null,
      linkQty: typeof linkQty === "number" ? linkQty : null,
    });
  });
  return { rows, issues };
}

export const TEMPLATE_HEADERS = [
  "Part Number", "Name (English)", "Name (Chinese)", "Category", "Description", "Unit", "Quantity",
  "Low-stock alert", "Cost (CNY)", "Price (NGN)", "Profit margin %", "Can be invoiced (yes/no)",
  "Engine Numbers (comma-separated)", "Linked To (part number)", "Link Quantity",
];

export function buildInventoryTemplate(): Buffer {
  // The Products sheet is header-only on purpose: example rows would be imported as real items if the file were uploaded unedited.
  const products = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
  products["!cols"] = TEMPLATE_HEADERS.map((h: string) => ({ wch: Math.max(16, h.length + 2) }));

  const help = XLSX.utils.aoa_to_sheet([
    ["How to use this template"],
    [""],
    ["Fill in the 'Products' sheet — one item per row. Keep the header row. Column order doesn't matter."],
    ["Required: Part Number, Name (English), Category. Everything else is optional."],
    ["Quantity: whole number, defaults to 0. Each new item is recorded in the stock log as 'Bulk upload'."],
    ["Cost (CNY): the cost in Chinese yuan. If given, the store price is calculated from the exchange rate and profit margin set under Settings."],
    ["Price (NGN) / Profit margin %: used by Atozee staff and admins only (ignored for Yuchai staff). Price (NGN) is used only when there is no Cost; Profit margin % overrides the default margin for that item."],
    ["Can be invoiced: yes/no, defaults to yes."],
    ["Engine Numbers: the engines the part fits, separated by commas (e.g. YC6MK340-36, YC4D120-30). These are copied to the store so customers can search by engine."],
    ["Linked To: the Part Number of another item this one depends on, with Link Quantity = how many of that item are needed per unit. The item is only treated as in stock while the linked item has enough."],
    ["  - A linked item can't be linked to itself, and the item it links to can't itself be linked to another item."],
    ["  - The linked item must already exist, or be in this same file."],
    ["If a Part Number already exists, that row is skipped — unless you tick 'Update existing items' when uploading, which refreshes the details but NEVER changes the stock quantity."],
    [""],
    ["Example row:"],
    TEMPLATE_HEADERS,
    ["K6000-1013104007B#-H", "Connecting rod bearing", "连杆轴承", "Bearings", "Genuine Yuchai part", "pcs", 20, 5, 555, "", "", "yes", "YC6MK340-36, YC4D120-30", "", ""],
    ["KIT-001", "Bearing service kit", "轴承维修包", "Kits", "", "set", 5, 2, 1200, "", 10, "yes", "YC6MK340-36", "K6000-1013104007B#-H", 4],
  ]);
  help["!cols"] = [{ wch: 28 }, ...TEMPLATE_HEADERS.slice(1).map(() => ({ wch: 22 }))];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, products, "Products");
  XLSX.utils.book_append_sheet(wb, help, "Instructions");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
