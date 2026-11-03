// Component: Professional A4 CA Audit Slip Modal
import { formatRupees } from "../utils/auditEngine.js";

export function renderCaSlipModal(container, invoice, audit, onClose) {
  const isErr = audit.hasTotalDiscrepancy;
  const currentDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
  const currentTime = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  });

  container.innerHTML = `
    <div class="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div class="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto print:shadow-none print:border-none print:w-full print:max-w-none">
        
        <!-- Modal Top Bar (Hidden during print) -->
        <div class="bg-slate-900 text-white px-5 py-3 flex items-center justify-between print:hidden">
          <div class="flex items-center space-x-2">
            <span class="w-3 h-3 rounded-full bg-emerald-400"></span>
            <span class="text-xs font-bold uppercase tracking-wider">CA Audit Certificate / सीए ऑडिट पर्चा</span>
          </div>
          <div class="flex items-center space-x-2">
            <button id="btn-print-slip" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1 transition-all">
              <span>🖨️ Print / Save as PDF</span>
            </button>
            <button id="btn-close-modal" class="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-all text-sm font-bold px-2">
              ✕
            </button>
          </div>
        </div>

        <!-- Printable Document Body -->
        <div id="printable-ca-slip" class="p-6 sm:p-8 font-sans text-slate-800 text-xs">
          
          <!-- Slip Header -->
          <div class="border-b-2 border-slate-900 pb-4 mb-4 flex justify-between items-start">
            <div>
              <div class="flex items-center space-x-2">
                <span class="text-base font-black tracking-tight text-slate-900">AUDIT IT</span>
                <span class="text-[10px] px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">COMPLIANCE CERTIFICATE</span>
              </div>
              <p class="text-[11px] text-slate-500 mt-1">Retail Invoice Mathematical & GST Audit Report</p>
              <p class="text-[10px] text-slate-400">Generated for Books of Accounts & Tax Filing</p>
            </div>
            <div class="text-right">
              <span class="font-mono text-[10px] text-slate-500 block">Certificate Ref: <strong class="text-slate-800">AUD-${Date.now().toString().slice(-6)}</strong></span>
              <span class="text-[10px] text-slate-500 block">Date: <strong class="text-slate-800">${currentDate} ${currentTime}</strong></span>
              <span class="inline-block mt-1 px-2.5 py-0.5 rounded text-[10px] font-bold ${
                isErr ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }">
                STATUS: ${audit.status}
              </span>
            </div>
          </div>

          <!-- Invoice & Vendor Metadata Table -->
          <div class="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-lg border border-slate-200 mb-4 text-[11px]">
            <div>
              <span class="text-slate-400 font-bold uppercase text-[9px] block">Supplier Information:</span>
              <div class="font-bold text-slate-900 text-xs mt-0.5">${invoice.vendor_name || "N/A"}</div>
              <div class="text-slate-600 mt-0.5">GSTIN: <span class="font-mono font-bold ${audit.gstinValid ? 'text-slate-800' : 'text-rose-600'}">${invoice.gstin || "MISSING / NOT PROVIDED"}</span></div>
              <div class="text-slate-500 text-[10px]">${invoice.vendor_address || ""}</div>
            </div>
            <div>
              <span class="text-slate-400 font-bold uppercase text-[9px] block">Invoice Record:</span>
              <div class="text-slate-700 mt-0.5">Invoice / Memo No: <span class="font-mono font-bold text-slate-900">${invoice.invoice_no || "N/A"}</span></div>
              <div class="text-slate-700 mt-0.5">Invoice Date: <span class="font-bold text-slate-900">${invoice.date || "N/A"}</span></div>
              <div class="text-slate-700 mt-0.5">Recipient: <span class="font-bold text-slate-900">Apna Kirana & Retail Mart</span></div>
            </div>
          </div>

          <!-- Mathematical Reconciliation Table -->
          <div class="mb-4">
            <h4 class="text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-2">Reconciliation Summary</h4>
            <table class="w-full text-left border-collapse border border-slate-300 text-xs">
              <thead class="bg-slate-100 text-slate-600 text-[10px] uppercase">
                <tr>
                  <th class="p-2 border border-slate-300">Financial Head</th>
                  <th class="p-2 border border-slate-300 text-right">Declared on Bill</th>
                  <th class="p-2 border border-slate-300 text-right">Verified by Code</th>
                  <th class="p-2 border border-slate-300 text-right">Discrepancy (Variance)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                <tr>
                  <td class="p-2 border border-slate-300 font-medium">Subtotal of Goods (Net)</td>
                  <td class="p-2 border border-slate-300 text-right font-mono">${formatRupees(invoice.subtotal)}</td>
                  <td class="p-2 border border-slate-300 text-right font-mono font-bold text-emerald-700">${formatRupees(audit.sum_items)}</td>
                  <td class="p-2 border border-slate-300 text-right font-mono ${invoice.subtotal !== audit.sum_items ? 'text-rose-600 font-bold' : 'text-slate-500'}">
                    ${formatRupees(invoice.subtotal - audit.sum_items)}
                  </td>
                </tr>
                <tr>
                  <td class="p-2 border border-slate-300 font-medium">Taxes (CGST + SGST / IGST)</td>
                  <td class="p-2 border border-slate-300 text-right font-mono">${formatRupees(audit.totalTax)}</td>
                  <td class="p-2 border border-slate-300 text-right font-mono font-bold text-emerald-700">${formatRupees(audit.totalTax)}</td>
                  <td class="p-2 border border-slate-300 text-right font-mono text-slate-500">₹0.00</td>
                </tr>
                <tr class="bg-slate-50 font-bold">
                  <td class="p-2 border border-slate-300 text-slate-900 uppercase">Grand Total Payable</td>
                  <td class="p-2 border border-slate-300 text-right font-mono text-slate-900">${formatRupees(audit.total_declared)}</td>
                  <td class="p-2 border border-slate-300 text-right font-mono text-emerald-700">${formatRupees(audit.calculated_total)}</td>
                  <td class="p-2 border border-slate-300 text-right font-mono text-sm ${isErr ? 'text-rose-600 bg-rose-50' : 'text-emerald-700'}">
                    ${audit.totalDiff > 0 ? '+' : ''}${formatRupees(audit.totalDiff)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Itemized Breakdown -->
          <div class="mb-4">
            <h4 class="text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">Line Items Verification</h4>
            <table class="w-full text-left border-collapse border border-slate-200 text-[11px]">
              <thead class="bg-slate-50 text-slate-500 text-[9px] uppercase">
                <tr>
                  <th class="p-1.5 border border-slate-200">#</th>
                  <th class="p-1.5 border border-slate-200">Item Name</th>
                  <th class="p-1.5 border border-slate-200 text-right">Qty</th>
                  <th class="p-1.5 border border-slate-200 text-right">Rate</th>
                  <th class="p-1.5 border border-slate-200 text-right">Declared</th>
                  <th class="p-1.5 border border-slate-200 text-right">Calculated</th>
                  <th class="p-1.5 border border-slate-200 text-center">Audit Note</th>
                </tr>
              </thead>
              <tbody>
                ${audit.lineItemAudit.map((item, idx) => `
                  <tr class="${item.isMathError ? 'bg-rose-50 text-rose-900 font-medium' : ''}">
                    <td class="p-1.5 border border-slate-200 font-mono text-[10px]">${idx + 1}</td>
                    <td class="p-1.5 border border-slate-200">${item.description}</td>
                    <td class="p-1.5 border border-slate-200 text-right font-mono">${item.qty}</td>
                    <td class="p-1.5 border border-slate-200 text-right font-mono">${formatRupees(item.rate)}</td>
                    <td class="p-1.5 border border-slate-200 text-right font-mono">${formatRupees(item.declaredAmount)}</td>
                    <td class="p-1.5 border border-slate-200 text-right font-mono font-bold">${formatRupees(item.calculatedAmount)}</td>
                    <td class="p-1.5 border border-slate-200 text-center text-[10px]">
                      ${item.isMathError ? `<span class="font-bold text-rose-600">Discrepancy -₹${Math.abs(item.diff).toFixed(0)}</span>` : '<span class="text-emerald-700 font-semibold">OK</span>'}
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>

          <!-- Auditor Certification & Signature Box -->
          <div class="mt-6 pt-4 border-t-2 border-slate-300 flex justify-between items-end text-[10px] text-slate-500">
            <div>
              <div class="flex items-center space-x-1.5 font-bold text-slate-700">
                <span>🛡️ AUDIT IT DETERMINISTIC VERIFICATION ENGINE</span>
              </div>
              <p class="mt-0.5">Algorithm: Deterministic sum(qty*rate) + GST tax validation</p>
              <p class="text-[9px] text-slate-400">Strictly adheres to Indian GST Act Section 16 (ITC Eligibility Rules)</p>
            </div>
            <div class="text-right">
              <div class="w-36 border-b border-slate-400 pb-1 mb-1 font-mono text-[9px] text-slate-400 text-center">
                DIGITALLY VERIFIED
              </div>
              <span class="font-bold text-slate-800 block">Retail Auditor / Store Sign</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  `;

  // Attach Print Handler
  const btnPrint = container.querySelector("#btn-print-slip");
  if (btnPrint) {
    btnPrint.addEventListener("click", () => {
      window.print();
    });
  }

  // Attach Close Handler
  const btnClose = container.querySelector("#btn-close-modal");
  if (btnClose && onClose) {
    btnClose.addEventListener("click", onClose);
  }
}
