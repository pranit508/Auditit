import assert from "node:assert/strict";
import { isLikelyInvoice } from "../utils/invoiceTextParser.js";
import { extractInvoiceFromDocument } from "../utils/aiExtractor.js";

const invoice = "TAX INVOICE Invoice No INV-123 Seller Test Shop GSTIN 27ABCDE1234F1Z5 Description Qty Rate Amount LED bulbs 2 100 200 CGST 18 SGST 18 Grand Total 236";
assert.equal(isLikelyInvoice(invoice), true);
for (const text of [
  "Resume: Tax accountant experienced in GST invoice reconciliation. Total experience 10 years.",
  "Bank Statement: Total amount 10000, balance 5000. Invoice payment 3000.",
  "Quarterly report. GST amount and total sales increased this year.",
  "Purchase Order " + invoice,
  "Pro forma " + invoice,
  "",
]) assert.equal(isLikelyInvoice(text), false, text);

// A server rejection must be final: no OCR or direct-Gemini retry.
let requests = 0;
globalThis.fetch = async () => {
  requests++;
  return new Response(JSON.stringify({ code: "INVALID_INVOICE" }), { status: 422 });
};
globalThis.window = { Tesseract: { recognize() { throw new Error("OCR must not run"); } } };
const file = new Blob(["unrelated document"], { type: "image/png" });
file.name = "random.png";
await assert.rejects(() => extractInvoiceFromDocument(file), error =>
  error.code === "INVALID_INVOICE" && error.message === "Please upload a valid tax invoice.");
assert.equal(requests, 1);

// When AI is unavailable, OCR must not run or substitute its own invoice.
globalThis.fetch = async () => new Response("{}", { status: 503 });
globalThis.FileReader = class {
  readAsDataURL() { this.result = "data:image/png;base64,dGVzdA=="; this.onload(); }
};
globalThis.window.Tesseract.recognize = async () => ({ data: { text: "Resume: Tax accountant. Total experience ten years." } });
await assert.rejects(() => extractInvoiceFromDocument(file), { code: "VERIFICATION_UNAVAILABLE" });
globalThis.window.Tesseract.recognize = async () => ({ data: { text: "" } });
await assert.rejects(() => extractInvoiceFromDocument(file), { code: "VERIFICATION_UNAVAILABLE" });
let options;
globalThis.fetch = async (_url, supplied) => {
  options = supplied;
  return new Response("{}", {status: 503});
};
await assert.rejects(() => extractInvoiceFromDocument(file, "old-browser-credential"), {code: "VERIFICATION_UNAVAILABLE"});
assert.equal(options.headers, undefined, "Browser credentials must never be sent");
console.log("PASS: invoice detection, final rejection, unrelated OCR, and unreadable document guards");
