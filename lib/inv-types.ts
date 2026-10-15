// Shared (client + server) types for the inventory system. No Prisma imports
// here so client components can use them freely.
export type Role = "GLOBAL_ADMIN" | "YUCHAI_STAFF" | "ATOZEE_STAFF";
export type Lang = "en" | "zh";

export const ROLES: Role[] = ["GLOBAL_ADMIN", "YUCHAI_STAFF", "ATOZEE_STAFF"];
// Only Atozee staff may CREATE invoices; the global admin can view them for oversight.
export const canCreateInvoices = (r: Role) => r === "ATOZEE_STAFF";
export const canViewInvoices = (r: Role) => r === "ATOZEE_STAFF" || r === "GLOBAL_ADMIN";
// Publishing pushes data into the Atozee store, so it's an Atozee-side action.
export const canPublish = (r: Role) => r === "ATOZEE_STAFF" || r === "GLOBAL_ADMIN";
// Margins / selling prices are Atozee's business — Yuchai staff see costs and stock only.
export const canSeePricing = canPublish;
export const isAdmin = (r: Role) => r === "GLOBAL_ADMIN";

export interface SessionUserVM {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  language: Lang;
}
export type PriceSource = "computed" | "manual" | "none";
export interface ItemLinkVM {
  itemId: string;
  partNumber: string;
  name: string;
  required: number; // units of the linked item needed per unit of this item
  linkedQty: number; // units of the linked item currently on hand
}
export interface ItemVM {
  id: string;
  partNumber: string;
  nameEn: string;
  nameZh: string | null;
  category: string;
  description: string | null;
  unit: string;
  quantity: number;
  lowStockAt: number;
  invoiceable: boolean;
  engineNumbers: string[];
  costCny: number | null;
  // Pricing fields are hidden (null / 0) from roles that can't see Atozee's margin.
  priceNgn: number; // manual NGN price (used only when there is no cost)
  marginPct: number | null; // per-item margin override
  sellPriceNgn: number | null; // what the store/invoices use: computed or manual
  priceSource: PriceSource;
  link: ItemLinkVM | null;
  sellable: number; // min(own stock, how many units the linked item can support)
  updatedAt: string;
  publishedAt: string | null;
}
export interface SettingsVM {
  cnyToNgn: number;
  defaultMarginPct: number;
}
export type PaymentStatus = "PENDING" | "PAID";
export interface InvoiceRowVM {
  id: string;
  number: string;
  variant: InvoiceVariant;
  customerName: string;
  total: number;
  paymentStatus: PaymentStatus;
  isError: boolean;
  createdByName: string;
  createdAt: string;
}
export interface MovementVM {
  id: string;
  partNumber: string;
  itemName: string;
  type: "ADDED" | "REMOVED";
  quantity: number;
  balanceAfter: number;
  reason: string;
  username: string;
  createdAt: string;
}
export type InvoiceVariant = "ATOZEE" | "ATOZEE_YUCHAI";
export interface InvoiceLine {
  itemId: string | null; // null = custom line (service, delivery, ...)
  partNumber: string | null;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
  lumpSum: boolean; // printed as "Lot" / "LS"
}
export interface InvoiceVM {
  id: string;
  number: string;
  variant: InvoiceVariant;
  customerName: string;
  customerAddress: string | null;
  jobDescription: string | null;
  tinNumber: string | null;
  refNo: string | null;
  lines: InvoiceLine[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  paymentStatus: PaymentStatus;
  paidAt: string | null;
  paidByName: string | null;
  isError: boolean;
  errorReason: string | null;
  errorFlaggedBy: string | null;
  errorFlaggedAt: string | null;
  stockDeducted: boolean;
  createdByName: string;
  createdAt: string;
}
export interface UserVM {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  isActive: boolean;
  language: Lang;
  createdAt: string;
}
