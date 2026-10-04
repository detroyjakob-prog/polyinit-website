// Copy-to-clipboard buttons. No framework, no build step for the browser:
// the page ships as plain HTML and CSS, and this is the only behaviour it needs.

const SELECTOR = "[data-copy]";

function announce(button, message) {
  let status = button.querySelector("[data-copy-status]");

  if (!status) {
    status = document.createElement("span");
    status.setAttribute("data-copy-status", "");
    status.className = "visually-hidden";
    status.setAttribute("role", "status");
    button.append(status);
  }

  status.textContent = message;
}

async function copyText(text) {
  // navigator.clipboard needs a secure context, which file:// is not.
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  area.select();

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }

  area.remove();
  return copied;
}

function flash(button, ok, original) {
  button.classList.toggle("is-copied", ok);
  const label = button.querySelector("[data-copy-label]");

  if (label) label.textContent = ok ? "copied" : "press ⌘C";

  announce(button, ok ? "Copied to clipboard" : "Copy failed");

  window.setTimeout(() => {
    button.classList.remove("is-copied");
    if (label) label.textContent = original;
  }, 1600);
}

for (const button of document.querySelectorAll(SELECTOR)) {
  const label = button.querySelector("[data-copy-label]");
  const original = label ? label.textContent : "";

  button.addEventListener("click", async () => {
    const text = button.dataset.copy;
    const ok = await copyText(text);
    flash(button, ok, original);
  });
}