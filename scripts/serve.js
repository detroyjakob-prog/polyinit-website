// Static file server for previewing dist/.
//
// Serves index.html for "/", refuses to escape dist/, and sets no-store so a
// rebuild shows up on reload.
//
// Usage: node scripts/serve.js [port]

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";

import { DIST } from "./config.js";

const PORT = Number(process.argv[2] ?? process.env.PORT ?? 4173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

async function resolve(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const resolved = path.resolve(DIST, relative);

  // path.resolve collapses "..", so this catches traversal attempts.
  if (resolved !== DIST && !resolved.startsWith(DIST + path.sep)) {
    return null;
  }

  try {
    const info = await stat(resolved);
    if (info.isDirectory()) return resolve(path.posix.join(decoded, "index.html"));
    return resolved;
  } catch {
    return null;
  }
}

const server = http.createServer(async (request, response) => {
  const file = await resolve(request.url ?? "/");

  if (!file) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("404 Not Found\n");
    return;
  }

  response.writeHead(200, {
    "content-type": TYPES[path.extname(file)] ?? "application/octet-stream",
    "cache-control": "no-store",
    "content-length": (await stat(file)).size,
  });

  createReadStream(file).pipe(response);
});

server.listen(PORT, () => {
  console.log(`==> Serving ${DIST} at http://localhost:${PORT}`);
});