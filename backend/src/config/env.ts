import { config as loadDotenv } from "dotenv";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3001),
  // Required for Prisma CLI; use a local URL in .env even before Block 06 migrations.
  DATABASE_URL: z.string().min(1),
  /** Signing JWTs for cookie sessions (min 32 chars in production). */
  JWT_SECRET: z.string().min(16),
  /**
   * Absoluut pad naar Vite `dist` (frontend build). Gezet in Docker; weggelaten = alleen API.
   */
  STATIC_DIR: z.string().optional(),
  /**
   * Origin of the web app (no trailing slash). Used in password-reset e-mails.
   * Example: https://app.example.com
   */
  PUBLIC_APP_URL: z.string().url().default("http://localhost:5173"),
  /** Optional: send password-reset mail via https://resend.com */
  RESEND_API_KEY: z.string().min(1).optional(),
  /** From header for Resend (e.g. Finbar <onboarding@resend.dev> for testing). */
  RESEND_FROM: z.string().min(1).optional(),
})
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production" && data.JWT_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "JWT_SECRET moet minimaal 32 tekens zijn in productie",
        path: ["JWT_SECRET"],
      });
    }
  });

export type Env = z.infer<typeof schema>;

export function loadEnv(): Env {
  loadDotenv();
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    throw new Error(`Ongeldige omgeving: ${JSON.stringify(msg)}`);
  }
  return parsed.data;
}
