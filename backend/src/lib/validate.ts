import { z } from "zod";
import { HttpError } from "./http-error.js";

export function parseBody<S extends z.ZodTypeAny>(
  schema: S,
  body: unknown,
): z.infer<S> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Ongeldige aanvraag",
      result.error.flatten(),
    );
  }
  return result.data;
}

export function parseQuery<S extends z.ZodTypeAny>(
  schema: S,
  query: unknown,
): z.infer<S> {
  const result = schema.safeParse(query);
  if (!result.success) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Ongeldige queryparameters",
      result.error.flatten(),
    );
  }
  return result.data;
}
