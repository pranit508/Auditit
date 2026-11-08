// Uploads must pass server validation. A failed provider request is not permission
// to manufacture an invoice with client OCR or a browser-saved credential.
import { invalidInvoice, requireTaxInvoice } from "./documentValidation.js?v=required-fields-20261107";

export async function extractInvoiceFromDocument(file, _unusedApiKey = null, onProgress = null) {
  if (!file.size || !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw invalidInvoice();
  }
  onProgress?.("Checking whether this document is a tax invoice...");
  const form = new FormData();
  form.append("file", file);
  let response;
  try {
    response = await fetch("/api/analyze-bill", { method: "POST", body: form });
  } catch {
    throw verificationUnavailable();
  }
  let invoice;
  try {
    invoice = await response.json();
  } catch {
    throw verificationUnavailable();
  }
  if (invoice?.code === "INVALID_INVOICE") throw invalidInvoice();
  if (!response.ok) throw verificationUnavailable();
  requireTaxInvoice(invoice);
  invoice.uploaded_file_url = URL.createObjectURL(file);
  invoice.file_type = file.type;
  invoice.file_name = file.name;
  return invoice;
}

function verificationUnavailable() {
  const error = new Error("We couldn't verify this document right now. Please try uploading it again. Invoice and tax options remain locked.");
  error.code = "VERIFICATION_UNAVAILABLE";
  return error;
}
