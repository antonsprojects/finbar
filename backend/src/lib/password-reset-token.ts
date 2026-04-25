import { createHash, randomBytes } from "node:crypto";

export function createPasswordResetSecret(): {
  rawToken: string;
  tokenHash: string;
} {
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = sha256Hex(rawToken);
  return { rawToken, tokenHash };
}

export function hashPasswordResetToken(rawToken: string): string {
  return sha256Hex(rawToken.trim());
}

function sha256Hex(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}
