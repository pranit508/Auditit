import assert from "node:assert/strict";

globalThis.document = {
  addEventListener() {},
  getElementById() { return null; },
  activeElement: null,
};
globalThis.window = { scrollTo() {} };
const { AuditItApp } = await import("../app.js");
const app = Object.create(AuditItApp.prototype);
Object.assign(app, {
  mainMount: { innerHTML: "" }, modalMount: { innerHTML: "" },
  currentInvoice: { vendor_name: "Previously viewed bill" },
  currentAudit: { status: "REVIEW_NEEDED" }, taxData: { old: true },
  currentView: "review", activeTab: "tax", apiKey: "",
  savedBills: [{ invoice_no: "KEEP-ME" }], userTaxSettings: {},
  showToast() {},
});

let requests = [];
globalThis.fetch = async url => {
  requests.push(url);
  return new Response(JSON.stringify({ code: "INVALID_INVOICE" }), { status: 422 });
};
const file = new Blob(["random document"], { type: "image/png" });
file.name = "document.png";
await app.handleFileUpload(file);
assert.equal(app.uploadStatus, "invalid");
assert.equal(app.currentInvoice, null);
assert.equal(app.currentAudit, null);
assert.equal(app.taxData, null);
assert.equal(app.modalMount.innerHTML, "");
assert.equal(app.savedBills[0].invoice_no, "KEEP-ME");
assert.deepEqual(requests, ["/api/analyze-bill"]);
assert.match(app.mainMount.innerHTML, /Please upload a valid tax invoice/);
assert.match(app.mainMount.innerHTML, /retry-invoice-upload/);
assert.doesNotMatch(app.mainMount.innerHTML, /top-nav-tab|review-main-wrapper|iframe|Tax &amp; ITR|Previously viewed bill|Review Needed/);

const screen = app.mainMount.innerHTML;
app.setActiveTab("tax");
app.openTaxLedger();
app.openCaSlipModal();
assert.equal(app.activeTab, "audit");
assert.equal(app.mainMount.innerHTML, screen);
assert.equal(app.modalMount.innerHTML, "");

globalThis.fetch = async () => new Response("{}", { status: 503 });
await app.handleFileUpload(file);
assert.equal(app.uploadStatus, "invalid");
assert.match(app.mainMount.innerHTML, /verification unavailable/);
assert.doesNotMatch(app.mainMount.innerHTML, /top-nav-tab|review-main-wrapper|iframe/);

// A subsequent valid upload is the only way out of the rejection screen.
const invoice = {
  document_type: "tax_invoice", is_tax_invoice: true,
  supplier_gstin_source: "supplier",
  invoice_evidence: ["Tax Invoice INV-123", "CGST 9%"],
  vendor_name: "Test Shop", invoice_number: "INV-123", invoice_no: "INV-123",
  date: "2026-11-07", gstin: "27ABCDE1234F1Z5",
  items: [{ description: "LED bulbs", quantity: 2, qty: 2, unit_rate: 100, rate: 100, total_amount: 200, amount: 200 }],
  subtotal: 200, cgst: 18, sgst: 18, igst: 0, declared_total: 236, total_declared: 236,
};
globalThis.fetch = async url => new Response(JSON.stringify(
  url === "/api/analyze-bill" ? invoice : { extracted_data: invoice }
), { status: 200 });
await app.handleFileUpload(file);
assert.equal(app.uploadStatus, "valid");
assert.equal(app.currentView, "review");
assert.match(app.mainMount.innerHTML, /top-nav-tab-tax/);
assert.ok(app.currentInvoice);
console.log("PASS: rejection clears bill and tax state, removes tabs, blocks shortcuts, preserves saved bills, and permits valid retry");

// Reproduce the screenshot: the old fallback manufactured an empty bill named
// after the image. Even if upload status says valid, review rendering must reject it.
for (const status of [undefined, "valid"]) {
  Object.assign(app, {
    uploadStatus: status,
    currentView: "review",
    activeTab: "tax",
    currentInvoice: {
      id: "uploaded-legacy", vendor_name: "16096", file_name: "16096.png",
      file_type: "image/png", invoice_no: null, items: [],
      subtotal: 0, total_declared: 0,
    },
    currentAudit: { status: "REVIEW_NEEDED" },
    taxData: { old: true },
  });
  app.render();
  assert.equal(app.currentInvoice, null);
  assert.equal(app.currentAudit, null);
  assert.equal(app.taxData, null);
  assert.match(app.mainMount.innerHTML, /Please upload a valid tax invoice/);
  assert.doesNotMatch(app.mainMount.innerHTML, /16096|top-nav-tab|Review Needed|iframe|CA Audit Slip/);
  app.openTaxLedger();
  app.openCaSlipModal();
  assert.equal(app.activeTab, "audit");
  assert.equal(app.modalMount.innerHTML, "");
}
console.log("PASS: screenshot's legacy empty-bill state cannot render or open tax/print options");

for (const missing of ["gstin", "items", "vendor_name", "declared_total"]) {
  const incomplete = structuredClone(invoice);
  delete incomplete[missing];
  if (missing === "declared_total") delete incomplete.total_declared;
  globalThis.fetch = async () => new Response(JSON.stringify(incomplete), { status: 200 });
  await app.handleFileUpload(file);
  assert.equal(app.uploadStatus, "valid", missing);
  assert.ok(app.currentInvoice, missing);
  assert.match(app.mainMount.innerHTML, /top-nav-tab-tax/, missing);
}
console.log("PASS: documents with some basic invoice details proceed even when other fields are missing");
