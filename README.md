# polyinit-website

The website and release downloads for
[polyinit](https://pypi.org/project/polyinit/), the interactive project
generator for the terminal.

Static output, built with plain Node. **No dependencies** — no bundler, no
framework, nothing to install before you can build.

## Requirements

- Node 20 or newer
- Python 3.11+ and PyInstaller, only if you are rebuilding the binary

## Commands

| Command | What it does |
| --- | --- |
| `npm run build` | Renders `dist/` from `src/`. Fast, no binary needed. |
| `npm run serve` | Serves `dist/` on <http://localhost:4173>. |
| `npm run dev` | Rebuilds on change and serves. |
| `npm run build:binary` | Freezes the current polyinit checkout into `public/downloads/`. |
| `npm run release` | `build:binary` followed by `build`. |
| `npm run clean` | Removes `dist/` and `.build/`. |
| `npm run check` | Audits colour contrast in both themes. Fails on any WCAG AA breach. |

```sh
npm run build && npm run serve
```

## Building the binary

The download on the site is a real single-file executable produced by
PyInstaller from the polyinit source. It bundles the interpreter and the
template payload, so it runs on a machine with no Python installed.

```sh
npm run release
```

By default the source is read from `/home/jacob/pinit`. Point it elsewhere
with `POLYINIT_SOURCE`:

```sh
POLYINIT_SOURCE=../polyinit npm run release
```

The build script verifies the result by running `version` and `templates`
before copying it into `public/downloads/`. A binary that cannot list its own
templates is worse than no binary, because the download still looks like it
worked.

Every new release regenerates `public/downloads/downloads.json`, which carries
the version, size and SHA-256 of each asset. The site renders its download
card straight from that file, so the page cannot claim a checksum the file
does not have. `build.js` refuses to lie in the other direction too: with no
assets it renders a placeholder instead of a broken download button.

Both the binary and the manifest are untracked, since they are build output.
A fresh clone therefore shows the placeholder until you run `npm run release`.

## How the build fits together

```
src/page.js     renders index.html — markup, version, download card
src/styles.css  the whole stylesheet, both themes
src/main.js     copy-to-clipboard; the only browser behaviour
scripts/build.js    writes dist/
scripts/serve.js    static server for dist/
scripts/build-binary.sh   produces the downloadable executable
```

`src/page.js` holds the content and the build writes the HTML, so the version
number and the download list have exactly one source of truth:
`public/downloads/downloads.json`.

## Accessibility and theming

Both `prefers-color-scheme: dark` and `prefers-color-scheme: light` are
defined. Every text and control-boundary colour pair clears WCAG AA in both
themes, and `npm run check` re-proves that against the real stylesheet rather
than trusting review:

```
$ npm run check
=== DARK ===
  pass  body text on page            14.41:1 (needs 4.5)
  ...
both themes pass WCAG AA
```

Colour is carried by two tokens that must not be merged:

- `--border` — dividers and decorative rules. Deliberately low contrast.
- `--border-control` — outlines of interactive elements. Meets 3:1 against
  every background it sits on, per WCAG 1.4.11.

Animation is disabled under `prefers-reduced-motion: reduce`.

## Deploying

`dist/` is a plain directory of static files — no server-side rendering, no
routing. Upload it anywhere that serves files, and make sure
`/downloads/*` is served as an octet stream rather than executed.
