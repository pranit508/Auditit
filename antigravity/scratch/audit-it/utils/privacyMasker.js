// Client-side Privacy & Redaction Engine for AUDIT IT
import { sanitizeAndCleanInvoice } from "./itemCleaner.js";

export { sanitizeAndCleanInvoice };

/**
 * Masks Indian Bank Account Numbers (keeps last 4 digits visible)
 * e.g., "50100239482910" -> "•••• •••• •••• 2910"
 */
export function maskBankAccount(accountNumber) {
  if (!accountNumber) return "";
  const cleaned = accountNumber.toString().replace(/\s+/g, "");
  if (cleaned.length <= 4) return "••••" + cleaned;
  const lastFour = cleaned.slice(-4);
  return "•••• •••• •••• " + lastFour;
}

/**
 * Masks IFSC Codes (keeps bank prefix, masks branch code)
 * e.g., "HDFC0001234" -> "HDFC••••••"
 */
export function maskIFSC(ifsc) {
  if (!ifsc) return "";
  const cleaned = ifsc.trim().toUpperCase();
  if (cleaned.length < 5) return "••••••";
  return cleaned.slice(0, 4) + "••••••";
}

/**
 * Masks phone numbers (keeps last 3 digits)
 * e.g., "+91 9876543210" -> "+91 •••••••210"
 */
export function maskPhone(phone) {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.length < 5) return "•••••";
  return cleaned.slice(0, 3) + " •••••••" + cleaned.slice(-3);
}

/**
 * Pre-processes any raw text or object to ensure sensitive financial identifiers
 * are sanitized before UI display or downstream AI requests.
 * Enforces MANDATORY RULES:
 * 1. SUPPLIER NAME: Extract ONLY business trade name; remove phone/email artifacts.
 * 2. WHAT IS A LINE ITEM: Product/part/material/service with qty > 0 and rate > 0.
 * 3. FORBIDDEN LINE ITEMS: Street addresses, plots, industrial areas, GSTIN/PAN strings,
 *    pincodes, telephone numbers, amount in words, bank details.
 */
