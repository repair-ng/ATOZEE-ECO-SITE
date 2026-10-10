// Shared (client + server) types for the inventory system. No Prisma imports
// here so client components can use them freely.
export type Role = "GLOBAL_ADMIN" | "YUCHAI_STAFF" | "ATOZEE_STAFF";
export type Lang = "en" | "zh";

export const ROLES: Role[] = ["GLOBAL_ADMIN", "YUCHAI_STAFF", "ATOZEE_STAFF"];
export const canInvoice = (r: Role) => r === "ATOZEE_STAFF" || r === "GLOBAL_ADMIN";
export const isAdmin = (r: Role) => r === "GLOBAL_ADMIN";

export interface SessionUserVM {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  language: Lang;
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
  priceNgn: number;
  invoiceable: boolean;
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
export interface InvoiceLine {
  itemId: string;
  partNumber: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}
export interface InvoiceVM {
  id: string;
  number: string;
  customerName: string;
  customerContact: string | null;
  notes: string | null;
  lines: InvoiceLine[];
  total: number;
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
