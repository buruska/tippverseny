import crypto from "node:crypto";

const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export function createPasswordResetToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashPasswordResetToken(token: string) {
  const secret = process.env.AUTH_SECRET ?? "development-secret";

  return crypto
    .createHash("sha256")
    .update(`${token}:${secret}:password-reset`)
    .digest("hex");
}

export function getPasswordResetExpiresAt() {
  return new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);
}

export function getPasswordResetUrl(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  return `${baseUrl}/reset-password/${token}`;
}
