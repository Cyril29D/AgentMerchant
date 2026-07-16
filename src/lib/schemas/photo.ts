import { z } from "zod";

export const PhotoSchema = z.object({
  id: z.string().min(1),
  filename: z.string().min(1),
  path: z.string().min(1),
  description: z.string().min(1),
  tags: z.array(z.string()),
});

export const PhotoLibrarySchema = z.array(PhotoSchema);

export type Photo = z.infer<typeof PhotoSchema>;
