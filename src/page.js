// Renders index.html from a template. Keeping the markup in one place means
// the download list and version can never drift from downloads.json.

import {
  escapeHtml,
  formatBytes,
  readDownloadManifest,
} from "../scripts/config.js";

// Outbound links, declared once so they cannot drift between the hero and the
// footer. Change these in both places if the project moves.
const LINKS = {
  pypi: "https://pypi.org/project/polyinit/",
  source: "https://github.com/jacob/polyinit",
};

const LANGUAGES = [
  {
    id: "python",
    label: "Python",
    blurb: "CLI, library or FastAPI service, with pytest and ruff already wired up.",
    types: ["CLI", "Library", "Web API"],
  },
  {
    id: "javascript",
    label: "JavaScript",
    blurb: "ESM projects on node:test. No transpiler, no config to delete.",
    types: ["CLI", "Library", "Web API"],
  },
  {
    id: "typescript",
    label: "TypeScript",
    blurb: "tsc, a build script and a dist/ path that already line up.",
    types: ["CLI", "Library", "Web API"],
  },
  {
    id: "rust",
    label: "Rust",
    blurb: "clap where it helps, plus a test that asserts something real.",
    types: ["CLI", "Library", "Web API"],
  },
  {
    id: "go",
    label: "Go",
    blurb: "A module, a router you can test, and go vet clean.",
    types: ["CLI", "Library", "Web API"],
  },
  {
    id: "markdown",
    label: "Markdown",
    blurb: "For when the deliverable is a document, not a program.",
    types: ["Document"],
  },
];

const COMMANDS = [
  { cmd: "polyinit create", out: "ask for everything", kind: "cmd" },
  { cmd: "polyinit create my-app", out: "skip the name prompt", kind: "cmd" },
  { cmd: "polyinit run", out: "detect the language and run it", kind: "cmd" },
  { cmd: "polyinit templates", out: "list everything installed", kind: "cmd" },
  { cmd: "polyinit doctor", out: "check your toolchain", kind: "cmd" },
];

const MATRIX = [
  ["Python", "yes", "yes", "yes", "—"],
  ["JavaScript", "yes", "yes", "yes", "—"],
  ["TypeScript", "yes", "yes", "yes", "—"],
  ["Rust", "yes", "yes", "yes", "—"],
  ["Go", "yes", "yes", "yes", "—"],
  ["Markdown", "—", "—", "—", "yes"],
];

function terminal(lines) {
  const body = lines
    .map((line) => {
      if (line.kind === "cmd") {
        return `<div><span class="line-cmd">${escapeHtml(line.cmd)}</span>${line.out ? ` <span class="line-dim"># ${escapeHtml(line.out)}</span>` : ""}</div>`;
      }
      return `<div class="line-${line.kind}">${escapeHtml(line.out)}</div>`;
    })
    .join("\n");

  return `<div class="terminal">
      <div class="terminal-bar">
        <div class="terminal-dots"><i></i><i></i><i></i></div>
        <span class="terminal-title">polyinit</span>
      </div>
      <div class="terminal-body">${body}</div>
    </div>`;
}

function demo() {
  return terminal([
    { kind: "cmd", cmd: "polyinit create my-api" },
    { kind: "out", out: "What language?  Python" },
    { kind: "out", out: "What type of project?  Web API" },
    { kind: "out", out: "Features:  Git, README, venv, Pytest, Ruff" },
    { kind: "out", out: "" },
    { kind: "ok", out: "✓ Generated Python Web API template" },
    { kind: "ok", out: "✓ Created virtual environment" },
    { kind: "ok", out: "✓ Initialized Git" },
    { kind: "out", out: "" },
    { kind: "cmd", cmd: "cd my-api && polyinit run" },
    { kind: "out", out: "Running: python -m uvicorn my_api.main:app" },
  ]);
}

function commandList() {
  return terminal(
    COMMANDS.map((line) => ({
      ...line,
      out: line.out ? `${line.cmd.padEnd(24)} ${line.out}` : "",
    })),
  );
}

function languageCards() {
  return LANGUAGES.map(
    (language) => `
        <article class="card">
          <span class="lang-tag">${escapeHtml(language.label)}</span>
          <h3>${escapeHtml(language.types.join(" · "))}</h3>
          <p>${escapeHtml(language.blurb)}</p>
        </article>`,
  ).join("");
}

