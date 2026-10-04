// Shared build configuration and helpers.

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

export const SRC = path.join(ROOT, "src");
export const PUBLIC = path.join(ROOT, "public");
export const DIST = path.join(ROOT, "dist");

export async function readDownloadManifest() {
  const file = path.join(PUBLIC, "downloads", "downloads.json");

  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return { version: "unknown", assets: [] };
    throw error;
  }
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "";

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  const rounded = value >= 10 || unit === 0 ? Math.round(value) : Number(value.toFixed(1));
  return `${rounded} ${units[unit]}`;
}

export async function hashFile(file) {
  const contents = await readFile(file);
  return createHash("sha256").update(contents).digest("hex");
}

// Escapes the five characters that are unsafe inside a double-quoted
// attribute or a script block.
export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}