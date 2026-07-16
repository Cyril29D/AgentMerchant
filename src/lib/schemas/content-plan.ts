import { z } from "zod";

export const EvidenceSchema = z.object({
  sourceType: z.enum([
    "merchant_profile",
    "product",
    "service",
    "photo",
    "weather",
    "news",
    "season",
  ]),
  sourceId: z.string().min(1),
  claim: z.string().min(1),
});

export const ValidationSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  warnings: z.array(z.string()),
});

export const ContentPostSchema = z.object({
  day: z.number().int().min(1).max(5),
  date: z.string(),
  objective: z.string().min(1),
  topic: z.string().min(1),
  caption: z.string().min(1),

  imageId: z.string().nullable(),
  imagePath: z.string().nullable(),
  imageReason: z.string().min(1),

  context: z.array(z.string()),
  evidence: z.array(EvidenceSchema),

  validation: ValidationSchema,
});

export const ContextStatusSchema = z.object({
  weather: z.enum([
    "available",
    "unavailable",
  ]),

  weatherContextCount: z
    .number()
    .int()
    .min(0),

  calendar: z.literal("available"),

  calendarContextCount: z
    .number()
    .int()
    .min(0),

  warnings: z.array(z.string()),
});

export const ContentPlanSchema = z.object({
  merchantId: z.string().min(1),
  merchantName: z.string().min(1),
  generatedAt: z.string(),
  contextStatus: ContextStatusSchema,
  posts: z.array(ContentPostSchema).length(5),
});

export type Evidence = z.infer<typeof EvidenceSchema>;
export type Validation = z.infer<typeof ValidationSchema>;
export type ContentPost = z.infer<
  typeof ContentPostSchema
>;
export type ContentPlan = z.infer<
  typeof ContentPlanSchema
>;