function matrix() {
  const rows = MATRIX.map(
    ([language, cli, library, api, document]) => `
          <tr>
            <th scope="row">${escapeHtml(language)}</th>
            <td>${cli === "—" ? '<span class="placeholder">—</span>' : "✓"}</td>
            <td>${library === "—" ? '<span class="placeholder">—</span>' : "✓"}</td>
            <td>${api === "—" ? '<span class="placeholder">—</span>' : "✓"}</td>
            <td>${document === "—" ? '<span class="placeholder">—</span>' : "✓"}</td>
          </tr>`,
  ).join("");

  return `<div class="table-scroll">
          <table>
            <caption class="visually-hidden">Project types available per language</caption>
            <thead>
              <tr>
                <th scope="col">Language</th>
                <th scope="col">CLI</th>
                <th scope="col">Library</th>
                <th scope="col">Web API</th>
                <th scope="col">Document</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
}

function downloads(manifest) {
  if (!manifest.assets.length) {
    return `<div class="no-assets">
        No binaries built yet. Run <code>npm run build:binary</code> to
        produce one, then rebuild the site.
      </div>`;
  }

  const cards = manifest.assets
    .map((asset) => {
      const platform = `${asset.platform} ${asset.arch}`;
      const size = formatBytes(asset.bytes);

      return `<article class="download">
            <h3>Standalone binary</h3>
            <div class="download-meta">
              <span>${escapeHtml(platform)}</span>
              <span>${escapeHtml(size)}</span>
              <span>v${escapeHtml(manifest.version)}</span>
            </div>
            <a class="btn btn-primary" href="${escapeHtml(asset.url)}" download>
              Download ${escapeHtml(asset.name)}
            </a>
            <p class="hash"><b>sha256</b> ${escapeHtml(asset.sha256)}</p>
          </article>`;
    })
    .join("");

  return `<div class="download-grid">${cards}</div>
      <p class="install-note">
        The binary needs no Python installed. Move it onto your
        <code>PATH</code> and mark it executable:
        <br /><code>mv polyinit-${escapeHtml(manifest.assets[0].platform)}-${escapeHtml(manifest.assets[0].arch)} polyinit &amp;&amp; chmod +x polyinit</code>
        <br />Prefer <code>pip</code>? <code>pip install polyinit</code> works too.
      </p>`;
}

export async function render() {
  const manifest = await readDownloadManifest();
  const version = manifest.version === "unknown" ? "" : ` v${manifest.version}`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>polyinit${version} — one project generator, six languages</title>
<meta name="description" content="polyinit is an interactive project generator for the terminal. One flow across Python, JavaScript, TypeScript, Rust, Go and Markdown, with templates that build and test clean." />
<meta property="og:title" content="polyinit — one project generator, six languages" />
<meta property="og:description" content="An interactive terminal scaffolder spanning six languages, with templates that actually compile." />
<meta property="og:type" content="website" />
<meta name="color-scheme" content="dark light" />
<link rel="stylesheet" href="/styles.css" />
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230b0f14'/%3E%3Ctext x='16' y='23' font-family='monospace' font-size='19' font-weight='bold' fill='%234fd6e0' text-anchor='middle'%3E%3E%3C/text%3E%3C/svg%3E" />
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>

<header class="site-header">
  <div class="wrap">
    <a class="brand" href="/">
      <span class="brand-mark" aria-hidden="true">&gt;</span>
      polyinit${version}
    </a>
    <nav class="site-nav" aria-label="Main">
      <a href="#why">Why</a>
      <a href="#templates">Templates</a>
      <a href="#commands">Commands</a>
      <a href="#download">Download</a>
    </nav>
  </div>
</header>

<main id="main">
  <section class="hero">
    <div class="wrap">
      <h1><span class="prompt">&gt;</span> polyinit<span class="prompt-caret" aria-hidden="true"></span></h1>
      <p class="tagline">
        One interactive project generator for six languages, with defaults
        that already build and test clean.
      </p>
      <div class="actions">
        <a class="btn btn-primary" href="#download">Download the binary</a>
        <a class="btn" href="${LINKS.pypi}" rel="noopener">pip install polyinit</a>
      </div>
      <div class="install-row">
        <button class="btn" type="button" data-copy="pip install polyinit">
          <span data-copy-label>pip install polyinit</span>
        </button>
      </div>
    </div>
  </section>

  <section id="why">
    <div class="wrap">
      <div class="section-head">
        <h2><span class="prompt">#</span> why another scaffolder</h2>
        <p>
          Language-native generators are excellent at their own language and
          useless at the other five.
        </p>
      </div>
      ${demo()}
    </div>
  </section>

  <section id="templates">
    <div class="wrap">
      <div class="section-head">
        <h2><span class="prompt">#</span> templates</h2>
        <p>
          Every template ships as a working project. CI builds and tests all
          sixteen on every push.
        </p>
      </div>
      ${matrix()}
      <div class="grid" style="margin-top:1.5rem">${languageCards()}</div>
    </div>
  </section>

  <section id="commands">
    <div class="wrap">
      <div class="section-head">
        <h2><span class="prompt">#</span> commands</h2>
      </div>
      ${commandList()}
    </div>
  </section>

  <section id="download">
    <div class="wrap">
      <div class="section-head">
        <h2><span class="prompt">#</span> download</h2>
        <p>A single self-contained executable. No Python required.</p>
      </div>
      ${downloads(manifest)}
    </div>
  </section>
</main>

<footer class="site-footer">
  <div class="wrap">
    <span>polyinit${version} · MIT licensed</span>
    <span>
      <a href="${LINKS.pypi}" rel="noopener">PyPI</a>
      ·
      <a href="${LINKS.source}" rel="noopener">Source</a>
    </span>
  </div>
</footer>

<script src="/main.js" defer></script>
</body>
</html>
`;
}