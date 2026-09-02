import { randomBytes } from "crypto";

export function generateViewerToken() {
  return randomBytes(15).toString("base64url");
}
