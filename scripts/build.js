// Static build: renders index.html, copies styles.css and main.js, and
// publishes whatever binaries are present in public/downloads.
//
// Usage: node scripts/build.js

import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { DIST, PUBLIC, SRC, readDownloadManifest } from "./config.js";
import { render } from "../src/page.js";

async function copyStatics() {
  await cp(path.join(SRC, "styles.css"), path.join(DIST, "styles.css"));
  await cp(path.join(SRC, "main.js"), path.join(DIST, "main.js"));
}

async function publishDownloads() {
  const from = path.join(PUBLIC, "downloads");
  const to = path.join(DIST, "downloads");

  await mkdir(to, { recursive: true });

  let entries = [];
  try {
    entries = await readdir(from, { withFileTypes: true });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const files = entries.filter((entry) => entry.isFile());

  for (const entry of files) {
    await cp(path.join(from, entry.name), path.join(to, entry.name));
  }

  return files.map((entry) => entry.name);
}

async function main() {
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  const html = await render();
  await writeFile(path.join(DIST, "index.html"), html, "utf8");

  await copyStatics();
  const downloads = await publishDownloads();
  const manifest = await readDownloadManifest();

  console.log(`==> Built ${DIST}`);
  console.log(`    index.html  ${(html.length / 1024).toFixed(1)} KB`);
  console.log(`    polyinit ${manifest.version}`);

  if (downloads.length) {
    console.log(`    downloads: ${downloads.join(", ")}`);
  } else {
    console.log("    downloads: none built (run npm run build:binary)");
  }
}

await main();