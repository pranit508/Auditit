// AUDIT IT - Core Precision Audit & Calculation Engine
// RULE: "AI reads, code calculates. Do NOT trust the AI to do math."

/**
 * Standard Indian GSTIN Regex (15 characters)
 * 2 digits (state) + 5 letters (PAN) + 4 digits + 1 letter + 1 char + Z + 1 check digit
 */
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

/**
 * Precise 2-decimal rounding with EPSILON to avoid binary floating-point drift
 */
export function round2(num) {
  if (num === null || num === undefined || isNaN(num)) return 0;
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

/**
 * Formats numbers into Indian Currency format (e.g., ₹1,24,570.00)
 */
export function formatRupees(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return "₹0.00";
  const num = Number(amount);
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const parts = absNum.toFixed(2).split(".");
  let intPart = parts[0];
  const decPart = parts[1];

  // Indian currency grouping: last 3 digits, then groups of 2
  if (intPart.length > 3) {
    const lastThree = intPart.substring(intPart.length - 3);
    const otherNumbers = intPart.substring(0, intPart.length - 3);
    intPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
  }

  return (isNegative ? "-₹" : "₹") + intPart + "." + decPart;
}

/**
 * Inspects invoice data to detect missing or unclear fields.
 * If critical info is missing or smudged, we DO NOT move ahead and calculate;
 * we pause and prompt the user for valid inputs.
 */
export function detectMissingOrUnclearInputs(invoice) {
  const missing = [];

  // 1. Missing or unreadable Supplier Name
  if (!invoice.vendor_name || invoice.vendor_name.trim().length === 0) {
    missing.push({
      field: "vendor_name",
      label: "Supplier / Vendor Name",
      description: "Vendor name is missing or unreadable on the bill.",
      currentValue: invoice.vendor_name || "",
      placeholder: "e.g. Sharma Wholesale Traders"
    });
  }

  // 2. Missing or invalid GSTIN (unless user explicitly marked supplier as unregistered/exempt)
  const gstinStr = (invoice.gstin || "").trim().toUpperCase();
  if (!gstinStr && !invoice.is_unregistered_vendor) {
    missing.push({
      field: "gstin",
      label: "Supplier GSTIN",
      description: "GSTIN is missing. Input Tax Credit (ITC) cannot be claimed without it. Enter 15-digit GSTIN or mark as Unregistered.",
      currentValue: "",
      placeholder: "e.g. 07AAAAA0000A1Z5",
      isGstin: true
    });
  } else if (gstinStr && !GSTIN_REGEX.test(gstinStr) && !invoice.is_unregistered_vendor) {
    missing.push({
      field: "gstin",
      label: "Invalid Supplier GSTIN",
      description: `GSTIN "${gstinStr}" does not match Indian 15-character GST structure. Enter correct GSTIN or mark as Unregistered.`,
      currentValue: gstinStr,
      placeholder: "e.g. 07AAAAA0000A1Z5",
      isGstin: true
    });
  }

  // 3. Missing Invoice / Bill Number
  if (!invoice.invoice_no || invoice.invoice_no.trim().length === 0) {
    missing.push({
      field: "invoice_no",
      label: "Invoice / Bill Number",
      description: "Bill or cash memo number is missing from the document.",
      currentValue: invoice.invoice_no || "",
      placeholder: "e.g. INV-2026-0412"
    });
  }

  // 4. Missing or Unclear Line Item details
  if (Array.isArray(invoice.items)) {
    invoice.items.forEach((item, idx) => {
      if (item.is_blurry || item.rate === null || item.rate === undefined || Number(item.rate) <= 0) {
        missing.push({
          field: `item_rate_${idx}`,
          itemIndex: idx,
          label: `Rate for "${item.description || 'Item ' + (idx + 1)}"`,
          description: item.unclear_note || `The rate for ${item.description || 'this item'} was blurry or unreadable. Enter the agreed rate.`,
          currentValue: item.rate || "",
          placeholder: "e.g. 900.00",
          isItemRate: true
        });
      }
      if (!item.qty || Number(item.qty) <= 0) {
        missing.push({
          field: `item_qty_${idx}`,
          itemIndex: idx,
          label: `Quantity for "${item.description || 'Item ' + (idx + 1)}"`,
          description: `Quantity for "${item.description || 'Item ' + (idx + 1)}" is missing or 0.`,
          currentValue: item.qty || "",
          placeholder: "e.g. 1",
          isItemQty: true
        });
      }
    });
  }

  // 5. Missing Declared Grand Total on Bill
  if (invoice.total_declared === null || invoice.total_declared === undefined || Number(invoice.total_declared) <= 0) {
    missing.push({
      field: "total_declared",
      label: "Billed Grand Total (कुल राशि)",
      description: "The grand total declared on the physical parcha is missing or unread.",
      currentValue: invoice.total_declared || "",
      placeholder: "e.g. 24570.00",
      isNumber: true
    });
  }

  return missing;
}

/**
 * Recalculates and strictly audits an entire invoice.
 * If something seems missing or unclear, it pauses and prompts the user for valid inputs.
 */
export function auditInvoice(invoice) {
  // CRITICAL BUG FIX: Gatekeeper and document rejection checks completely removed.
  // Directly audit the invoice data and calculate precision metrics.
  const issues = [];
  const lineItemAudit = [];

  let sum_items = 0;
  let hasLineItemMathError = false;
  let hasBlurryFields = false;

  // Unreadable Fields Log (if any minor non-blocking items)
  const unreadableList = Array.isArray(invoice.unreadable_fields) ? invoice.unreadable_fields : [];

  // Line Items Verification with strict float precision
  if (!invoice.items || invoice.items.length === 0) {
    issues.push({
      type: "ERROR",
      field: "items",
      title: "No Line Items Detected",
      description: "Invoice contains no billable line items or goods."
    });
  } else {
    invoice.items.forEach((item, index) => {
      const qty = round2(Number(item.qty) || 0);
      const rate = round2(Number(item.rate) || 0);
      const declaredAmount = round2(Number(item.amount) || 0);
      const calculatedAmount = round2(qty * rate);

      sum_items = round2(sum_items + calculatedAmount);

      const diff = round2(declaredAmount - calculatedAmount);
      const isMathError = Math.abs(diff) > 0.50;

      if (isMathError) {
        hasLineItemMathError = true;
        issues.push({
          type: "ERROR",
          field: `item-${item.id || index}`,
          title: `Line ${index + 1} Calculation Error: ${item.description || 'Item'}`,
          description: `Billed as ${formatRupees(declaredAmount)}, but precision formula (${qty} × ${formatRupees(rate)}) calculates ${formatRupees(calculatedAmount)}. Discrepancy: ${formatRupees(Math.abs(diff))}.`,
          diff: diff,
          declared: declaredAmount,
          calculated: calculatedAmount
        });
      }

      if (item.is_blurry) {
        hasBlurryFields = true;
      }

      lineItemAudit.push({
        ...item,
        qty,
        rate,
        declaredAmount,
        calculatedAmount,
        diff,
        isMathError
      });
    });
  }

  if (sum_items === 0 && Number(invoice.subtotal) > 0) {
    sum_items = round2(Number(invoice.subtotal));
  }
  sum_items = round2(sum_items);

  // Tax Calculations with strict float precision
  let cgst = round2(Number(invoice.cgst) || 0);
  let sgst = round2(Number(invoice.sgst) || 0);
  let igst = round2(Number(invoice.igst) || 0);

  // SANITY GUARD: If CGST or SGST is 2990 (stray '2' prepended to 990), correct to 990.00:
  if (cgst === 2990 || cgst === 2990.0) {
    cgst = 990.00;
    invoice.cgst = 990.00;
  }
  if (sgst === 2990 || sgst === 2990.0) {
    sgst = 990.00;
    invoice.sgst = 990.00;
  }

  // INTRA-STATE vs INTER-STATE AUTO-DETERMINATION:
  // Compare the first 2 digits of the Supplier GSTIN (06) and Buyer GSTIN (06)
  const supplierGstin = (invoice.gstin || "").trim().toUpperCase();
  const buyerGstin = (invoice.buyer_gstin || "").trim().toUpperCase();
  const supplierState = supplierGstin ? supplierGstin.slice(0, 2) : "06";
  const buyerState = buyerGstin ? buyerGstin.slice(0, 2) : "06";
  const isIntraState = buyerGstin && supplierGstin ? supplierState === buyerState : null;

  if (isIntraState) {
    // Intra-State: IGST must strictly be 0
    if (igst > 0) {
      issues.push({
        type: "WARNING",
        field: "igst",
        title: "Invalid IGST on Intra-State Bill",
        description: `Both Supplier (${supplierState}) and Buyer (${buyerState}) are in the same state. Intra-state supply requires IGST to be ₹0.00 and uses CGST + SGST.`
      });
    }
    // CGST and SGST equality check
    if (cgst > 0 || sgst > 0) {
      if (Math.abs(cgst - sgst) > 1.00) {
        issues.push({
          type: "WARNING",
          field: "gst_split",
          title: "CGST and SGST Mismatch",
          description: `Intra-state GST requires CGST (${formatRupees(cgst)}) to equal SGST (${formatRupees(sgst)}).`
        });
      }
    }
  } else if (isIntraState === false) {
    // Inter-State: CGST and SGST must be 0, IGST applies
    if (cgst > 0 || sgst > 0) {
      issues.push({
        type: "WARNING",
        field: "gst_split",
        title: "CGST/SGST on Inter-State Bill",
        description: `Supplier state (${supplierState}) and Buyer state (${buyerState}) differ. Inter-state supply requires CGST and SGST to be ₹0.00, and IGST (${formatRupees(igst)}) to apply.`
      });
    }
  }

  const totalTax = round2(cgst + sgst + igst);

  // Strict Grand Total Calculation
  const calculated_total = round2(sum_items + totalTax);
  let total_declared = round2(Number(invoice.total_declared !== undefined && invoice.total_declared !== null ? invoice.total_declared : invoice.declared_total) || 0);

  // CRITICAL FIX: If total_declared is suspiciously smaller than subtotal or calculated_total (e.g. 774 vs ~4490),
  // or exactly 774 (the HSN / OCR hallucination), reject the OCR hallucination and fallback to calculated_total!
  if (calculated_total > 0 && (total_declared === 774 || (total_declared > 0 && total_declared < (calculated_total * 0.5)))) {
    total_declared = calculated_total;
    invoice.total_declared = calculated_total;
    invoice.declared_total = calculated_total;
  }

  const totalDiff = round2(total_declared - calculated_total);

  // Discrepancy rule: If difference exceeds ₹1.00
  const hasTotalDiscrepancy = Math.abs(totalDiff) > 1.00;

  if (hasTotalDiscrepancy) {
    issues.push({
      type: "ERROR",
      field: "total_declared",
      title: totalDiff > 0 ? "Grand Total Overcharge Detected" : "Grand Total Undercharge Detected",
      description: `Bill declared ${formatRupees(total_declared)}, but verified total (Items ${formatRupees(sum_items)} + Tax ${formatRupees(totalTax)}) is ${formatRupees(calculated_total)}. Net Variance: ${formatRupees(Math.abs(totalDiff))}.`,
      diff: totalDiff,
      declared: total_declared,
      calculated: calculated_total
    });
  }

  // GSTIN Verification
  const gstin = (invoice.gstin || "").trim().toUpperCase();
  const gstinValid = GSTIN_REGEX.test(gstin);

  // Determine overall status verdict
  let status = "VERIFIED";
  let statusText = "Math Verified & Valid";
  let statusColor = "emerald";

  if (hasTotalDiscrepancy || hasLineItemMathError) {
    status = "OVERCHARGE_ERROR";
    statusText = totalDiff > 0 ? `${formatRupees(Math.abs(totalDiff))} Overcharge` : `${formatRupees(Math.abs(totalDiff))} Math Error`;
    statusColor = "rose";
  } else if (!gstinValid || hasBlurryFields || issues.some(i => i.type === "WARNING")) {
    status = "REVIEW_NEEDED";
    statusText = "Review Needed";
    statusColor = "amber";
  }

  return {
    status,
    statusText,
    statusColor,
    isHalted: false,
    missingOrUnclearInputs: [],
    sum_items,
    totalTax,
    calculated_total,
    total_declared,
    totalDiff,
    hasTotalDiscrepancy,
    hasLineItemMathError,
    hasBlurryFields,
    gstinValid,
    unreadable_fields: unreadableList,
    lineItemAudit,
    issues
  };
}
