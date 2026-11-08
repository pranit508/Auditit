import assert from "node:assert/strict";
import { getBuyerDetails, renderBuyerDetails, extractBuyerDetails, extractSupplierGstin } from "../utils/buyerDetails.js";
import { sanitizeAndCleanInvoice } from "../utils/itemCleaner.js";

const absent = { buyer_name: null, buyer_address: null, buyer_gstin: null };
assert.deepEqual(extractBuyerDetails("Seller: Test Store\nGSTIN: 27ABCDE1234F1Z5\nOther GSTIN: 07ABCDE1234F1Z5\nItems"), absent);
assert.match(renderBuyerDetails({}), /Not specified on invoice/);
assert.doesNotMatch(renderBuyerDetails({}), /Buyer GSTIN/);
assert.deepEqual(getBuyerDetails({ buyer_gstin: "invalid" }), { name: null, address: null, gstin: null });
assert.match(renderBuyerDetails({ buyer_name: "Actual Buyer" }), /Actual Buyer/);
assert.doesNotMatch(renderBuyerDetails({ buyer_name: "Actual Buyer" }), /Buyer GSTIN/);
assert.match(renderBuyerDetails({ buyer_address: "12 Example Street" }), /12 Example Street/);
assert.match(renderBuyerDetails({ buyer_gstin: "27ABCDE1234F1Z5" }), /Buyer GSTIN/);
assert.doesNotMatch(renderBuyerDetails({ buyer_name: "<script>bad</script>" }), /<script>/);
const buyer = extractBuyerDetails("TAX INVOICE\nBilled To:\nExample Buyer\n12 Example Street\nGSTIN: 27ABCDE1234F1Z5\nDescription Qty Rate");
assert.deepEqual(buyer, { buyer_name: "Example Buyer", buyer_address: "12 Example Street", buyer_gstin: "27ABCDE1234F1Z5" });
const cleaned = sanitizeAndCleanInvoice({ vendor_name: "Test Store", gstin: "27ABCDE1234F1Z5", items: [], cgst: 18, sgst: 18, igst: 0 });
for (const [field, value] of Object.entries(absent)) assert.equal(cleaned[field], value);
assert.equal(cleaned.cgst, 18);
assert.equal(cleaned.sgst, 18);
assert.equal(cleaned.igst, 0);
const present = sanitizeAndCleanInvoice({ ...buyer, items: [] });
for (const [field, value] of Object.entries(buyer)) assert.equal(present[field], value);
console.log("PASS: absent, partial, invalid, explicit and escaped buyer details; no guessed recipient or tax state");

// Customer and transporter identifiers must never fill an absent seller GSTIN.
const roleFixture = `Example Tools\nPAN: EXAMPLE123\nTAX INVOICE
Customer Detail
M/S Example Engineering
Address Example Business Park
Phone 1234567890
GSTIN 32ABCDE1234F1Z5
Place of Supply Kerala
Invoice No INV-1
Transport ID 24ABCDE1234F1Z5
Description Qty Rate Amount`;
assert.deepEqual(extractBuyerDetails(roleFixture), {
  buyer_name: "Example Engineering", buyer_address: "Example Business Park",
  buyer_gstin: "32ABCDE1234F1Z5",
});
assert.equal(extractSupplierGstin(roleFixture), null);
assert.equal(extractSupplierGstin("Seller GSTIN: 27ABCDE1234F1Z5\n" + roleFixture), "27ABCDE1234F1Z5");
console.log("PASS: customer name/address/GSTIN mapped separately from transport and supplier");
