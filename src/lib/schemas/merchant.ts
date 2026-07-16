import { z } from "zod";

export const ProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  verified: z.boolean(),
});

export const ServiceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  verified: z.boolean(),
});

export const PromotionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  verified: z.boolean(),
});

export const MerchantEventSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  date: z.string(),
  verified: z.boolean(),
});

export const MerchantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  businessType: z.string().min(1),
  city: z.string().min(1),
  description: z.string().min(1),
  tone: z.string().min(1),

  products: z.array(ProductSchema),
  services: z.array(ServiceSchema),

  openingHours: z.record(z.string(), z.string()),

  promotions: z.array(PromotionSchema),
  events: z.array(MerchantEventSchema),

  forbiddenClaims: z.array(z.string()),
});

export type Product = z.infer<typeof ProductSchema>;
export type Service = z.infer<typeof ServiceSchema>;
export type Merchant = z.infer<typeof MerchantSchema>;
