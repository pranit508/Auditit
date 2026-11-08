import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { escapeHtml } from "../utils/html.js";
import { auditInvoice } from "../utils/auditEngine.js";
import { renderInvoiceViewer } from "../components/InvoiceViewer.js";
import { renderCaSlipModal } from "../components/CaSlipModal.js";
import { renderAuditScorecard } from "../components/AuditScorecard.js";
import { renderReviewWorkspace } from "../components/ReviewWorkspace.js";
import { renderTaxFilingDashboard } from "../components/TaxFilingDashboard.js";
import { renderTaxAndITRTab } from "../components/TaxAndITRTab.js";

const payload = `A&B <img src=x onerror="alert(1)"> 'quoted' "double" </pre><script>alert(2)</script> &lt;literal&gt;`;
const value = field => `${field}: ${payload}`;
const invoice = {
  vendor_name: value("vendor"), vendor_address: value("address"),
  invoice_no: value("invoice"), date: value("date"), gstin: value("gstin"),
  buyer_name: value("buyer"), buyer_address: value("buyer-address"),
  bank_details: { bank_name: value("bank"), account_number: value("account"), ifsc: value("ifsc") },
  payment_terms: value("terms"), notes: value("notes"),
  raw_ocr_text: value("ocr"), file_name: value("filename"),
  uploaded_file_url: "blob:https://example.test/document", file_type: "image/png",
  items: [{ id: value("id"), description: value("description"), hsn: value("hsn"), qty: 2, rate: 10, amount: 20 }],
  subtotal: 20, cgst: 0, sgst: 0, igst: 0, total_declared: 20,
};
const original = structuredClone(invoice);
const audit = auditInvoice(invoice);
const pages = [];
function mount(viewMode = "digital", elements = {}) {
  return { innerHTML: "", dataset: { viewMode },
    querySelector: selector => elements[selector] || null,
    querySelectorAll: () => [] };
}
function capture(name, render, expected) {
  const container = mount();
  render(container);
  pages.push({ name, html: container.innerHTML, expected });
}
assert.equal(escapeHtml(null), "");
assert.equal(escapeHtml(0), "0");
assert.equal(escapeHtml(`&<>"'`), "&amp;&lt;&gt;&quot;&#39;");
capture("digital preview", c => renderInvoiceViewer(c, invoice, audit), [
  "vendor", "address", "invoice", "date", "gstin", "buyer", "buyer-address",
  "bank", "account", "ifsc", "terms", "notes", "description", "hsn", "id",
].map(value));
capture("raw OCR", c => {
  c.dataset.viewMode = "ocr";
  renderInvoiceViewer(c, invoice, audit);
}, [value("ocr"), value("invoice")]);
capture("original photo", c => {
  c.dataset.viewMode = "photo";
  renderInvoiceViewer(c, invoice, audit);
}, [value("filename"), value("invoice")]);
capture("review inputs", c => renderAuditScorecard(c, invoice, audit), [
  value("vendor"), value("gstin"), value("description"), value("hsn"), `scorecard-row-${value("id")}`,
]);
const reviewInputsHtml = pages.find(page => page.name === "review inputs").html;
assert.match(reviewInputsHtml, /<details id="bill-header-inputs-panel" data-preserve-open/, "bill header fields should be inside a state-preserving collapsible section");
assert.match(reviewInputsHtml, /<details id="gst-tax-settings-panel" data-preserve-open/, "GST fields and presets should be inside a state-preserving collapsible section");
assert.match(reviewInputsHtml, /<details id="item-breakdown-panel" data-preserve-open/, "item breakdown should be a state-preserving collapsible section");
assert.doesNotMatch(reviewInputsHtml, /<details\b[^>]*\sopen(?:\s|>)/, "audit dropdown sections should start collapsed");
assert.match(reviewInputsHtml, /id="input-vendor-name"/, "collapsing the header section should retain editable fields");
assert.match(reviewInputsHtml, /data-gst-preset="18"/, "collapsing the GST section should retain its rate presets");
assert.match(reviewInputsHtml, /id="btn-add-item"/, "Add Line Item should remain available inside the expanded item section");
capture("review header", c => renderReviewWorkspace(c, invoice, audit), [value("vendor"), value("invoice")]);
capture("printable slip", c => renderCaSlipModal(c, invoice, audit), [
  "vendor", "address", "invoice", "date", "gstin", "description", "buyer", "buyer-address",
].map(value));
capture("tax sheet", c => renderTaxFilingDashboard(c, invoice, audit), [value("vendor")]);
capture("saved ledger", c => renderTaxAndITRTab(c, { savedBills: [invoice] }),
  ["vendor", "invoice", "date", "gstin"].map(value));
