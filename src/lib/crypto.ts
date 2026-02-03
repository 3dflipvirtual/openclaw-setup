import "server-only";
import { createCipheriv, createHash, randomBytes } from "crypto";

function getKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("Missing ENCRYPTION_KEY");
  }
  return createHash("sha256").update(key).digest();
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const key = getKey();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function getLast4(value: string) {
  return value.trim().slice(-4);
}
