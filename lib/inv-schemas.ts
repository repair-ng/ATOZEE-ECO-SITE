import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
const req = (max: number) => z.string().trim().min(1, "Required").max(max);

export const reasonSchema = z.string().trim().min(3, "Please give a reason (min 3 characters)").max(300);

// NB: no .default() in these field definitions — in PATCH (partial) a default
// would silently reset fields the client didn't send.
const itemFields = {
  partNumber: req(60),
  nameEn: req(160),
  nameZh: text(160).nullable().optional(),
  category: req(80),
  description: text(2000).nullable().optional(),
  unit: req(20),
  lowStockAt: z.number().int().min(0).max(1_000_000),
  priceNgn: z.number().min(0).max(1_000_000_000),
  invoiceable: z.boolean(),
};

export const createItemSchema = z.object({
  ...itemFields,
  unit: itemFields.unit.optional(),
  lowStockAt: itemFields.lowStockAt.optional(),
  priceNgn: itemFields.priceNgn.optional(),
  invoiceable: itemFields.invoiceable.optional(),
  quantity: z.number().int().min(0).max(1_000_000),
  reason: reasonSchema,
});

export const updateItemSchema = z.object(itemFields).partial();

export const stockSchema = z.object({
  type: z.enum(["ADDED", "REMOVED"]),
  quantity: z.number().int().min(1).max(1_000_000),
  reason: reasonSchema,
});

export const deleteSchema = z.object({ reason: reasonSchema });

export const invoiceSchema = z.object({
  customerName: req(120),
  customerContact: text(120).nullable().optional(),
  notes: text(1000).nullable().optional(),
  deductStock: z.boolean(),
  lines: z
    .array(
      z.object({
        itemId: req(64),
        quantity: z.number().int().min(1).max(100_000),
        unitPrice: z.number().min(0).max(1_000_000_000),
      })
    )
    .min(1, "Add at least one line")
    .max(50),
});

const roleEnum = z.enum(["GLOBAL_ADMIN", "YUCHAI_STAFF", "ATOZEE_STAFF"]);
const passwordSchema = z.string().min(10, "Password must be at least 10 characters").max(128);

export const createUserSchema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,32}$/, "3-32 chars: letters, numbers, . _ -"),
  displayName: req(80),
  password: passwordSchema,
  role: roleEnum,
});

export const updateUserSchema = z
  .object({
    displayName: req(80),
    role: roleEnum,
    isActive: z.boolean(),
    password: passwordSchema,
  })
  .partial();

export const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1).max(64),
  password: z.string().min(1).max(128),
});

export const languageSchema = z.object({ language: z.enum(["en", "zh"]) });
