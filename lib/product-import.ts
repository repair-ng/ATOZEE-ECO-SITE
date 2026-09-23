import * as XLSX from "xlsx";

// ---------------------------------------------------------------------------
// Bulk product import from Excel (.xlsx/.xls) or .csv
//
// Column headers are matched loosely (case/space/punctuation-insensitive)
// against a set of known aliases, so admins can reorder columns or tweak
// header wording in the template without breaking the import.
// ---------------------------------------------------------------------------

export interface ProductImportRow {
  row: number; // 1-based spreadsheet row number (header is row 1), for user-facing messages
  name: string;
  slug: string;
  partNumber: string;
  category: string;
  description: string | null;
  price: number;
  inStock: boolean;
  isActive: boolean;
  images: string[];
  engineNumbers: string[];
}

export interface ImportRowIssue {
  row: number;
  name: string;
  message: string;
}

export interface ImportRowSkipped {
  row: number;
  name: string;
  reason: string;
}

export interface ExistingProductLike {
  id: string;
  name: string;
  slug: string;
  partNumber: string;
  category: string;
  description: string | null;
  price: unknown; // Prisma Decimal — compared via Number()
  inStock: boolean;
  isActive: boolean;
  images: string[];
  engineNumbers: string[];
}

type CanonicalField =
  | "name"
  | "slug"
  | "partNumber"
  | "category"
  | "description"
  | "price"
  | "inStock"
  | "isActive"
  | "engineNumbers"
  | "images";

// Maps a normalized header (lowercase, alphanumeric only) to the field it feeds.
const HEADER_ALIASES: Record<string, CanonicalField> = {
  name: "name",
  productname: "name",
  title: "name",
  slug: "slug",
  urlslug: "slug",
  partnumber: "partNumber",
  part: "partNumber",
  partno: "partNumber",
  partnum: "partNumber",
  sku: "partNumber",
  category: "category",
  cat: "category",
  description: "description",
  desc: "description",
  price: "price",
  pricengn: "price",
  priceusd: "price",
  priceinngn: "price",
  instock: "inStock",
  stock: "inStock",
  stockstatus: "inStock",
  active: "isActive",
  isactive: "isActive",
  visible: "isActive",
  visibleincatalog: "isActive",
  enginenumbers: "engineNumbers",
  enginenumber: "engineNumbers",
  engines: "engineNumbers",
  fitsenginenumbers: "engineNumbers",
  compatibleengines: "engineNumbers",
  imageurls: "images",
  imageurl: "images",
  images: "images",
  image: "images",
};

