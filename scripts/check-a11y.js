// WCAG contrast audit for both themes.
//
// The palette is hand-tuned, which means a well-meaning colour tweak can
// quietly break AA in one theme only. This reads the real CSS, resolves each
// token per theme, and fails loudly rather than relying on review.
//
// Usage: node scripts/check-a11y.js
//
// Text needs 4.5:1 (3:1 for large text), and control boundaries need 3:1
// under WCAG 1.4.11.

import { readFile } from "node:fs/promises";
import path from "node:path";

import { ROOT } from "./config.js";

const AA_TEXT = 4.5;
const AA_LARGE = 3.0;
const AA_NON_TEXT = 3.0;

// Pull the declarations out of the :root block that starts at or after
// `from`, matching braces rather than regexing to the first closing one,
// because the light theme's :root is nested inside a media query.
function readBlock(css, selector, from = 0) {
  const start = css.indexOf(selector, from);
  if (start === -1) throw new Error(`no ${selector} block found`);

  const open = css.indexOf("{", start);
  let depth = 0;
  let i = open;

  for (; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    else if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) break;
    }
  }

  return css.slice(open, i);
}

function tokens(block) {
  const found = new Map();

  for (const [, name, value] of block.matchAll(
    /(--[\w-]+)\s*:\s*([^;]+);/g,
  )) {
    found.set(name, value.trim());
  }

  return found;
}

function toRgb(value) {
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (!hex) return null;

  const n = parseInt(hex[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance([r, g, b]) {
  const channels = [r, g, b].map((raw) => {
    const c = raw / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });

  return (
    0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
  );
}

function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// [label, foreground token, background token, minimum ratio]
const PAIRS = [
  ["body text on page", "--fg", "--bg", AA_TEXT],
  ["muted text on page", "--fg-muted", "--bg", AA_TEXT],
  ["dim text on page", "--fg-dim", "--bg", AA_LARGE],
  ["muted text on card", "--fg-muted", "--bg-raised", AA_TEXT],
  ["dim text on card", "--fg-dim", "--bg-raised", AA_LARGE],
  ["accent link on page", "--cyan", "--bg", AA_TEXT],
  ["accent hover on card", "--cyan", "--bg-raised", AA_TEXT],
  ["success line in terminal", "--green", "--bg-inset", AA_TEXT],
  ["language tag on card", "--purple", "--bg-raised", AA_TEXT],
  ["note text on card", "--yellow", "--bg-raised", AA_TEXT],
  ["primary button label", "--bg", "--cyan", AA_TEXT],
  ["dim text in terminal", "--fg-dim", "--bg-inset", AA_LARGE],
  ["control border on card", "--border-control", "--bg-raised", AA_NON_TEXT],
  ["control border on page", "--border-control", "--bg", AA_NON_TEXT],
  ["control border in terminal", "--border-control", "--bg-inset", AA_NON_TEXT],
];

const css = await readFile(path.join(ROOT, "src", "styles.css"), "utf8");

const themes = [
  ["DARK ", tokens(readBlock(css, ":root"))],
  ["LIGHT", tokens(readBlock(css, ":root", css.indexOf("prefers-color-scheme")))],
];

// A token redefined in only one theme is almost always a mistake: it works on
// the machine where you happened to be looking at it.
// A colour redefined in only one theme is almost always a mistake: it works on
// the machine where you happened to be looking at it. Theme-independent
// tokens such as --mono or --radius are correctly declared once.
function colours(palette) {
  return [...palette].filter(([, value]) => toRgb(value) !== null);
}

const [, darkPalette] = themes[0];
const [, lightPalette] = themes[1];

for (const [name] of colours(darkPalette)) {
  if (!lightPalette.has(name)) {
    console.log(`FAIL  colour ${name} is defined in dark but not light`);
    process.exitCode = 1;
  }
}

for (const [name] of colours(lightPalette)) {
  if (!darkPalette.has(name)) {
    console.log(`FAIL  colour ${name} is defined in light but not dark`);
    process.exitCode = 1;
  }
}

for (const [name, palette] of themes) {
  console.log(`=== ${name.trim()} ===`);

  for (const [label, fgName, bgName, minimum] of PAIRS) {
    const fg = toRgb(palette.get(fgName) ?? "");
    const bg = toRgb(palette.get(bgName) ?? "");

    if (!fg || !bg) {
      console.log(`FAIL  ${label}: ${!fg ? fgName : bgName} is not a hex colour`);
      process.exitCode = 1;
      continue;
    }

    const ratio = contrast(fg, bg);
    const ok = ratio >= minimum;

    if (!ok) process.exitCode = 1;

    console.log(
      `  ${ok ? "pass" : "FAIL"}  ${label.padEnd(26)} ${ratio.toFixed(2)}:1 (needs ${minimum})`,
    );
  }
}

if (process.exitCode) {
  console.log("\ncontrast audit failed");
} else {
  console.log("\nboth themes pass WCAG AA");
}
