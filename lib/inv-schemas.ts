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
  engineNumbers: z.array(z.string().trim().min(1).max(40)).max(50),
  costCny: z.number().min(0).max(1_000_000_000).nullable(),
  marginPct: z.number().min(0).max(1000).nullable(),
  linkedItemId: z.string().trim().max(64).nullable(),
  linkQty: z.number().int().min(1).max(100_000).nullable(),
};

export const createItemSchema = z.object({
  ...itemFields,
  unit: itemFields.unit.optional(),
  lowStockAt: itemFields.lowStockAt.optional(),
  priceNgn: itemFields.priceNgn.optional(),
  invoiceable: itemFields.invoiceable.optional(),
  engineNumbers: itemFields.engineNumbers.optional(),
  costCny: itemFields.costCny.optional(),
  marginPct: itemFields.marginPct.optional(),
  linkedItemId: itemFields.linkedItemId.optional(),
  linkQty: itemFields.linkQty.optional(),
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
  variant: z.enum(["ATOZEE", "ATOZEE_YUCHAI"]),
  customerName: req(120),
  customerAddress: text(200).nullable().optional(),
  jobDescription: text(300).nullable().optional(),
  tinNumber: text(40).nullable().optional(),
  refNo: text(60).nullable().optional(),
  applyVat: z.boolean(),
  deductStock: z.boolean(),
  lines: z
    .array(
      z.object({
        itemId: z.string().trim().max(64).nullable().optional(), // null/absent = custom line
        description: req(300),
        quantity: z.number().int().min(1).max(100_000),
        unit: text(20).optional(),
        unitPrice: z.number().min(0).max(1_000_000_000),
        lumpSum: z.boolean().optional(),
      })
    )
    .min(1, "Add at least one line")
    .max(40),
});

export const publishSchema = z
  .object({
    itemIds: z.array(z.string().trim().max(64)).max(500).optional(),
    filter: z
      .object({
        q: text(100).optional(),
        category: text(80).optional(),
        low: z.boolean().optional(),
        unpublishedOnly: z.boolean().optional(),
      })
      .optional(),
    updateExisting: z.boolean(),
    dryRun: z.boolean(),
  })
  .refine((v) => (v.itemIds && v.itemIds.length > 0) || v.filter, "Choose items or a filter");

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

export const settingsSchema = z.object({
  cnyToNgn: z.number().min(0).max(1_000_000),
  defaultMarginPct: z.number().min(0).max(1000),
});

export const invoiceActionSchema = z.object({
  action: z.enum(["markPaid", "markPending", "flagError", "clearError"]),
  reason: reasonSchema.optional(),
});

export const invoiceDeleteSchema = z.object({ returnStock: z.boolean() });
