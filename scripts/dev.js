// Rebuilds on change and serves dist/.
//
// Usage: node scripts/dev.js [port]

import { spawn } from "node:child_process";
import { watch } from "node:fs/promises";
import path from "node:path";

import { PUBLIC, SRC } from "./config.js";

const PORT = process.argv[2] ?? "4173";
let building = false;
let queued = false;

async function build() {
  if (building) {
    queued = true;
    return;
  }

  building = true;
  try {
    await import("./build.js");
  } catch (error) {
    console.error("build failed:", error.message);
  } finally {
    building = false;
    if (queued) {
      queued = false;
      await build();
    }
  }
}

await build();

const server = spawn(process.execPath, ["scripts/serve.js", PORT], {
  stdio: "inherit",
});

for (const dir of [SRC, PUBLIC]) {
  watch(dir, { recursive: true })
    .then(async (iterator) => {
      for await (const event of iterator) {
        if (!event.filename) continue;
        console.log(`changed: ${path.join(dir, event.filename)}`);
        await build();
      }
    })
    .catch((error) => {
      console.error(`watch failed for ${dir}:`, error.message);
    });
}

const stop = () => {
  server.kill();
  process.exit(0);
};

process.on("SIGINT", stop);
process.on("SIGTERM", stop);