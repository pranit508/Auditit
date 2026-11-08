const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const text = value => typeof value === "string" && value.trim() &&
  !/^(?:n\/?a|unknown|not (?:specified|available)|null)$/i.test(value.trim()) ? value.trim() : null;
import { escapeHtml as escape } from "./html.js";

export function getBuyerDetails(invoice = {}) {
  const gstin = text(invoice.buyer_gstin)?.toUpperCase();
  return {
    name: text(invoice.buyer_name),
    address: text(invoice.buyer_address),
    gstin: gstin && gstinPattern.test(gstin) ? gstin : null,
  };
}

export function renderBuyerDetails(invoice) {
  const buyer = getBuyerDetails(invoice);
  if (!buyer.name && !buyer.address && !buyer.gstin) {
    return '<span class="text-slate-400 text-[10px]">Not specified on invoice</span>';
  }
  return `${buyer.name ? `<strong class="text-slate-900 text-xs">${escape(buyer.name)}</strong>` : ""}
    ${buyer.address ? `<span class="text-slate-500 block whitespace-pre-line">${escape(buyer.address)}</span>` : ""}
    ${buyer.gstin ? `<span class="text-[10px] font-mono text-slate-600 block mt-0.5">Buyer GSTIN: <strong>${escape(buyer.gstin)}</strong></span>` : ""}`;
}

// Only consume a labelled buyer block; never assume the second GSTIN is a buyer.
export function extractBuyerDetails(rawText) {
  const block = rawText.match(/(?:^|\n)\s*(?:billed?\s+to|bill\s+to|buyer|consignee|recipient|customer)(?:\s+details?)?\s*[:\-]?\s*([\s\S]*?)(?=\n\s*(?:ship\s+to|supplier|seller|invoice|transport(?:er)?|e[\s-]*way|challan|description|particulars|items?|hsn|subtotal|total)\b|$)/i)?.[1];
  if (!block) return { buyer_name: null, buyer_address: null, buyer_gstin: null };
  const gstin = block.match(/\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/i)?.[0]?.toUpperCase() || null;
  const lines = block.split(/\n/).map(line => line.trim()).filter(Boolean);
  const name = lines[0] && !/^(?:address|gstin?|phone|email)\b/i.test(lines[0]) ? lines.shift().replace(/^(?:name|m\/s)\s*:?\s*/i, "") : null;
  const address = lines.filter(line => !/gstin?|phone|email|place\s+of\s+supply/i.test(line)).join("\n").replace(/^address\s*:?\s*/i, "") || null;
  return { buyer_name: name, buyer_address: address, buyer_gstin: gstin };
}

export function extractSupplierGstin(rawText) {
  const pattern = /(?:supplier|seller|vendor)\s+GSTIN\s*:?\s*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])\b/i;
  const explicit = rawText.match(pattern)?.[1];
  if (explicit) return explicit.toUpperCase();
  const sellerHeader = rawText.split(/(?:^|\n)\s*(?:customer|buyer|billed?\s+to|bill\s+to|consignee|recipient|transport(?:er)?)\b/i)[0];
  return sellerHeader.match(/\bGSTIN\s*:?\s*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])\b/i)?.[1]?.toUpperCase() || null;
}
