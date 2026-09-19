import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(7).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  address: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const cartItemSchema = z.object({
  productId: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  partNumber: z.string(),
  price: z.number().nonnegative(),
  quantity: z.number().int().positive(),
  inStock: z.boolean(),
});

export const checkoutInitSchema = z.object({
  items: z.array(cartItemSchema).min(1),
  deliveryMethod: z.enum(["delivery", "pickup"]),
  deliveryAddress: z.string().optional(),
  deliveryState: z.string().optional(),
});

export const quoteRequestSchema = z.object({
  items: z.array(cartItemSchema).min(1),
  deliveryMethod: z.enum(["delivery", "pickup"]),
  deliveryAddress: z.string().optional(),
  deliveryState: z.string().optional(),
  notes: z.string().optional(),
});

export const deliveryRateSchema = z.object({
  state: z.string().min(1),
  price: z.number().nonnegative(),
});
