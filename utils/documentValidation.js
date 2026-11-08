export const INVALID_INVOICE_MESSAGE = "Please upload a valid tax invoice.";

export function invalidInvoice() {
  const error = new Error(INVALID_INVOICE_MESSAGE);
  error.code = "INVALID_INVOICE";
  return error;
}

// Reject only when ALL basic invoice signals are absent.
export function requireTaxInvoice(document) {
  const vendor = document?.vendor_name || document?.supplier_name;
  const invoiceNumber = document?.invoice_number || document?.invoice_no;
  const gstin = String(document?.gstin || "").trim().toUpperCase();
  const total = Number(String(document?.declared_total ?? document?.total_declared ?? "").replace(/,/g, ""));
  const hasSaleItem = Array.isArray(document?.items) && document.items.some(item => {
    const quantity = Number(String(item?.quantity ?? item?.qty ?? "").replace(/,/g, ""));
    const rate = Number(String(item?.unit_rate ?? item?.rate ?? "").replace(/,/g, ""));
    return typeof item?.description === "string" && /[a-zA-Z]{2}/.test(item.description) &&
      quantity > 0 && Number.isFinite(quantity) && rate > 0 && Number.isFinite(rate);
  });
  const readable = value => typeof value === "string" && !!value.trim() &&
    !/^(?:n\/?a|null|none|unknown|not available)$/i.test(value.trim()) && !/unclear/i.test(value);
  const hasVendor = readable(vendor) && /\p{L}/u.test(vendor);
  const hasNumber = readable(invoiceNumber);
  const hasGstin = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin);
  const hasTotal = Number.isFinite(total) && total > 0;
  if (!hasVendor && !hasNumber && !hasGstin && !hasTotal && !hasSaleItem) {
    throw invalidInvoice();
  }
  return document;
}
