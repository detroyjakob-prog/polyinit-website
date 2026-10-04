// Removes build output and intermediate build artifacts.
//
// Usage: node scripts/clean.js

import { rm } from "node:fs/promises";

import { DIST, ROOT } from "./config.js";

for (const target of [DIST, `${ROOT}/.build`]) {
  await rm(target, { recursive: true, force: true });
  console.log(`==> Removed ${target}`);
}