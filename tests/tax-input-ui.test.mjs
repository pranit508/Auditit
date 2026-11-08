import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { renderDashboardHero } from "../components/DashboardHero.js";
import { renderTaxFilingDashboard } from "../components/TaxFilingDashboard.js";

const listeners = {};
const wrappers = [];
const container = {
  innerHTML: "",
  dataset: {},
  addEventListener(type, listener) {
    listeners[type] = listener;
  },
  contains() {
    return true;
  },
  querySelectorAll(selector) {
    if (selector === ".info-tooltip-wrap.is-open") {
      return wrappers.filter((wrapper) => wrapper.classList.contains("is-open"));
    }
    if (selector === ".info-tooltip-button") return wrappers.map((wrapper) => wrapper.button);
    return [];
  },
  querySelector() {
    return null;
  },
};

function fakeTooltip(id) {
  const attributes = {};
  const buttonListeners = {};
  const button = {
    id,
    addEventListener(type, listener) {
      buttonListeners[type] = listener;
    },
    setAttribute(name, value) {
      attributes[name] = value;
    },
    getAttribute(name) {
      return attributes[name];
    },
    closest(selector) {
      return selector === ".info-tooltip-wrap" ? wrapper : null;
    },
    click() {
      buttonListeners.click({ preventDefault() {}, stopPropagation() {} });
    },
  };
  const classes = new Set();
  const wrapper = {
    button,
    classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); },
    },
    querySelector(selector) {
      return selector === ".info-tooltip-button" ? button : null;
    },
  };
  wrappers.push(wrapper);
  return { button, wrapper };
}

const first = fakeTooltip("first");
const second = fakeTooltip("second");
renderTaxFilingDashboard(container);
const html = container.innerHTML;

for (const id of [
  "toggle-regime-new", "toggle-regime-old", "card-scheme-presumptive",
  "card-scheme-regular", "toggle-itc-resale-yes", "toggle-itc-resale-no",
]) {
  assert.match(html, new RegExp(`id="${id}"`), `${id} should render`);
}
assert.match(html, /grid-cols-1 gap-3/, "filing schemes should be stacked vertically");
assert.match(html, /aria-label="More information"/, "help controls should be accessible buttons");
assert.doesNotMatch(html, /Sec 115BAC • Lower Slabs|Traditional Slabs • 80C|Expected annual receipts\/counter sales/, "helper copy should move into tooltips");
assert.match(html, /Section 115BAC\. Uses the new-regime slabs/, "regime guidance should be available in a tooltip");

const buttonTags = html.match(/<\/?button\b[^>]*>/g) || [];
let openButtons = 0;
for (const tag of buttonTags) {
  if (tag.startsWith("</")) {
    openButtons -= 1;
    assert.ok(openButtons >= 0, "button markup should have matching closing tags");
  } else {
    assert.equal(openButtons, 0, "info buttons must not be nested inside action buttons");
    openButtons += 1;
  }
}
assert.equal(openButtons, 0, "button markup should be balanced");

first.button.click();
assert.equal(first.wrapper.classList.contains("is-open"), true, "click should open the tooltip");
assert.equal(first.button.getAttribute("aria-expanded"), "true");

second.button.click();
assert.equal(first.wrapper.classList.contains("is-open"), false, "opening one tooltip should close another");
assert.equal(second.wrapper.classList.contains("is-open"), true);

listeners.keydown({ key: "Escape" });
assert.equal(second.wrapper.classList.contains("is-open"), false, "Escape should dismiss an open tooltip");

const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
assert.match(css, /\.info-tooltip-wrap:hover \.info-tooltip/);
assert.match(css, /\.info-tooltip-wrap:focus-within \.info-tooltip/);

const heroListeners = {};
const hero = {
  innerHTML: "",
  dataset: {},
  addEventListener(type, listener) { heroListeners[type] = listener; },
  querySelector() { return null; },
  querySelectorAll() { return []; },
};
renderDashboardHero(hero);
assert.doesNotMatch(hero.innerHTML, /Never Pay a Wrong Bill Again|Built for Retail Shop Owners|Core Guarantee|AI reads the bill|Live Gemini AI Pipeline|Server-managed verification|Deterministic Math Check|Server Leaks|Privacy secured/);
assert.match(hero.innerHTML, /Every bill, <span class="text-emerald-700">in focus\.<\/span>/, "minimal landing heading should render");
assert.match(hero.innerHTML, /id="btn-browse-file"/);
assert.match(hero.innerHTML, /id="btn-snap-photo"/);
assert.match(hero.innerHTML, /id="btn-manual-bill"/);
assert.match(hero.innerHTML, /w-full max-w-xs flex flex-col items-stretch/, "upload actions should stack vertically");
assert.match(hero.innerHTML, /Select File \/ PDF/);
assert.match(hero.innerHTML, /Snap Photo/);
assert.match(hero.innerHTML, /Enter Bill Manually/);
assert.doesNotMatch(hero.innerHTML, /📁|📷|✍️/, "upload action labels should not contain emojis");
assert.equal((hero.innerHTML.match(/px-5 py-2\.5[^"]*text-sm/g) || []).length, 3, "upload action buttons should have larger text and padding");
assert.match(hero.innerHTML, /upload-guidance-info/, "upload guidance should be an info button beside the heading");
assert.doesNotMatch(hero.innerHTML, /Drag &amp; drop your PDF or image here|Supports: JPG, PNG/, "upload helper copy should not remain under the heading");

const shell = await readFile(new URL("../index.html", import.meta.url), "utf8");
assert.match(shell, /<title>AUDIT IT<\/title>/);
assert.doesNotMatch(shell, /Retail Edition|Deterministic Code Audit|INR Compliant|AI Reads, Code Calculates|Indian Small Retail/);

console.log("PASS: upload and tax options stack vertically; info tooltips support click, hover, keyboard focus, and Escape");
