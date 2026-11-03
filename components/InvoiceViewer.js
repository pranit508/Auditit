// Component: High-fidelity Realistic Indian Tax Invoice Viewer with Real-Time Document Toggle & OCR Inspector
import { formatRupees } from "../utils/auditEngine.js";

export function renderInvoiceViewer(container, invoice, audit, options = {}) {
  const { onSelectItem, selectedItemId } = options;

  const hasUploadedFile = !!invoice.uploaded_file_url;
  // Local view mode state attached to container dataset (defaults to 'digital' so digitized bill is immediately visible)
  const currentMode = container.dataset.viewMode || "digital";

  container.innerHTML = `
    <div class="relative bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden select-none">
      <!-- Toolbar Header -->
      <div class="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center space-x-2">
          <span class="inline-block w-2.5 h-2.5 rounded-full ${audit.hasTotalDiscrepancy ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}"></span>
          <span class="text-xs font-bold text-slate-800 tracking-wide uppercase">
            ${currentMode === 'photo' ? 'Original Document File' : currentMode === 'ocr' ? 'Extracted OCR Text' : 'Live Tax Invoice Preview'}
          </span>
          <span class="text-[11px] text-slate-400 font-mono">(${invoice.invoice_no || "Draft"})</span>
        </div>

        <div class="flex items-center space-x-1.5 text-xs">
          ${hasUploadedFile ? `
            <div class="bg-slate-200/90 p-0.5 rounded-lg flex text-[10px] font-bold">
              <button id="toggle-view-digital" class="px-2.5 py-1 rounded-md transition-all ${currentMode === 'digital' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'}">
                📄 Digitized Parcha
              </button>
              <button id="toggle-view-photo" class="px-2.5 py-1 rounded-md transition-all ${currentMode === 'photo' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'}">
                📷 Original Document
              </button>
              ${invoice.raw_ocr_text ? `
                <button id="toggle-view-ocr" class="px-2.5 py-1 rounded-md transition-all ${currentMode === 'ocr' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'}">
                  🔍 Raw OCR
                </button>
              ` : ''}
            </div>
          ` : `
            <span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-medium text-[10px] border border-emerald-200">
              Live Real-Time Sync
            </span>
          `}
        </div>
      </div>

      <!-- Canvas Area -->
      <div class="p-3 sm:p-6 overflow-x-auto bg-slate-100/50 min-h-[460px] flex items-center justify-center">

        ${currentMode === 'photo' && hasUploadedFile ? `
          <!-- REAL UPLOADED FILE VIEW -->
          <div class="relative max-w-lg w-full rounded-lg shadow-md overflow-hidden border border-slate-300 bg-black/5">
            <div class="absolute top-3 left-3 z-10 bg-slate-900/80 backdrop-blur-sm text-white px-2.5 py-1 rounded-md text-[10px] font-semibold flex items-center space-x-1.5">
              <span>📷 Original Uploaded File</span>
              <span class="text-slate-300 font-mono">(${invoice.file_name || 'Bill'})</span>
            </div>
            
            ${invoice.file_type?.includes('pdf') ? `
              <embed src="${invoice.uploaded_file_url}" type="application/pdf" class="w-full h-[520px] rounded-lg" />
            ` : `
              <div class="relative group">
                <img src="${invoice.uploaded_file_url}" alt="Uploaded Invoice" class="w-full h-auto object-contain max-h-[580px] rounded-lg" />
                
                ${audit.hasTotalDiscrepancy ? `
                  <div class="absolute bottom-6 right-4 bg-rose-600/95 text-white text-[10px] font-bold px-2.5 py-1 rounded shadow-lg border border-white animate-pulse">
                    ⚠️ Math Discrepancy Found in Totals
                  </div>
                ` : ''}
              </div>
            `}
          </div>
        ` : currentMode === 'ocr' && invoice.raw_ocr_text ? `
          <!-- RAW OCR TEXT VIEW -->
          <div class="max-w-xl w-full bg-slate-900 text-slate-200 p-4 sm:p-6 rounded-xl font-mono text-xs shadow-md border border-slate-800 space-y-3">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
              <span class="text-emerald-400 font-bold uppercase text-[10px]">Actual Extracted Document Text</span>
              <span class="text-[10px] text-slate-400">Zero Fake Items</span>
            </div>
            <pre class="whitespace-pre-wrap leading-relaxed text-[11px] max-h-[460px] overflow-y-auto text-slate-300 select-text bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">${invoice.raw_ocr_text}</pre>
          </div>
        ` : `
          <!-- HIGH FIDELITY REAL-TIME DIGITIZED INVOICE PAPER -->
          <div id="invoice-paper" class="relative mx-auto bg-white p-5 sm:p-8 rounded-lg shadow-md border border-slate-300 w-full max-w-xl font-sans text-slate-800 text-xs transition-all">
            
            <!-- TAX INVOICE HEADER -->
            <div class="border-b-2 border-slate-800 pb-3 mb-4">
              <div class="flex justify-between items-start">
                <div>
                  <h2 class="text-base sm:text-lg font-bold text-slate-900 tracking-tight">${invoice.vendor_name || "Supplier Name"}</h2>
                  <p class="text-[11px] text-slate-500 max-w-xs mt-0.5">${invoice.vendor_address || "Commercial Wholesale Market, India"}</p>
                  
                  <div class="mt-2 flex items-center space-x-2">
                    <span class="font-semibold text-slate-700">GSTIN:</span>
                    ${audit.gstinValid 
                      ? `<span class="font-mono bg-emerald-50 text-emerald-900 border border-emerald-300 px-1.5 py-0.5 rounded font-semibold text-[11px]">${invoice.gstin}</span>`
                      : `<span class="relative group cursor-pointer inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse" data-box-id="gstin">
                          ⚠️ ${invoice.gstin ? 'Invalid Format: ' + invoice.gstin : 'Missing / Not Stated'}
                         </span>`
                    }
                  </div>
                </div>

                <div class="text-right">
                  <span class="inline-block px-2 py-1 bg-slate-900 text-white font-bold text-[10px] tracking-widest rounded uppercase">TAX INVOICE</span>
                  <div class="mt-2 text-slate-600 space-y-0.5 text-[11px]">
                    <div><span class="text-slate-400">Bill No:</span> <strong class="font-mono text-slate-900">${invoice.invoice_no || "N/A"}</strong></div>
                    <div><span class="text-slate-400">Date:</span> <strong class="text-slate-900">${invoice.date || "N/A"}</strong></div>
                    <div><span class="text-slate-400">Status:</span> <strong class="${audit.hasTotalDiscrepancy ? 'text-rose-600' : 'text-emerald-700'}">${audit.status}</strong></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- BUYER DETAILS -->
            <div class="bg-slate-50 p-2.5 rounded border border-slate-200 mb-4 flex justify-between items-center text-[11px]">
              <div>
                <span class="text-slate-400 uppercase tracking-wider text-[9px] font-bold block">Billed To (Retailer / ग्राहक):</span>
                <strong class="text-slate-900 text-xs">Apna Kirana & Retail Mart</strong>
                <span class="text-slate-500 block">Main Market Road, Counter #1</span>
                <span class="text-[10px] font-mono text-slate-600 block mt-0.5">Buyer GSTIN: <strong class="text-slate-800">${invoice.buyer_gstin || "06CORPP2712A1Z1"}</strong> (State: ${(invoice.buyer_gstin || "06CORPP2712A1Z1").slice(0, 2)})</span>
              </div>
              <div class="text-right">
                <span class="inline-flex items-center text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Direct Trade Purchase
                </span>
                <span class="block text-[10px] font-semibold text-slate-600 mt-1 font-mono">
                  ${((invoice.gstin || "06").slice(0, 2) === (invoice.buyer_gstin || "06CORPP2712A1Z1").slice(0, 2)) ? 'Intra-State Supply' : 'Inter-State Supply'}
                </span>
              </div>
            </div>

            <!-- ITEMS TABLE -->
            <div class="mb-4">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-b border-t border-slate-300 text-slate-500 text-[10px] uppercase font-semibold">
                    <th class="py-1.5 pl-1 w-8">#</th>
                    <th class="py-1.5">Item Description</th>
                    <th class="py-1.5 text-right w-12">Qty</th>
                    <th class="py-1.5 text-right w-16">Rate</th>
                    <th class="py-1.5 pr-1 text-right w-20">Amount</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${invoice.items && invoice.items.length > 0 ? invoice.items.map((item, idx) => {
                    const isErr = item.error_flag || (audit.issues.some(i => i.field === `item-${item.id || idx}` && i.type === "ERROR"));
                    const isBlurry = item.is_blurry;
                    const isSelected = selectedItemId === (item.id || idx.toString());

                    let boxClass = "";
                    let badgeMarkup = "";

                    if (isErr) {
                      boxClass = "relative bg-rose-50/80 ring-2 ring-rose-500 rounded font-semibold text-rose-950 cursor-pointer transition-all";
                      badgeMarkup = `<span class="inline-flex items-center ml-1.5 px-1.5 py-0.2 rounded text-[9px] bg-rose-600 text-white font-bold animate-pulse">Math Error</span>`;
                    } else if (isBlurry) {
                      boxClass = "relative bg-amber-50/80 ring-2 ring-amber-400 rounded font-medium text-amber-950 cursor-pointer transition-all";
                      badgeMarkup = `<span class="inline-flex items-center ml-1.5 px-1.5 py-0.2 rounded text-[9px] bg-amber-500 text-white font-bold">Unclear</span>`;
                    } else if (isSelected) {
                      boxClass = "relative bg-indigo-50 ring-2 ring-indigo-500 rounded font-medium transition-all";
                    }

                    return `
                      <tr class="${boxClass} hover:bg-slate-50 transition-colors" data-box-id="${item.id || idx}">
                        <td class="py-2 pl-1 font-mono text-slate-400 text-[10px]">${idx + 1}</td>
                        <td class="py-2 font-medium text-slate-900">
                          ${item.description}
                          ${badgeMarkup}
                          ${item.hsn ? `<div class="text-[10px] text-slate-400 font-mono">HSN: ${item.hsn}</div>` : ''}
                        </td>
                        <td class="py-2 text-right font-mono font-medium">${item.qty}</td>
                        <td class="py-2 text-right font-mono ${isBlurry ? 'blur-[1.5px] bg-amber-100/80 px-1 rounded' : ''}">${formatRupees(item.rate)}</td>
                        <td class="py-2 pr-1 text-right font-mono font-bold ${isErr ? 'text-rose-600' : 'text-slate-900'}">${formatRupees(item.amount)}</td>
                      </tr>
                    `;
                  }).join("") : `
                    <tr>
                      <td colspan="5" class="py-4 text-center text-slate-400 italic">No line items in bill</td>
                    </tr>
                  `}
                </tbody>
              </table>
            </div>

            <!-- SUMMARY & TAX BREAKDOWN -->
            <div class="border-t-2 border-slate-300 pt-3 flex flex-col sm:flex-row justify-between items-start gap-4">
              <!-- Left: Bank Details -->
              <div class="text-[10px] text-slate-500 space-y-1 max-w-[220px]">
                <div class="font-bold text-slate-700 uppercase tracking-wider text-[9px]">Supplier Bank (Masked):</div>
                <div class="bg-slate-50 p-2 rounded border border-slate-200 font-mono text-[10px]">
                  <div>Bank: <span class="font-medium text-slate-700">${invoice.bank_details?.bank_name || "State Bank of India"}</span></div>
                  <div>A/C: <span class="tracking-wider bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-semibold">${invoice.bank_details?.account_number || "•••• •••• •••• 4821"}</span></div>
                  <div>IFSC: <span class="tracking-wider bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-semibold">${invoice.bank_details?.ifsc || "SBIN••••••"}</span></div>
                </div>
              </div>

              <!-- Right: Subtotal, Taxes & Declared Grand Total -->
              <div class="w-full sm:w-56 text-right space-y-1 text-[11px]">
                <div class="flex justify-between text-slate-600">
                  <span>Subtotal (सकल योग):</span>
                  <span class="font-mono font-medium">${formatRupees(invoice.subtotal)}</span>
                </div>

                ${invoice.cgst > 0 ? `
                  <div class="flex justify-between text-slate-500">
                    <span>CGST:</span>
                    <span class="font-mono">${formatRupees(invoice.cgst)}</span>
                  </div>
                ` : ''}

                ${invoice.sgst > 0 ? `
                  <div class="flex justify-between text-slate-500">
                    <span>SGST:</span>
                    <span class="font-mono">${formatRupees(invoice.sgst)}</span>
                  </div>
                ` : ''}

                ${invoice.igst > 0 ? `
                  <div class="flex justify-between text-slate-500">
                    <span>IGST:</span>
                    <span class="font-mono">${formatRupees(invoice.igst)}</span>
                  </div>
                ` : ''}

                <!-- DECLARED GRAND TOTAL WITH BOUNDING BOX -->
                <div class="pt-2 border-t border-slate-300">
                  <div class="flex justify-between items-center ${audit.hasTotalDiscrepancy ? 'p-1.5 bg-rose-50 rounded ring-2 ring-rose-500 cursor-pointer animate-pulse' : 'p-1.5 bg-emerald-50 rounded ring-1 ring-emerald-400'}" data-box-id="total_declared">
                    <div class="text-left">
                      <span class="text-[10px] font-bold uppercase text-slate-700 block">Billed Grand Total:</span>
                      <span class="text-[9px] text-slate-400">परचे पर अंकित कुल</span>
                    </div>
                    <div class="text-right">
                      <span class="text-sm font-bold font-mono ${audit.hasTotalDiscrepancy ? 'text-rose-600' : 'text-emerald-700'}">
                        ${formatRupees(invoice.total_declared)}
                      </span>
                      ${audit.hasTotalDiscrepancy ? `
                        <span class="block text-[9px] font-bold text-rose-600">Mismatch: ${formatRupees(audit.totalDiff)}</span>
                      ` : `
                        <span class="block text-[9px] font-bold text-emerald-600">Verified Match ✓</span>
                      `}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- FOOTER SIGNATORY -->
            <div class="mt-5 pt-3 border-t border-dashed border-slate-300 flex justify-between items-end text-[9px] text-slate-400">
              <div>
                <p>Terms: ${invoice.payment_terms || "Subject to local jurisdiction"}</p>
                <p class="mt-0.5">Note: ${invoice.notes || "Computerized audit verification."}</p>
              </div>
              <div class="text-right">
                <span class="border-t border-slate-400 pt-1 font-semibold text-slate-600 block">Authorised Signatory</span>
              </div>
            </div>

          </div>
        `}

      </div>

      <!-- Quick Legend Footer -->
      <div class="bg-slate-50 px-4 py-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
        <span class="font-medium text-slate-700">Interactive Legend:</span>
        <div class="flex items-center space-x-3">
          <span class="flex items-center space-x-1">
            <span class="w-2.5 h-2.5 rounded bg-rose-500 ring-1 ring-rose-600"></span>
            <span>Math Discrepancy</span>
          </span>
          <span class="flex items-center space-x-1">
            <span class="w-2.5 h-2.5 rounded bg-amber-400 ring-1 ring-amber-500"></span>
            <span>Unclear / Missing</span>
          </span>
          <span class="flex items-center space-x-1">
            <span class="w-2.5 h-2.5 rounded bg-emerald-500 ring-1 ring-emerald-600"></span>
            <span>Verified</span>
          </span>
        </div>
      </div>
    </div>
  `;

  // Attach toggle listeners
  const btnPhoto = container.querySelector("#toggle-view-photo");
  const btnDigital = container.querySelector("#toggle-view-digital");
  const btnOcr = container.querySelector("#toggle-view-ocr");

  if (btnPhoto) {
    btnPhoto.addEventListener("click", () => {
      container.dataset.viewMode = "photo";
      renderInvoiceViewer(container, invoice, audit, options);
    });
  }
  if (btnDigital) {
    btnDigital.addEventListener("click", () => {
      container.dataset.viewMode = "digital";
      renderInvoiceViewer(container, invoice, audit, options);
    });
  }
  if (btnOcr) {
    btnOcr.addEventListener("click", () => {
      container.dataset.viewMode = "ocr";
      renderInvoiceViewer(container, invoice, audit, options);
    });
  }

  // Attach interactive click listeners on bounding boxes
  container.querySelectorAll("[data-box-id]").forEach(el => {
    el.addEventListener("click", () => {
      const boxId = el.getAttribute("data-box-id");
      if (onSelectItem) {
        onSelectItem(boxId);
      }
    });
  });
}