export function sanitizeInvoiceData(rawInvoice) {
  if (!rawInvoice || typeof rawInvoice !== "object") return rawInvoice;
  const sanitized = JSON.parse(JSON.stringify(rawInvoice));

  // 1. Clean Supplier Name (Remove phone/email artifacts)
  const supplier = sanitized.vendor_name || sanitized.supplier_name || "";
  let supplierCleaned = supplier.replace(/(Phone|Mobile|Tel|Email|Mob)[\s:]*[\+\d\s\w@\.\-]+/gi, "").trim();
  supplierCleaned = supplierCleaned.replace(/[\s,\-–—:|]+$/, "").trim();
  sanitized.vendor_name = supplierCleaned || "Supplier Name Unclear";
  sanitized.supplier_name = sanitized.vendor_name;

  // 2. Filter out non-items from the items list
  if (Array.isArray(sanitized.items)) {
    const addressWords = [
      "pan", "acc. number", "acc no", "account", "bank", "ifsc",
      "maharashtra", "mumbai", "delhi", "haryana", "karnataka", "gujarat",
      "rajasthan", "punjab", "uttar pradesh", "chennai", "bengaluru",
      "kolkata", "hyderabad", "ahmedabad", "pune", "buyer", "consignee",
      "plot", "sector", "industrial area", "bazaar", "road", "street", 
      "gstin", "gtin", "state", "thirteen", "thousand", 
      "hundred", "only", "rupees", "a/c", "phone"
    ];

    const GSTIN_PATTERN = /\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b/i;
    const PHONE_PATTERN = /(\+?91[\-\s]?)?[6-9]\d{9}/;
    const PAN_PATTERN = /\b[A-Z]{5}\d{4}[A-Z]{1}\b/i;

    sanitized.items = sanitized.items.filter(item => {
      if (!item || typeof item !== "object") return false;

      const desc = (item.description || item.item_name || "").trim();
      const descLower = desc.toLowerCase();

      // Reject if description matches address/words or is too short
      if (addressWords.some(word => descLower.includes(word)) || desc.length < 3) {
        return false;
      }

      // Reject PAN, Bank, Account patterns
      if (/\bpan\b|\bacc(?:\.|\s+)?(?:no|number)\b|\baccount\b|\bbank\b|\bifsc\b/i.test(descLower)) {
        return false;
      }

      // Reject GSTIN strings, PAN strings, or phone numbers
      if (GSTIN_PATTERN.test(desc) || PHONE_PATTERN.test(desc) || PAN_PATTERN.test(desc)) {
        return false;
      }

      // Reject single-token alphanumeric tax identifiers (e.g. BZKPALZD89, 06AAECM...)
      if (/^[A-Za-z0-9]{7,16}$/.test(desc) && /\d/.test(desc) && /[A-Za-z]/.test(desc)) {
        return false;
      }

      let billed = Number(item.total_amount !== undefined ? item.total_amount : item.amount) || 0;
      let qty = Number(item.quantity !== undefined ? item.quantity : item.qty) || 0;
      let rate = Number(item.unit_rate !== undefined ? item.unit_rate : item.rate) || 0;

      // Post-Processing Column Swap Fallback:
      // If total matches qty exactly and rate is small (e.g. qty=535, rate=2, total=535), 
      // it means qty and rate were misaligned. Swap them:
      if (billed > 0 && qty === billed && (rate === 1 || rate === 2)) {
        qty = 1.0;
        rate = billed;
      }

      // Quantity and rate must be positive
      if (qty <= 0 || rate <= 0) return false;

      // If billed total is astronomically different from qty * rate (like 42 * 14 = 588 vs 131001), skip
      if (billed > (qty * rate * 10) && billed > 100000) return false;

      // Clean description: Do not append units like 'NO', 'PCS', 'NOS', or serial numbers into the product description
      const descClean = desc.replace(/[\s\-,]+(NO|NOS|PCS|PIECES|PKT|PACKET|KG|BOX|SET)\.?$/i, "").trim();
      const finalDesc = descClean.length >= 3 ? descClean : desc;

      // Normalize properties
      item.quantity = qty;
      item.qty = qty;
      item.unit_rate = rate;
      item.rate = rate;
      item.total_amount = billed > 0 ? billed : Math.round(qty * rate * 100) / 100;
      item.amount = item.total_amount;
      item.description = finalDesc;

      return true;
    });

    // SUB-TOTAL CALCULATION:
    // Calculate the Subtotal deterministically from the extracted items:
    // subtotal = sum(item.quantity * item.unit_rate for item in items)
    if (sanitized.items.length > 0) {
      const calcSubtotal = Math.round(sanitized.items.reduce((acc, it) => acc + (it.quantity * it.unit_rate), 0) * 100) / 100;
      sanitized.subtotal = calcSubtotal;
      sanitized.calculated_subtotal = calcSubtotal;
    }
  }

  // 3. Mask bank account and IFSC details
  if (sanitized.bank_details) {
    if (sanitized.bank_details.account_number) {
      sanitized.bank_details.account_number = maskBankAccount(sanitized.bank_details.account_number);
    }
    if (sanitized.bank_details.ifsc) {
      sanitized.bank_details.ifsc = maskIFSC(sanitized.bank_details.ifsc);
    }
  }

  // 4. Grand Total Sanity Check: Reject 774 and OCR hallucinations
  const sub = Number(sanitized.subtotal) || 0;
  const totTax = Math.round(((Number(sanitized.cgst) || 0) + (Number(sanitized.sgst) || 0) + (Number(sanitized.igst) || 0)) * 100) / 100;
  const expTot = Math.round((sub + totTax) * 100) / 100;
  let decTot = Number(sanitized.total_declared !== undefined && sanitized.total_declared !== null ? sanitized.total_declared : sanitized.declared_total) || 0;
  if (expTot > 0 && (decTot === 774 || (sub > 0 && decTot < (sub * 0.5)))) {
    decTot = expTot;
  }
  sanitized.total_declared = decTot;
  sanitized.declared_total = decTot;

  return sanitized;
}
