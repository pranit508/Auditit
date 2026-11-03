// Generates bilingual (English + Hindi) dispute notes and CA summaries for AUDIT IT
import { formatRupees } from "./auditEngine.js";

/**
 * Generates a ready-to-send dispute note for WhatsApp / SMS to the supplier
 */
export function generateSupplierDisputeNote(invoice, audit) {
  const vendor = invoice.vendor_name || "Supplier";
  const invNo = invoice.invoice_no || "N/A";
  const invDate = invoice.date || "N/A";

  const diffAmount = Math.abs(audit.totalDiff);
  const isOvercharge = audit.totalDiff > 0;

  let note = `*AUDIT DISCREPANCY NOTE / बिल ऑडिट विवरण*\n`;
  note += `------------------------------------\n`;
  note += `To: *${vendor}*\n`;
  note += `Bill / Invoice No: *${invNo}*\n`;
  note += `Date: *${invDate}*\n\n`;

  note += `Namaste ji,\n`;
  note += `We audited the calculations on this invoice and noticed a discrepancy:\n\n`;

  // Itemize line errors
  const lineErrors = audit.issues.filter(i => i.type === "ERROR" && i.field.startsWith("item-"));
  if (lineErrors.length > 0) {
    note += `*Item Calculation Errors:*\n`;
    lineErrors.forEach((err, idx) => {
      note += `${idx + 1}. ${err.title}\n   ↳ ${err.description}\n`;
    });
    note += `\n`;
  }

  note += `*Total Summary:*\n`;
  note += `• Billed Amount on Parcha: *${formatRupees(audit.total_declared)}*\n`;
  note += `• Correct Verified Amount: *${formatRupees(audit.calculated_total)}*\n`;
  note += `• *${isOvercharge ? "Overcharged Amount" : "Difference"}*: *${formatRupees(diffAmount)}*\n\n`;

  if (!audit.gstinValid) {
    note += `⚠️ *GSTIN Notice:* The GSTIN is either missing or unverified. Please share your registered 15-digit GSTIN so we can claim Input Tax Credit (ITC).\n\n`;
  }

  note += `Please review the above numbers and kindly issue a revised bill or a Credit Note (जमा पर्चा) for *${formatRupees(diffAmount)}*.\n\n`;
  note += `Dhanyawad,\nAudit Generated via *AUDIT IT* (Retail Bill Verification)`;

  return note;
}

/**
 * Generates an accounting ledger summary string for CA / tax consultant
 */
export function generateCaSummaryText(invoice, audit) {
  return `AUDIT IT - FORMAL INVOICE AUDIT SLIP
=========================================
Vendor Name: ${invoice.vendor_name || "N/A"}
Supplier GSTIN: ${invoice.gstin || "MISSING / UNVERIFIED"}
Invoice Number: ${invoice.invoice_no || "N/A"}
Invoice Date: ${invoice.date || "N/A"}
-----------------------------------------
Audit Status: ${audit.statusText.toUpperCase()}
Sum of Line Items: ${formatRupees(audit.sum_items)}
Total Declared GST: ${formatRupees(audit.totalTax)} (CGST: ${formatRupees(invoice.cgst || 0)}, SGST: ${formatRupees(invoice.sgst || 0)}, IGST: ${formatRupees(invoice.igst || 0)})
Verified Grand Total: ${formatRupees(audit.calculated_total)}
Billed Grand Total: ${formatRupees(audit.total_declared)}
Variance / Difference: ${formatRupees(audit.totalDiff)}
-----------------------------------------
Issues Logged (${audit.issues.length}):
${audit.issues.map((i, idx) => `[${idx + 1}] [${i.type}] ${i.title}: ${i.description}`).join("\n")}
=========================================
Audited by AUDIT IT Engine - 100% Calculated via Deterministic Code`;
}
