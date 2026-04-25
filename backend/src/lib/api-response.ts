/** Successful JSON envelope for all `/api/**` responses. */
export type ApiSuccess<T> = { data: T };

/** Error JSON envelope for all `/api/**` error responses. */
export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function ok<T>(data: T): ApiSuccess<T> {
  return { data };
}
