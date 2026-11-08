// Optional live integration test of the upload controller and rendered state.
// Run: node --experimental-default-type=module tests/live-upload-screen.mjs <image.png>
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

globalThis.document = { addEventListener() {}, getElementById() { return null; }, activeElement: null };
globalThis.window = { scrollTo() {} };
const { AuditItApp } = await import("../app.js");
const app = Object.create(AuditItApp.prototype);
Object.assign(app, {
  mainMount: { innerHTML: "" }, modalMount: { innerHTML: "" },
  currentInvoice: null, currentAudit: null, taxData: null,
  currentView: "dashboard", apiKey: "", savedBills: [], userTaxSettings: {},
  showToast() {},
});
const nativeFetch = globalThis.fetch;
const requests = [];
globalThis.fetch = (path, options) => {
  requests.push(path);
  return nativeFetch(`https://${process.env.REPLIT_DEV_DOMAIN}${path}`, options);
};
const path = process.argv[2];
assert.ok(path, "Provide a non-invoice PNG fixture");
const file = new Blob([await readFile(path)], { type: "image/png" });
file.name = basename(path);
await app.handleFileUpload(file);
assert.deepEqual(requests, ["/api/analyze-bill"], "Rejected upload must never reach invoice processing");
assert.equal(app.uploadErrorCode, "INVALID_INVOICE");
assert.equal(app.currentInvoice, null);
assert.equal(app.currentAudit, null);
assert.equal(app.taxData, null);
assert.match(app.mainMount.innerHTML, /Please upload a valid tax invoice/);
assert.doesNotMatch(app.mainMount.innerHTML, /Review Needed|top-nav-tab|iframe|CA Audit Slip/);
console.log("PASS: real uploaded image rejected by live API; controller renders upload-only screen, with no calculation request or bill/tax UI");
