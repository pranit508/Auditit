// Component: Audit Scorecard & Interactive Line-Item Verification Panel
import { formatRupees, round2 } from "../utils/auditEngine.js";

export function renderAuditScorecard(container, invoice, audit, options = {}) {
  const { 
    onUpdateItem, 
    onAddItem, 
    onDeleteItem,
    onUpdateHeader,
    onAutoFixMath,
    onUpdateTaxSettings,
    onSubmitValidInputs,
    onCopyNote, 
    onOpenCaSlip, 
    onBack, 
    selectedItemId, 
    taxData, 
    onRefreshTaxAi,
    onSaveToLedger
  } = options;



  // Calculations gatekeeper disabled
  if (false && audit.isHalted) {
    const missingList = audit.missingOrUnclearInputs || [];
    container.innerHTML = `
      <div class="space-y-4">
        
        <!-- HALT BANNER -->
        <div class="bg-amber-50/95 border-2 border-amber-300 rounded-2xl p-5 sm:p-6 text-amber-950 shadow-sm space-y-4">
          <div class="flex items-start space-x-3.5">
            <div class="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-2xl shrink-0 shadow-sm">
              ⚠️
            </div>
            <div>
              <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-900 mb-1">
                Calculations Paused
              </span>
              <h3 class="text-base sm:text-lg font-black text-amber-950 tracking-tight">
                Valid Input Required Before Calculating
              </h3>
              <p class="text-xs text-amber-900 mt-1 leading-relaxed">
                Some details on this document are missing or illegible. To ensure 100% mathematical accuracy and avoid incorrect tax calculations, 
                please review your bill on the left and enter the valid numbers below:
              </p>
            </div>
          </div>

          <!-- MISSING / UNCLEAR FIELDS FORM -->
          <div class="bg-white p-4 sm:p-5 rounded-xl border border-amber-200 shadow-xs space-y-3.5 text-xs text-slate-800">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2">
              <span class="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Please Provide or Confirm ${missingList.length} Missing Detail(s):
              </span>
              <span class="text-[10px] text-amber-700 font-semibold">Zero Guesswork</span>
            </div>

            <div class="space-y-3" id="missing-inputs-form">
              ${missingList.map((m, idx) => `
                <div class="p-3 rounded-lg bg-amber-50/40 border border-amber-200 space-y-1.5" data-field-row="${m.field}">
                  <div class="flex items-center justify-between">
                    <label class="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                      <span class="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-mono">${idx + 1}</span>
                      <span>${m.label}</span>
                    </label>
                    ${m.isGstin ? `
                      <button type="button" class="btn-mark-unregistered text-[10px] font-bold text-emerald-700 hover:underline">
                        ✓ Mark as Unregistered (No GSTIN)
                      </button>
                    ` : ''}
                  </div>
                  
                  <p class="text-[11px] text-slate-500">${m.description}</p>

                  <div class="mt-1">
                    <input 
                      type="${m.isNumber || m.isItemRate || m.isItemQty ? 'number' : 'text'}" 
                      ${m.isNumber || m.isItemRate ? 'step="0.01"' : ''}
                      class="missing-input-field w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs font-mono text-slate-900 bg-white"
                      data-field="${m.field}"
                      data-item-index="${m.itemIndex !== undefined ? m.itemIndex : ''}"
                      value="${m.currentValue || ''}"
                      placeholder="${m.placeholder || 'Enter value...'}"
                    />
                  </div>
                </div>
              `).join("")}
            </div>

            <!-- Lock Explanation Notice -->
            <div class="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center space-x-2 text-[11px] text-slate-600">
              <span class="text-sm">🔒</span>
              <span>Calculations, discrepancies, and tax recommendations will calculate immediately after you submit valid inputs.</span>
            </div>

            <!-- Submit Button -->
            <div class="pt-2 flex flex-col sm:flex-row items-center gap-2">
              <button 
                id="btn-submit-valid-inputs" 
                class="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2"
              >
                <span>🚀 Confirm Inputs & Calculate Audit</span>
              </button>

              <button 
                id="btn-back-dashboard-halt" 
                class="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-all"
              >
                ← Back
              </button>
            </div>

          </div>

        </div>

      </div>
    `;

    // Handle Mark as Unregistered
    container.querySelectorAll(".btn-mark-unregistered").forEach(btn => {
      btn.addEventListener("click", () => {
        const gstinInput = container.querySelector(`input[data-field="gstin"]`);
        if (gstinInput) {
          gstinInput.value = "UNREGISTERED";
          gstinInput.classList.add("bg-emerald-50", "text-emerald-800", "font-bold");
        }
      });
    });

    // Handle Submit
    const btnSubmit = container.querySelector("#btn-submit-valid-inputs");
    if (btnSubmit && onSubmitValidInputs) {
      btnSubmit.addEventListener("click", () => {
        const fields = {};
        container.querySelectorAll(".missing-input-field").forEach(inp => {
          const field = inp.getAttribute("data-field");
          const itemIdx = inp.getAttribute("data-item-index");
          const val = inp.value.trim();
          fields[field] = { value: val, itemIndex: itemIdx !== '' ? parseInt(itemIdx, 10) : null };
        });
        onSubmitValidInputs(fields);
      });
    }

    const btnBackHalt = container.querySelector("#btn-back-dashboard-halt");
    if (btnBackHalt && onBack) {
      btnBackHalt.addEventListener("click", onBack);
    }
    return;
  }

  const isOvercharge = audit.hasTotalDiscrepancy;
  const isClean = audit.status === "VERIFIED";
  const isWarning = audit.status === "REVIEW_NEEDED";

  const { audit_summary, calculated_tax, ai_suggestions } = taxData || {
    audit_summary: {
      total_turnover: 3600000,
      deemed_profit: 244800,
      eligible_itc: audit.gstinValid ? audit.totalTax : 0,
      disallowed_itc: !audit.gstinValid ? audit.totalTax : 0,
      invoices_missing_gstin: audit.gstinValid ? 0 : 1,
      digital_ratio: 0.60
    },
    calculated_tax: {
      recommended_form: "ITR-4 (Presumptive Scheme - Sec 44AD)",
      annual_turnover: 3600000,
      digital_percent: 60,
      cash_percent: 40,
      deemed_net_profit: 244800,
      estimated_tax_liability: 0,
      tax_regime: "New Regime (Section 115BAC)"
    },
    ai_suggestions: {
      suggestions: [
        "Recommended ITR Form: File ITR-4 Sugam under Section 44AD presumptive scheme because your retail turnover is within ₹2-3 Crores, allowing you to declare deemed profit without maintaining formal books.",
        audit.gstinValid 
          ? `GST ITC Opportunity / Risk: You have ${formatRupees(audit.totalTax)} in eligible Input Tax Credit from this bill to directly offset your GST liability.`
          : `GST ITC Opportunity / Risk: Missing supplier GSTIN blocks ${formatRupees(audit.totalTax)} in Input Tax Credit. Request a valid GSTIN bill to avoid higher tax outgo.`,
        "Advance Tax & Action Item: Remind yourself to pay 100% of your advance tax by March 15 to avoid penal interest under Section 234B/234C."
      ],
      disclaimer: "Not tax advice; verify with your CA.",
      isAiGenerated: false
    }
  };

  container.innerHTML = `
    <div class="space-y-4">

      <!-- VERDICT HEADER BANNER -->
      <div class="rounded-xl p-4 sm:p-5 border transition-all ${
        isOvercharge 
          ? 'bg-rose-50/90 border-rose-200 text-rose-950 shadow-sm'
          : isWarning
          ? 'bg-amber-50/90 border-amber-200 text-amber-950 shadow-sm'
          : 'bg-emerald-50/90 border-emerald-200 text-emerald-950 shadow-sm'
      }">
        <div class="flex items-start justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
              isOvercharge ? 'bg-rose-600 text-white shadow-rose-200 shadow' : isWarning ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white shadow-emerald-200 shadow'
            }">
              ${isOvercharge ? '!' : isWarning ? '?' : '✓'}
            </div>
            <div>
              <div class="text-xs uppercase tracking-wider font-bold ${
                isOvercharge ? 'text-rose-700' : isWarning ? 'text-amber-700' : 'text-emerald-700'
              }">Audit Verdict / अंतिम परिणाम</div>
              <h3 class="text-lg sm:text-xl font-extrabold tracking-tight">
                ${audit.statusText}
              </h3>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            ${isOvercharge ? `
              <button id="btn-autofix-math" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-rose-700 border border-rose-300 shadow-xs hover:bg-rose-100 transition-all flex items-center space-x-1" title="Automatically correct declared total to match verified sum">
                <span>🪄 Auto-Fix Bill Math</span>
              </button>
            ` : ''}

            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
              isOvercharge ? 'bg-rose-100 text-rose-800' : isWarning ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
            }">
              ${audit.status}
            </span>
          </div>
        </div>

        <!-- Discrepancy Difference Callout -->
        ${isOvercharge ? `
          <div class="mt-3.5 pt-3 border-t border-rose-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p class="text-xs text-rose-800 font-medium leading-relaxed">
              <strong>Calculated vs Declared Difference:</strong> You are being billed <span class="underline decoration-rose-500 font-bold">${formatRupees(Math.abs(audit.totalDiff))}</span> more than the verified sum of goods and taxes.
            </p>
            <div class="flex items-center space-x-2 shrink-0">
              <button id="btn-quick-copy" class="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow transition-all active:scale-95">
                <span>📋 Copy Note</span>
              </button>
              <button id="btn-quick-wa" class="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow transition-all active:scale-95">
                <span>📲 WhatsApp</span>
              </button>
            </div>
          </div>
        ` : ''}

        ${isClean ? `
          <div class="mt-2.5 pt-2 border-t border-emerald-200/80 text-xs text-emerald-800 font-medium">
            ✅ Every line item (Qty × Rate) and GST amount matches the declared grand total perfectly. Safe to clear payment.
          </div>
        ` : ''}

        ${isWarning ? `
          <div class="mt-2.5 pt-2 border-t border-amber-200/80 text-xs text-amber-800 font-medium">
            ⚠️ Review needed: Missing supplier GSTIN blocks Input Tax Credit (ITC), or blurry rate fields require your manual check.
          </div>
        ` : ''}
      </div>

      <!-- THREE-METRIC COMPARISON CARD -->
      <div class="grid grid-cols-3 gap-2.5 sm:gap-3">
        <div class="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-sm text-center">
          <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Billed on Invoice</span>
          <span class="text-sm sm:text-base font-extrabold font-mono text-slate-800 block mt-0.5">
            ${formatRupees(audit.total_declared)}
          </span>
          <span class="text-[9px] text-slate-400">परचे पर कुल</span>
        </div>

        <div class="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-sm text-center">
          <span class="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider block">Verified Total</span>
          <span class="text-sm sm:text-base font-extrabold font-mono text-emerald-700 block mt-0.5">
            ${formatRupees(audit.calculated_total)}
          </span>
          <span class="text-[9px] text-slate-400">सत्यापित योग</span>
        </div>

        <div class="bg-white p-3 sm:p-3.5 rounded-xl border ${audit.hasTotalDiscrepancy ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200'} shadow-sm text-center">
          <span class="text-[10px] font-semibold ${audit.hasTotalDiscrepancy ? 'text-rose-600' : 'text-slate-500'} uppercase tracking-wider block">Difference</span>
          <span class="text-sm sm:text-base font-extrabold font-mono ${audit.hasTotalDiscrepancy ? 'text-rose-600' : 'text-slate-700'} block mt-0.5">
            ${audit.totalDiff > 0 ? '+' : ''}${formatRupees(audit.totalDiff)}
          </span>
          <span class="text-[9px] text-slate-400">${audit.hasTotalDiscrepancy ? 'Overcharge' : 'No diff'}</span>
        </div>
      </div>

      <!-- REAL-TIME EDITABLE BILL HEADERS (Vendor, GSTIN, Billed Total) -->
      <div class="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm space-y-2.5">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Bill Header Inputs (Real-Time Edit)</span>
          <span class="text-[10px] text-slate-400">Updates bill & audit instantly</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <!-- Supplier Name -->
          <div>
            <label class="block text-[10px] font-semibold text-slate-500 mb-1">Supplier Name</label>
            <input 
              type="text" 
              id="input-vendor-name"
              value="${invoice.vendor_name || ''}"
              placeholder="e.g. Sharma Wholesale"
              class="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <!-- Supplier GSTIN -->
          <div>
            <label class="block text-[10px] font-semibold text-slate-500 mb-1 flex items-center justify-between">
              <span>Supplier GSTIN (15-Char)</span>
              <span class="font-bold text-[9px] ${audit.gstinValid ? 'text-emerald-600' : 'text-amber-600'}">
                ${audit.gstinValid ? '✓ Valid' : '⚠️ Missing / Invalid'}
              </span>
            </label>
            <input 
              type="text" 
              id="input-gstin"
              value="${invoice.gstin || ''}"
              maxlength="15"
              placeholder="e.g. 07AAAAA0000A1Z5"
              class="w-full px-2.5 py-1.5 rounded-lg border ${audit.gstinValid ? 'border-slate-300' : 'border-amber-400 bg-amber-50/50'} text-xs font-mono uppercase text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <!-- Declared Grand Total -->
          <div>
            <label class="block text-[10px] font-semibold text-slate-500 mb-1 flex items-center justify-between">
              <span>Billed Grand Total (₹)</span>
              ${audit.hasTotalDiscrepancy ? `<span class="text-rose-600 font-bold text-[9px]">Diff: ${formatRupees(audit.totalDiff)}</span>` : ''}
            </label>
            <input 
              type="number" 
              step="0.01"
              id="input-total-declared"
              value="${invoice.total_declared || 0}"
              class="w-full px-2.5 py-1.5 rounded-lg border ${audit.hasTotalDiscrepancy ? 'border-rose-400 bg-rose-50/40 text-rose-700 font-bold' : 'border-slate-300 text-slate-800'} text-xs font-mono text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      <!-- EDITABLE LINE-ITEMS AUDIT TABLE -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="text-xs font-bold text-slate-700 uppercase tracking-wider">Item Breakdown & Math Check</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-mono font-semibold">${invoice.items.length} items</span>
          </div>

          <div class="flex items-center space-x-2">
            <button 
              id="btn-add-item" 
              class="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center space-x-1 transition-all"
            >
              <span>➕ Add Line Item</span>
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-100/60 text-slate-500 font-semibold uppercase text-[10px] border-b border-slate-200">
                <th class="py-2 pl-3">Item Description</th>
                <th class="py-2 text-right w-16">Qty</th>
                <th class="py-2 text-right w-20">Rate (₹)</th>
                <th class="py-2 text-right w-24">Billed (₹)</th>
                <th class="py-2 text-right w-24">Verified (₹)</th>
                <th class="py-2 text-center w-16">Status</th>
                <th class="py-2 pr-2 text-center w-10">Del</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${audit.lineItemAudit.map((item, idx) => {
                const isSelected = selectedItemId === (item.id || idx.toString());
                const isErr = item.isMathError;
                const isBlurry = item.is_blurry;

                return `
                  <tr class="transition-colors ${
                    isErr 
                      ? 'bg-rose-50/60 hover:bg-rose-100/50' 
                      : isBlurry 
                      ? 'bg-amber-50/60 hover:bg-amber-100/50' 
                      : isSelected 
                      ? 'bg-indigo-50/60 hover:bg-indigo-100/50' 
                      : 'hover:bg-slate-50'
                  }" id="scorecard-row-${item.id || idx}">
                    
                    <td class="py-2 pl-3">
                      <input 
                        type="text" 
                        value="${item.description || ''}"
                        placeholder="Item name"
                        class="w-full px-1.5 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-emerald-500 text-xs font-semibold text-slate-800 bg-transparent"
                        data-action="edit-desc"
                        data-index="${idx}"
                      />
                      ${item.hsn ? `<span class="text-[10px] font-mono text-slate-400 block px-1.5">HSN: ${item.hsn}</span>` : ''}
                      ${isErr ? `<div class="text-[10px] text-rose-700 font-medium px-1.5 mt-0.5">⚠️ Expected: ${item.qty} × ${formatRupees(item.rate)} = ${formatRupees(item.calculatedAmount)}</div>` : ''}
                    </td>

                    <!-- Editable Qty -->
                    <td class="py-2 text-right font-mono">
                      <input 
                        type="number" 
                        step="1"
                        min="0"
                        value="${item.qty}"
                        class="w-14 text-right px-1.5 py-1 rounded border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono text-xs bg-white text-slate-800"
                        data-action="edit-qty"
                        data-index="${idx}"
                      />
                    </td>

                    <!-- Editable Rate -->
                    <td class="py-2 text-right font-mono">
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        value="${item.rate}"
                        class="w-20 text-right px-1.5 py-1 rounded border ${isBlurry ? 'border-amber-400 bg-amber-50' : 'border-slate-300'} focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono text-xs text-slate-800"
                        data-action="edit-rate"
                        data-index="${idx}"
                      />
                    </td>

                    <!-- Billed Amount -->
                    <td class="py-2 text-right font-mono font-medium ${isErr ? 'text-rose-600 font-bold' : 'text-slate-700'}">
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        value="${item.declaredAmount}"
                        class="w-20 text-right px-1.5 py-1 rounded border ${isErr ? 'border-rose-300 bg-rose-50/50 text-rose-700 font-bold' : 'border-slate-300 text-slate-800'} font-mono text-xs"
                        data-action="edit-amount"
                        data-index="${idx}"
                      />
                    </td>

                    <!-- Verified Calculated Amount -->
                    <td class="py-2 text-right font-mono font-bold ${isErr ? 'text-emerald-700' : 'text-slate-900'}">
                      ${formatRupees(item.calculatedAmount)}
                    </td>

                    <!-- Status Pill -->
                    <td class="py-2 text-center">
                      ${isErr ? `
                        <span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                          -₹${Math.abs(item.diff).toFixed(0)}
                        </span>
                      ` : isBlurry ? `
                        <span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                          Unclear
                        </span>
                      ` : `
                        <span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                          Match
                        </span>
                      `}
                    </td>

                    <!-- Delete Row Button -->
                    <td class="py-2 pr-2 text-center">
                      <button 
                        data-action="delete-item" 
                        data-index="${idx}"
                        class="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-100 transition-colors"
                        title="Delete this line item"
                      >
                        ✕
                      </button>
                    </td>

                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAX BREAKDOWN & GST PRESETS -->
      <div class="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="text-[11px] font-bold text-slate-700 uppercase tracking-wider">GST Tax Rate & Split</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${((invoice.gstin || '06').slice(0, 2) === (invoice.buyer_gstin || '06').slice(0, 2)) ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}">
              ${((invoice.gstin || '06').slice(0, 2) === (invoice.buyer_gstin || '06').slice(0, 2)) ? `Intra-State (${(invoice.gstin || '06').slice(0, 2)}=${(invoice.buyer_gstin || '06').slice(0, 2)})` : `Inter-State (${(invoice.gstin || '06').slice(0, 2)}≠${(invoice.buyer_gstin || '06').slice(0, 2)})`}
            </span>
          </div>
          <span class="text-xs font-mono font-bold text-emerald-700">Total Tax: ${formatRupees(audit.totalTax)}</span>
        </div>

        <!-- Quick GST Rate Presets -->
        <div class="flex flex-wrap items-center gap-1.5 text-xs">
          <span class="text-[10px] text-slate-500 font-medium">Quick GST Rates:</span>
          <button data-gst-preset="0" class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]">0% (Exempt)</button>
          <button data-gst-preset="5" class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]">5% (Grocery/Atta)</button>
          <button data-gst-preset="12" class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]">12% (Standard)</button>
          <button data-gst-preset="18" class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]">18% (Electrical)</button>
          <button data-gst-preset="28" class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]">28% (Luxury)</button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs pt-1">
          <div>
            <label class="block text-[10px] font-semibold text-slate-500 mb-1">CGST (Intra-State) ₹</label>
            <input 
              type="number" 
              step="0.01" 
              id="input-cgst" 
              value="${invoice.cgst || 0}"
              class="w-full px-2 py-1.5 rounded-lg border border-slate-300 font-mono text-xs text-right text-slate-800"
            />
          </div>
          <div>
            <label class="block text-[10px] font-semibold text-slate-500 mb-1">SGST (Intra-State) ₹</label>
            <input 
              type="number" 
              step="0.01" 
              id="input-sgst" 
              value="${invoice.sgst || 0}"
              class="w-full px-2 py-1.5 rounded-lg border border-slate-300 font-mono text-xs text-right text-slate-800"
            />
          </div>
          <div>
            <label class="block text-[10px] font-semibold text-slate-500 mb-1">IGST (Inter-State) ₹</label>
            <input 
              type="number" 
              step="0.01" 
              id="input-igst" 
              value="${invoice.igst || 0}"
              class="w-full px-2 py-1.5 rounded-lg border border-slate-300 font-mono text-xs text-right text-slate-800"
            />
          </div>
        </div>
      </div>

      <!-- ACTION BUTTONS -->
      <div class="flex flex-col sm:flex-row items-center gap-2 pt-2">
        <button id="btn-save-to-ledger" class="w-full sm:flex-1 flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow transition-all active:scale-95">
          <span>💾 Save Bill to Tax Ledger</span>
        </button>

        <button id="btn-copy-discrepancy" class="w-full sm:flex-1 flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow transition-all active:scale-95">
          <span>📋 Copy Note</span>
        </button>

        <button id="btn-share-whatsapp" class="w-full sm:flex-1 flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow transition-all active:scale-95">
          <span>📲 WhatsApp</span>
        </button>

        <button id="btn-open-ca-slip" class="w-full sm:flex-1 flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold shadow transition-all active:scale-95">
          <span>📑 CA Slip</span>
        </button>

        <button id="btn-back-dashboard" class="w-full sm:w-auto px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-all">
          <span>← Back</span>
        </button>
      </div>

    </div>
  `;

  // Attach event handlers
  const btnQuickCopy = container.querySelector("#btn-quick-copy");
  if (btnQuickCopy && onCopyNote) {
    btnQuickCopy.addEventListener("click", onCopyNote);
  }

  const btnCopy = container.querySelector("#btn-copy-discrepancy");
  if (btnCopy && onCopyNote) {
    btnCopy.addEventListener("click", onCopyNote);
  }

  const btnShareWa = container.querySelector("#btn-share-whatsapp");
  const btnQuickWa = container.querySelector("#btn-quick-wa");
  const handleWa = () => {
    const text = container.querySelector("#btn-copy-discrepancy") ? onCopyNote(true) : "";
  };
  if (btnShareWa && onCopyNote) {
    btnShareWa.addEventListener("click", () => onCopyNote(true));
  }
  if (btnQuickWa && onCopyNote) {
    btnQuickWa.addEventListener("click", () => onCopyNote(true));
  }

  const btnCaSlip = container.querySelector("#btn-open-ca-slip");
  if (btnCaSlip && onOpenCaSlip) {
    btnCaSlip.addEventListener("click", onOpenCaSlip);
  }

  const btnSaveLedger = container.querySelector("#btn-save-to-ledger");
  if (btnSaveLedger && onSaveToLedger) {
    btnSaveLedger.addEventListener("click", () => onSaveToLedger(invoice, audit));
  }

  const btnBack = container.querySelector("#btn-back-dashboard");
  if (btnBack && onBack) {
    btnBack.addEventListener("click", onBack);
  }

  const btnAddItem = container.querySelector("#btn-add-item");
  if (btnAddItem && onAddItem) {
    btnAddItem.addEventListener("click", onAddItem);
  }

  const btnAutoFix = container.querySelector("#btn-autofix-math");
  if (btnAutoFix && onAutoFixMath) {
    btnAutoFix.addEventListener("click", onAutoFixMath);
  }

  // Header real-time updates
  const inputVendor = container.querySelector("#input-vendor-name");
  const inputGstin = container.querySelector("#input-gstin");
  const inputTotalDeclared = container.querySelector("#input-total-declared");

  if (inputVendor && onUpdateHeader) {
    inputVendor.addEventListener("input", (e) => onUpdateHeader("vendor_name", e.target.value));
  }
  if (inputGstin && onUpdateHeader) {
    inputGstin.addEventListener("input", (e) => onUpdateHeader("gstin", e.target.value.trim().toUpperCase()));
  }
  if (inputTotalDeclared && onUpdateHeader) {
    inputTotalDeclared.addEventListener("input", (e) => onUpdateHeader("total_declared", parseFloat(e.target.value) || 0));
  }

  // Tax inputs (CGST, SGST, IGST)
  const inputCgst = container.querySelector("#input-cgst");
  const inputSgst = container.querySelector("#input-sgst");
  const inputIgst = container.querySelector("#input-igst");

  if (inputCgst && onUpdateHeader) {
    inputCgst.addEventListener("input", (e) => onUpdateHeader("cgst", parseFloat(e.target.value) || 0));
  }
  if (inputSgst && onUpdateHeader) {
    inputSgst.addEventListener("input", (e) => onUpdateHeader("sgst", parseFloat(e.target.value) || 0));
  }
  if (inputIgst && onUpdateHeader) {
    inputIgst.addEventListener("input", (e) => onUpdateHeader("igst", parseFloat(e.target.value) || 0));
  }

  // GST Presets: Click Handler Sync with Intra-State vs Inter-State Auto-Determination
  container.querySelectorAll("[data-gst-preset]").forEach(btn => {
    btn.addEventListener("click", () => {
      const presetAttr = btn.getAttribute("data-gst-preset");
      const ratePct = parseFloat(presetAttr) / 100;
      // Recalculate dynamically based on current Subtotal (e.g. 11,000)
      const subtotal = round2(Number(invoice.subtotal) || Number(invoice.calculated_subtotal) || audit.sum_items || 0);

      // Compare first 2 digits of Supplier GSTIN (06) and Buyer GSTIN (06)
      const supplierGstin = (invoice.gstin || "").trim().toUpperCase();
      const buyerGstin = (invoice.buyer_gstin || "06CORPP2712A1Z1").trim().toUpperCase();
      const supplierState = supplierGstin ? supplierGstin.slice(0, 2) : "06";
      const buyerState = buyerGstin ? buyerGstin.slice(0, 2) : "06";
      const isIntraState = supplierState === buyerState;

      let newCgst = 0;
      let newSgst = 0;
      let newIgst = 0;

      if (presetAttr === "18" || ratePct === 0.18) {
        if (isIntraState) {
          // Clicking '[18% (Electrical)]' should immediately set:
          // cgst = subtotal * 0.09;
          // sgst = subtotal * 0.09;
          // igst = 0;
          newCgst = round2(subtotal * 0.09);
          newSgst = round2(subtotal * 0.09);
          newIgst = 0;
        } else {
          newCgst = 0;
          newSgst = 0;
          newIgst = round2(subtotal * 0.18);
        }
      } else {
        const taxAmount = round2(subtotal * ratePct);
        if (isIntraState) {
          newIgst = 0;
          newCgst = round2(taxAmount / 2);
          newSgst = round2(taxAmount / 2);
        } else {
          newCgst = 0;
          newSgst = 0;
          newIgst = taxAmount;
        }
      }

      // Update inputs immediately for instant sync
      if (inputCgst) inputCgst.value = newCgst;
      if (inputSgst) inputSgst.value = newSgst;
      if (inputIgst) inputIgst.value = newIgst;

      // Trigger re-audit immediately so Verified Total becomes 12,980.00
      if (onUpdateHeader) {
        onUpdateHeader("gst_preset", { cgst: newCgst, sgst: newSgst, igst: newIgst });
      }
    });
  });

  // Handle line item edits & delete
  container.querySelectorAll("input[data-action]").forEach(input => {
    input.addEventListener("input", (e) => {
      const idx = parseInt(e.target.getAttribute("data-index"), 10);
      const action = e.target.getAttribute("data-action");
      const val = action === "edit-desc" ? e.target.value : (parseFloat(e.target.value) || 0);

      if (onUpdateItem) {
        onUpdateItem(idx, action, val);
      }
    });
  });

  container.querySelectorAll("button[data-action='delete-item']").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(btn.getAttribute("data-index"), 10);
      if (onDeleteItem) {
        onDeleteItem(idx);
      }
    });
  });
}
