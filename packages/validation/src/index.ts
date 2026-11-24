import { z } from 'zod';

// Centralize pagination bounds and cursor validation for consistent API input handling.
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().trim().min(1).optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