capture("unsaved ledger", c => renderTaxAndITRTab(c, { currentInvoice: invoice }), [value("vendor")]);
const taxLedgerHtml = pages.find(page => page.name === "saved ledger").html;
for (const sectionId of [
  "tax-ledger-itc-section", "tax-ledger-bills-section", "tax-ledger-planning-section",
]) {
  assert.match(taxLedgerHtml, new RegExp(`<details id="${sectionId}" data-preserve-open data-tax-section open`), `${sectionId} should be a default-open dropdown`);
}
for (const tooltipId of [
  "tax-ledger-overview-info", "tax-ledger-itc-info", "tax-ledger-bills-info", "tax-ledger-planning-info",
]) {
  assert.match(taxLedgerHtml, new RegExp(`id="${tooltipId}" class="info-tooltip"`), `${tooltipId} should replace its subtitle`);
}
assert.doesNotMatch(taxLedgerHtml, /<p class="(?:text-xs text-slate-300 mt-0\.5|text-\[11px\] text-slate-500)">(?:Accumulative verified bills|Accumulated input tax credit|Persistent business bills ledger|Live computation under New Tax Regime)/);
const collapsedTaxMount = mount();
renderTaxAndITRTab(collapsedTaxMount, {
  state: { taxSectionsOpen: { "tax-ledger-itc-section": false } },
});
assert.match(collapsedTaxMount.innerHTML, /<details id="tax-ledger-itc-section" data-preserve-open data-tax-section class=/, "a user-collapsed section should stay collapsed after re-render");

const summaryListeners = {};
const sectionListeners = {};
const fakeSummary = {
  addEventListener(type, listener) { summaryListeners[type] = listener; },
};
const fakeSection = {
  id: "tax-ledger-itc-section",
  open: true,
  querySelector(selector) { return selector === "summary" ? fakeSummary : null; },
  addEventListener(type, listener) { sectionListeners[type] = listener; },
};
let sectionStateUpdate;
const interactiveTaxMount = {
  innerHTML: "",
  querySelector() { return null; },
  querySelectorAll(selector) { return selector === "details[data-tax-section]" ? [fakeSection] : []; },
};
renderTaxAndITRTab(interactiveTaxMount, {
  onUpdateState: update => { sectionStateUpdate = update; },
});
let clickPrevented = false;
summaryListeners.click({ preventDefault() { clickPrevented = true; } });
assert.equal(clickPrevented, true, "section heading should handle its own disclosure toggle");
assert.equal(fakeSection.open, false, "clicking the heading should collapse the section");
sectionListeners.toggle();
assert.equal(sectionStateUpdate.taxSectionsOpen["tax-ledger-itc-section"], false, "collapse state should be retained on re-render");
summaryListeners.click({ preventDefault() {} });
assert.equal(fakeSection.open, true, "clicking the heading again should expand the section");
sectionListeners.toggle();
assert.equal(sectionStateUpdate.taxSectionsOpen["tax-ledger-itc-section"], true, "expanded state should be retained on re-render");
assert.deepEqual(invoice, original, "Rendering must not encode or mutate stored values");

globalThis.document = {
  addEventListener() {}, getElementById() { return null; }, activeElement: null,
};
const { AuditItApp } = await import("../app.js");
const app = Object.create(AuditItApp.prototype);
Object.assign(app, {
  mainMount: mount(), modalMount: mount(), currentView: "review",
  activeTab: "audit", savedBills: [], uploadStatus: "accepted",
  currentInvoice: {
    ...invoice, gstin: "27ABCDE1234F1Z5", document_type: "tax_invoice",
    is_tax_invoice: true, invoice_evidence: ["Tax invoice", "GSTIN and line items"],
  },
  currentAudit: audit,
});
app.setActiveTab("tax");
assert.equal(app.activeTab, "tax");
assert.match(app.mainMount.innerHTML, /btn-tax-switch-audit/);
pages.push({ name: "uploaded invoice tax navigation", html: app.mainMount.innerHTML, expected: [value("vendor")] });
app.currentInvoice.vendor_name = value("edited vendor");
app.setActiveTab("audit");
app.setActiveTab("tax");
pages.push({ name: "edited invoice tax navigation", html: app.mainMount.innerHTML, expected: [value("edited vendor")] });

// Parse the generated HTML, not just its source: entities must decode exactly once,
// and quotes must not introduce attributes or executable markup.
const parsed = spawnSync("python", ["-c", `
import json, sys
from html.parser import HTMLParser
class Document(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.text = []
        self.values = []
    def handle_starttag(self, tag, attrs):
        assert tag not in ("script", "svg", "iframe"), tag
        for key, val in attrs:
            assert not key.startswith("on"), (tag, key)
            if val is not None: self.values.append(val)
        if tag == "img":
            assert dict(attrs).get("alt") == "Uploaded Invoice"
    def handle_data(self, data):
        self.text.append(data)
for page in json.load(sys.stdin):
    doc = Document()
    doc.feed(page["html"])
    text = "".join(doc.text)
    for expected in page["expected"]:
        assert expected in text or expected in doc.values, (page["name"], expected)
    print("PASS:", page["name"])
`], { input: JSON.stringify(pages), encoding: "utf8" });
assert.equal(parsed.status, 0, parsed.stderr);
console.log(parsed.stdout.trim());

let printed = false;
globalThis.window = { print() { printed = true; } };
let printHandler;
renderCaSlipModal(mount("digital", {
  "#btn-print-slip": { addEventListener(event, handler) { printHandler = handler; } },
}), invoice, audit);
printHandler();
assert.equal(printed, true);

let edited;
let editHandler;
const input = { value: payload, addEventListener(event, handler) { editHandler = handler; } };
renderAuditScorecard(mount("digital", { "#input-vendor-name": input }), invoice, audit, {
  onUpdateHeader: (...args) => { edited = args; },
});
// Header changes must pass raw values back to the model, not HTML entities.
if (!editHandler) throw new Error("Vendor edit handler was not attached");
editHandler({ target: input });
assert.deepEqual(edited, ["vendor_name", payload]);
console.log("PASS: print action and raw edited values");
