import crypto from "node:crypto";

const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITE_CODE_LENGTH = 12;

export function normalizeInviteCode(code: string): string {
  return code.trim().replace(/[\s-]+/g, "").toUpperCase();
}

export function hashInviteCode(code: string): string {
  return crypto
    .createHash("sha256")
    .update(normalizeInviteCode(code), "utf8")
    .digest("hex");
}

export function createInviteCode(): string {
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) {
    code += INVITE_ALPHABET[crypto.randomInt(INVITE_ALPHABET.length)];
  }
  return code;
}
