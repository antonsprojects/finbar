import { config as loadDotenv } from "dotenv";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3000),
  // Required for Prisma CLI; use a local URL in .env even before Block 06 migrations.
  DATABASE_URL: z.string().min(1),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(): Env {
  loadDotenv();
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid environment: ${JSON.stringify(msg)}`);
  }
  return parsed.data;
}
