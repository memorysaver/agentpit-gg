import { Buffer } from "node:buffer";

const encoder = new TextEncoder();

export const generateApiKey = (): string => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = Buffer.from(bytes).toString("base64url");
  return `ag_${token}`;
};

export const hashApiKey = async (apiKey: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(apiKey));
  const hashBytes = new Uint8Array(digest);
  return Array.from(hashBytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
};