function normalizeHeaderKey(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function splitList(value: string): string[] {
  if (!value) return [];
  return value
    .split(/[,;|\n]+/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function dedupeList(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const key = v.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(v);
    }
  }
  return out;
}

function parseBoolean(value: string, defaultValue: boolean): boolean {
  if (value === undefined || value === null || value.trim() === "") return defaultValue;
  const v = value.trim().toLowerCase();
  if (["yes", "y", "true", "1", "in stock", "active"].includes(v)) return true;
  if (["no", "n", "false", "0", "out of stock", "hidden", "inactive"].includes(v)) return false;
  return defaultValue;
}

function parsePrice(value: string): number | null {
  if (value === undefined || value === null || value.trim() === "") return null;
  const cleaned = value.replace(/[^0-9.\-]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isNaN(n) ? null : n;
}

/**
 * Parses an uploaded workbook buffer into validated product rows, plus a
 * list of row-level validation errors for anything that couldn't be used.
 * Fully blank rows (common trailing rows in a spreadsheet) are silently
 * ignored rather than reported as errors.
 */
export function parseProductImportFile(buffer: Buffer): {
  valid: ProductImportRow[];
  errors: ImportRowIssue[];
} {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName: string =
    workbook.SheetNames.find((n: string) => normalizeHeaderKey(n) !== "instructions") ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  const valid: ProductImportRow[] = [];
  const errors: ImportRowIssue[] = [];

  rawRows.forEach((raw: Record<string, unknown>, index: number) => {
    const rowNumber = index + 2; // account for the header row

    const fields: Partial<Record<CanonicalField, string>> = {};
    for (const key of Object.keys(raw)) {
      const canonical = HEADER_ALIASES[normalizeHeaderKey(key)];
      if (!canonical) continue;
      const value = String(raw[key] ?? "").trim();
      // First matching column wins if a header alias collides more than once.
      if (fields[canonical] === undefined || fields[canonical] === "") {
        fields[canonical] = value;
      }
    }

    const name = (fields.name ?? "").trim();
    const partNumber = (fields.partNumber ?? "").trim();
    const category = (fields.category ?? "").trim();
    const priceRaw = fields.price ?? "";
    const price = parsePrice(priceRaw);

    const isBlankRow = !name && !partNumber && !category && !priceRaw && !(fields.slug ?? "").trim();
    if (isBlankRow) return;

    const rowErrors: string[] = [];
    if (!name) rowErrors.push("Name is required.");
    if (!partNumber) rowErrors.push("Part number is required.");
    if (!category) rowErrors.push("Category is required.");
    if (price === null) rowErrors.push("A valid price is required.");
    else if (price < 0) rowErrors.push("Price can't be negative.");

    const slugSource = (fields.slug ?? "").trim() || name;
    const slug = slugify(slugSource);
    if (name && !slug) rowErrors.push("Could not derive a valid slug — add one manually in the Slug column.");

    if (rowErrors.length > 0) {
      errors.push({ row: rowNumber, name: name || `(row ${rowNumber})`, message: rowErrors.join(" ") });
      return;
    }

    valid.push({
      row: rowNumber,
      name,
      slug,
      partNumber,
      category,
      description: (fields.description ?? "").trim() || null,
      price: price as number,
      inStock: parseBoolean(fields.inStock ?? "", true),
      isActive: parseBoolean(fields.isActive ?? "", true),
      images: dedupeList(splitList(fields.images ?? "")),
      engineNumbers: dedupeList(splitList(fields.engineNumbers ?? "")),
    });
  });

  return { valid, errors };
}

function normalizeForCompare(v: string): string {
  return v.trim().toLowerCase();
}

function sameStringSet(a: string[], b: string[]): boolean {
  const na = Array.from(new Set(a.map(normalizeForCompare))).sort();
  const nb = Array.from(new Set(b.map(normalizeForCompare))).sort();
  if (na.length !== nb.length) return false;
  return na.every((v, i) => v === nb[i]);
}

function isExactDuplicate(incoming: ProductImportRow, existing: ExistingProductLike): boolean {
  return (
    normalizeForCompare(incoming.name) === normalizeForCompare(existing.name) &&
    normalizeForCompare(incoming.category) === normalizeForCompare(existing.category) &&
    normalizeForCompare(incoming.description ?? "") === normalizeForCompare(existing.description ?? "") &&
    Number(incoming.price) === Number(existing.price) &&
    incoming.inStock === existing.inStock &&
    incoming.isActive === existing.isActive &&
    sameStringSet(incoming.engineNumbers, existing.engineNumbers)
  );
}

export interface ClassifiedImport {
  toCreate: ProductImportRow[];
  skipped: ImportRowSkipped[];
  conflicts: ImportRowIssue[];
}

/**
 * Splits validated rows into: new products to create, exact duplicates of
 * existing products to skip, and conflicts (same slug/part number as an
 * existing product, but other details differ) which are left untouched so
 * nothing gets silently overwritten. Also de-dupes rows against each other
 * within the same file.
 */
export function classifyProductImportRows(
  rows: ProductImportRow[],
  existingProducts: ExistingProductLike[]
): ClassifiedImport {
  const bySlug = new Map(existingProducts.map((p) => [normalizeForCompare(p.slug), p]));
  const byPartNumber = new Map(existingProducts.map((p) => [normalizeForCompare(p.partNumber), p]));

  const toCreate: ProductImportRow[] = [];
  const skipped: ImportRowSkipped[] = [];
  const conflicts: ImportRowIssue[] = [];

  const seenSlugs = new Set<string>();
  const seenPartNumbers = new Set<string>();

  for (const row of rows) {
    const slugKey = normalizeForCompare(row.slug);
    const partKey = normalizeForCompare(row.partNumber);

    if (seenSlugs.has(slugKey) || seenPartNumbers.has(partKey)) {
      skipped.push({ row: row.row, name: row.name, reason: "Duplicate of another row earlier in this file." });
      continue;
    }

    const matchBySlug = bySlug.get(slugKey);
    const match = matchBySlug ?? byPartNumber.get(partKey);

    if (match) {
      if (isExactDuplicate(row, match)) {
        skipped.push({
          row: row.row,
          name: row.name,
          reason: "Already exists in the catalog with identical details.",
        });
      } else {
        conflicts.push({
          row: row.row,
          name: row.name,
          message: `A product with the same ${matchBySlug ? "slug" : "part number"} already exists ("${match.name}") but with different details. Edit it directly from the product list instead, or change the slug/part number here to create a new product.`,
        });
      }
      seenSlugs.add(slugKey);
      seenPartNumbers.add(partKey);
      continue;
    }

    toCreate.push(row);
    seenSlugs.add(slugKey);
    seenPartNumbers.add(partKey);
  }

  return { toCreate, skipped, conflicts };
}

/** Builds the downloadable .xlsx template admins fill in for bulk import. */
export function buildProductImportTemplate(): Buffer {
  const headers = [
    "Name",
    "Slug (optional)",
    "Part Number",
    "Category",
    "Description",
    "Price (NGN)",
    "In Stock (yes/no)",
    "Active (yes/no)",
    "Engine Numbers (comma-separated)",
    "Image URLs (comma-separated, optional)",
  ];

  const exampleRow = [
    "Front Brake Pad Set",
    "",
    "BP-2201",
    "Brakes",
    "OEM-spec ceramic brake pad set, front axle.",
    "18500",
    "yes",
    "yes",
    "4G15, 4G93, 4D56",
    "",
  ];

  const productsSheet = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
  productsSheet["!cols"] = headers.map((h) => ({ wch: Math.max(20, h.length) }));

  const instructionsSheet = XLSX.utils.aoa_to_sheet([
    ["How to use this template"],
    [""],
    ["1. Keep the header row on the 'Products' sheet — column order doesn't matter, but don't rename the headers."],
    ["2. Replace the example row with your real products, or add more rows below it."],
    ["3. Name, Part Number, Category and Price are required for every row."],
    ["4. Slug is optional — leave it blank and it will be generated from the Name automatically."],
    ["5. 'In Stock' and 'Active' accept yes/no, true/false, or 1/0. Leave blank to default to 'yes'."],
    ["6. Engine Numbers: separate multiple entries with a comma, semicolon, or line break."],
    ["7. Image URLs are optional — bulk import does not upload image files. Add images to each product afterwards from its Edit page, or paste already-hosted image URLs into this column."],
    ["8. Rows that exactly match a product already in the catalog (same name, category, price, stock status, visibility and engine numbers) are skipped automatically."],
    ["9. Rows whose Slug or Part Number matches an existing product but with different details are flagged as conflicts and left untouched — edit that product directly instead of importing over it."],
  ]);
  instructionsSheet["!cols"] = [{ wch: 110 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, productsSheet, "Products");
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
