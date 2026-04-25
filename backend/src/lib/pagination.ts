import { z } from "zod";
import { ok } from "./api-response.js";

/** Default list query: offset-based pagination (MVP). */
export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export type PaginationMeta = {
  limit: number;
  offset: number;
  total: number;
};

/** Wrap list payloads consistently for future job/worker/task endpoints. */
export function listResponse<T>(items: T[], meta: PaginationMeta) {
  return ok({ items, pagination: meta });
}
