// Component: TaxAndITRTab (Tab 2: Stored Bills Tax Ledger & Accumulative Tax Engine)
import { formatRupees, round2 } from "../utils/auditEngine.js";

/**
 * Renders the full business tax ledger and accumulative tax engine
 * @param {HTMLElement} container
 * @param {Object} props
 */
export function renderTaxAndITRTab(container, props = {}) {
  const { 
    savedBills = [], 
    currentInvoice = null,
    currentAudit = null,
    state = {}, 
    onUpdateState,
    onViewBill,
    onDeleteBill,
    onClearBills,
    onSaveCurrentBill
  } = props;

  const formatWhole = (num) => "₹" + Math.round(Number(num) || 0).toLocaleString("en-IN");
  const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

  const bills = Array.isArray(savedBills) ? savedBills : [];
  const totalBillsCount = bills.length;

  // A. Aggregated Stored Bills Metrics
  const totalPurchases = round2(bills.reduce((sum, b) => sum + (Number(b.subtotal) || 0), 0));
  const totalCgstPool = round2(bills.reduce((sum, b) => sum + (Number(b.cgst) || 0), 0));
  const totalSgstPool = round2(bills.reduce((sum, b) => sum + (Number(b.sgst) || 0), 0));
  const totalIgstPool = round2(bills.reduce((sum, b) => sum + (Number(b.igst) || 0), 0));
  const totalClaimableITC = round2(totalCgstPool + totalSgstPool + totalIgstPool);
  const totalVerifiedBilled = round2(bills.reduce((sum, b) => sum + (Number(b.verified_total) || 0), 0));

  // Statutory Compliance Check
  const invalidGstinBills = bills.filter(b => {
    const g = (b.gstin || "").trim().toUpperCase();
    return !g || g === "MISSING" || !GSTIN_REGEX.test(g);
  });
  const hasGstinIssues = invalidGstinBills.length > 0;
  const invalidGstinITC = round2(invalidGstinBills.reduce((sum, b) => sum + (Number(b.total_tax) || (Number(b.cgst)||0) + (Number(b.sgst)||0) + (Number(b.igst)||0)), 0));

  // C. Annual Business & ITR Calculator (ITR-4 / ITR-3)
  const annualTurnover = Math.max(0, Number(state.annualTurnover !== undefined ? state.annualTurnover : 3000000));
  const calcMode = state.calcMode || '44AD'; // '44AD' | 'REGULAR'
  const digitalShare = state.digitalShare !== undefined ? Number(state.digitalShare) : 80;
  const cashShare = Math.max(0, 100 - digitalShare);
  const digitalRate = state.digitalRate !== undefined ? Number(state.digitalRate) : 6.0;
  const cashRate = state.cashRate !== undefined ? Number(state.cashRate) : 8.0;

  // Purchase costs: auto-populated from Total Purchases across saved bills (unless custom overridden)
  const purchaseCosts = state.customPurchaseCosts !== null && state.customPurchaseCosts !== undefined
    ? Number(state.customPurchaseCosts)
    : totalPurchases;
  const operatingExpenses = Math.max(0, Number(state.operatingExpenses !== undefined ? state.operatingExpenses : 450000));

  let netTaxableProfit = 0;
  let digitalSales = 0;
  let cashSales = 0;
  let digitalProfit = 0;
  let cashProfit = 0;
  let totalExpensesRegular = 0;

  if (calcMode === '44AD') {
    digitalSales = round2(annualTurnover * (digitalShare / 100));
    cashSales = round2(annualTurnover * (cashShare / 100));
    digitalProfit = round2(digitalSales * (digitalRate / 100));
    cashProfit = round2(cashSales * (cashRate / 100));
    netTaxableProfit = round2(digitalProfit + cashProfit);
  } else {
    totalExpensesRegular = round2(purchaseCosts + operatingExpenses);
    netTaxableProfit = Math.max(0, round2(annualTurnover - totalExpensesRegular));
  }

  // New Tax Regime Slabs & 87A Full Rebate
  const standardDeduction = 75000;
  const netTaxableIncome = Math.max(0, round2(netTaxableProfit - standardDeduction));

  let baseTax = 0;
  if (netTaxableIncome > 300000) {
    if (netTaxableIncome <= 700000) {
      baseTax = (netTaxableIncome - 300000) * 0.05;
    } else if (netTaxableIncome <= 1000000) {
      baseTax = 20000 + (netTaxableIncome - 700000) * 0.10;
    } else if (netTaxableIncome <= 1200000) {
      baseTax = 50000 + (netTaxableIncome - 1000000) * 0.15;
    } else if (netTaxableIncome <= 1500000) {
      baseTax = 80000 + (netTaxableIncome - 1200000) * 0.20;
    } else {
      baseTax = 140000 + (netTaxableIncome - 1500000) * 0.30;
    }
  }
  baseTax = round2(baseTax);

  const isRebateEligible = netTaxableIncome <= 700000;
  const rebate87a = isRebateEligible ? baseTax : 0;
  const taxAfterRebate = Math.max(0, round2(baseTax - rebate87a));
  const cess = round2(taxAfterRebate * 0.04);
  const totalTaxPayable = round2(taxAfterRebate + cess);

  // Section 44AB Tax Audit Check
  let isAuditRequired = false;
  let auditRuleMessage = "";
  if (calcMode === '44AD') {
    const auditLimit = digitalShare >= 95 ? 30000000 : 20000000;
    isAuditRequired = annualTurnover > auditLimit;
    auditRuleMessage = isAuditRequired 
      ? `Turnover exceeds ₹${(auditLimit/10000000).toFixed(0)} Crore limit. Tax Audit is mandatory under Section 44AB.`
      : `Turnover is within ₹${(auditLimit/10000000).toFixed(0)} Crore limit. Exempt from Section 44AB Tax Audit.`;
  } else {
    const auditLimit = digitalShare >= 95 ? 100000000 : 10000000;
    isAuditRequired = annualTurnover > auditLimit;
    auditRuleMessage = isAuditRequired
      ? `Turnover exceeds ₹${(auditLimit/10000000).toFixed(0)} Crore limit. Tax Audit is mandatory under Section 44AB.`
      : `Turnover is within ₹${(auditLimit/10000000).toFixed(0)} Crore limit. Exempt from Section 44AB Tax Audit.`;
  }

  container.innerHTML = `
    <div class="space-y-6">

      <!-- TOP HEADER & DATA MANAGEMENT BAR -->
      <div class="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-md border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center space-x-2.5">
            <span class="text-2xl">📊</span>
            <div>
              <div class="flex items-center space-x-2">
                <h3 class="text-base sm:text-lg font-black tracking-tight text-white">Stored Bills Tax Ledger & ITR Engine</h3>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                  GSTR-3B & Sec 44AD
                </span>
              </div>
              <p class="text-xs text-slate-300 mt-0.5">
                Accumulative verified bills ledger, accumulated GST ITC pool, and real-time business ITR tax planning.
              </p>
            </div>
          </div>
        </div>

        <!-- Action & Export Buttons -->
        <div class="flex items-center flex-wrap gap-2">
          ${currentInvoice ? `
            <button 
              id="btn-save-current-from-tab2" 
              class="inline-flex items-center space-x-1 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow transition-all active:scale-95"
              title="Add current verified invoice into ledger"
            >
              <span>💾 Save Current Bill to Ledger</span>
            </button>
          ` : ''}

          <button 
            id="btn-export-consolidated-csv" 
            class="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition-all active:scale-95"
            title="Export Consolidated CSV"
          >
            <span>📥 Export Consolidated Tax & ITC (CSV)</span>
          </button>

          <button 
            id="btn-print-consolidated-sheet" 
            class="inline-flex items-center space-x-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-semibold shadow transition-all active:scale-95"
            title="Print or Save PDF"
          >
            <span>🖨️ Print / PDF</span>
          </button>

          ${bills.length > 0 ? `
            <button 
              id="btn-clear-all-bills" 
              class="inline-flex items-center space-x-1 px-3 py-2 rounded-xl bg-rose-900/40 hover:bg-rose-900/70 text-rose-300 border border-rose-700/60 text-xs font-semibold shadow transition-all active:scale-95"
              title="Clear all stored bills"
            >
              <span>🗑️ Clear Ledger</span>
            </button>
          ` : ''}
        </div>
      </div>

      <!-- SECTION A: SUMMARY BAR ACROSS ALL STORED BILLS -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        
        <!-- Summary Card 1: Total Bills Verified -->
        <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Bills Verified</span>
            <div class="text-2xl font-black text-slate-900 font-mono mt-1">
              ${totalBillsCount}
            </div>
            <span class="text-[10px] text-slate-400">Stored in Business Ledger</span>
          </div>
          <div class="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-lg">
            🧾
          </div>
        </div>

        <!-- Summary Card 2: Total Purchase Expenditure (COGS) -->
        <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Purchases (COGS)</span>
            <div class="text-2xl font-black text-slate-900 font-mono mt-1">
              ${formatRupees(totalPurchases)}
            </div>
            <span class="text-[10px] text-slate-400">Taxable Subtotal of Stored Bills</span>
          </div>
          <div class="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-lg">
            📦
          </div>
        </div>

        <!-- Summary Card 3: Total Claimable GST ITC -->
        <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Claimable GST ITC</span>
            <div class="text-2xl font-black text-emerald-700 font-mono mt-1">
              ${formatRupees(totalClaimableITC)}
            </div>
            <span class="text-[10px] text-slate-400">Eligible GSTR-3B Tax Offset</span>
          </div>
          <div class="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-lg">
            💳
          </div>
        </div>

      </div>

      <!-- SECTION B: AGGREGATED GST ITC LEDGER (GSTR-3B PREPARATION) -->
      <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div class="flex items-center space-x-2">
            <span class="text-lg">🏛️</span>
            <div>
              <h4 class="text-sm font-extrabold text-slate-900">B. Aggregated GST ITC Ledger (GSTR-3B Preparation)</h4>
              <p class="text-[11px] text-slate-500">Accumulated input tax credit available for offsetting against output tax liability</p>
            </div>
          </div>
          <span class="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
            Total Claimable Pool: ${formatRupees(totalClaimableITC)}
          </span>
        </div>

        <!-- 3 POOL CARDS: CGST, SGST, IGST -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Accumulated CGST Pool</span>
            <span class="text-lg sm:text-xl font-bold font-mono text-slate-800 block mt-1">${formatRupees(totalCgstPool)}</span>
            <span class="text-[10px] text-slate-400 mt-0.5 block">Central Tax Offset</span>
          </div>

          <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Accumulated SGST Pool</span>
            <span class="text-lg sm:text-xl font-bold font-mono text-slate-800 block mt-1">${formatRupees(totalSgstPool)}</span>
            <span class="text-[10px] text-slate-400 mt-0.5 block">State Tax Offset</span>
          </div>

          <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Accumulated IGST Pool</span>
            <span class="text-lg sm:text-xl font-bold font-mono text-slate-800 block mt-1">${formatRupees(totalIgstPool)}</span>
            <span class="text-[10px] text-slate-400 mt-0.5 block">Integrated Tax Offset</span>
          </div>
        </div>

        <!-- STATUTORY COMPLIANCE CHECK & 180-DAY TIMELINE REMINDER -->
        <div class="space-y-2 pt-1">
          ${hasGstinIssues ? `
            <div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start space-x-2.5">
              <span class="text-base shrink-0 mt-0.5">⚠️</span>
              <div>
                <strong class="font-bold">GSTIN Compliance Alert:</strong>
                <span>${invalidGstinBills.length} stored bill(s) have missing or unverified Supplier GSTIN format (${formatRupees(invalidGstinITC)} tax at risk). Under Section 16(2) of the CGST Act, ITC cannot be legally claimed without a valid supplier GSTIN!</span>
              </div>
            </div>
          ` : `
            <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center space-x-2">
              <span class="text-emerald-600 font-bold">✓</span>
              <span>All stored bills have valid, formatted Supplier GSTINs (100% compliant under Section 16).</span>
            </div>
          `}

          <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs flex items-start space-x-2.5">
            <span class="text-base shrink-0 mt-0.5">⏰</span>
            <div>
              <strong class="font-bold text-slate-900">Statutory 180-Day Rule (Section 16(2) CGST Act):</strong>
              <span class="text-[11px] block mt-0.5 text-slate-600 leading-relaxed">
                You must settle supplier payments within <strong>180 days</strong> from the invoice date. If unpaid after 180 days, the ITC claimed on those bills must be reversed in GSTR-3B with 18% penal interest.
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- SECTION A: STORED INVOICE BILLS TABLE -->
      <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div class="flex items-center space-x-2">
            <span class="text-lg">📁</span>
            <div>
              <h4 class="text-sm font-extrabold text-slate-900">A. Stored Verified Invoice Bills (${totalBillsCount})</h4>
              <p class="text-[11px] text-slate-500">Persistent business bills ledger saved from math verification</p>
            </div>
          </div>
        </div>

        ${bills.length === 0 ? `
          <div class="p-8 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 space-y-3">
            <span class="text-3xl block">📭</span>
            <div class="text-xs font-semibold text-slate-700">No verified bills saved to Tax Ledger yet.</div>
            <p class="text-[11px] text-slate-500 max-w-sm mx-auto">
              Open any bill in Tab 1 (Invoice Math Audit) and click <strong>[💾 Save Bill to Tax Ledger]</strong> to accumulate it here.
            </p>
            ${currentInvoice ? `
              <button 
                id="btn-save-current-empty" 
                class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow transition-all"
              >
                💾 Save Current Bill ("${currentInvoice.vendor_name || 'Bill'}") Now
              </button>
            ` : ''}
          </div>
        ` : `
          <!-- Bills Table -->
          <div class="overflow-x-auto rounded-xl border border-slate-200">
            <table class="w-full text-left text-xs font-mono">
              <thead class="bg-slate-50 text-slate-600 font-sans text-[11px] border-b border-slate-200">
                <tr>
                  <th class="px-3 py-2.5 font-bold">Date</th>
                  <th class="px-3 py-2.5 font-bold">Invoice No.</th>
                  <th class="px-3 py-2.5 font-bold">Supplier Name</th>
                  <th class="px-3 py-2.5 font-bold">GSTIN</th>
                  <th class="px-3 py-2.5 font-bold text-right">Subtotal (₹)</th>
                  <th class="px-2 py-2.5 font-bold text-right">CGST</th>
                  <th class="px-2 py-2.5 font-bold text-right">SGST</th>
                  <th class="px-2 py-2.5 font-bold text-right">IGST</th>
                  <th class="px-3 py-2.5 font-bold text-right">Verified Total</th>
                  <th class="px-3 py-2.5 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${bills.map((b, idx) => {
                  const gstinUpper = (b.gstin || "").trim().toUpperCase();
                  const isGstinValid = GSTIN_REGEX.test(gstinUpper);

                  return `
                    <tr class="hover:bg-slate-50/80 transition-colors">
                      <td class="px-3 py-2 font-medium text-slate-700 whitespace-nowrap">${b.date || '—'}</td>
                      <td class="px-3 py-2 font-bold text-indigo-700 whitespace-nowrap">${b.invoice_no || '—'}</td>
                      <td class="px-3 py-2 text-slate-800 font-sans max-w-[150px] truncate" title="${b.vendor_name || ''}">
                        ${b.vendor_name || 'Supplier'}
                      </td>
                      <td class="px-3 py-2 whitespace-nowrap">
                        <span class="text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          isGstinValid 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }">
                          ${b.gstin || 'MISSING'}
                        </span>
                      </td>
                      <td class="px-3 py-2 text-right font-medium text-slate-700">${formatRupees(b.subtotal)}</td>
                      <td class="px-2 py-2 text-right text-slate-600">${b.cgst > 0 ? formatRupees(b.cgst) : '—'}</td>
                      <td class="px-2 py-2 text-right text-slate-600">${b.sgst > 0 ? formatRupees(b.sgst) : '—'}</td>
                      <td class="px-2 py-2 text-right text-slate-600">${b.igst > 0 ? formatRupees(b.igst) : '—'}</td>
                      <td class="px-3 py-2 text-right font-bold text-slate-900">${formatRupees(b.verified_total)}</td>
                      <td class="px-3 py-2 text-center whitespace-nowrap space-x-1 font-sans">
                        <button 
                          data-action="view-bill" 
                          data-index="${idx}"
                          class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition-all"
                          title="Open this bill in Tab 1 (Invoice Math Audit)"
                        >
                          👁️ View
                        </button>
                        <button 
                          data-action="delete-bill" 
                          data-index="${idx}"
                          class="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] transition-all"
                          title="Delete bill from ledger"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
              <tfoot class="bg-slate-50 font-bold border-t-2 border-slate-200 text-slate-900">
                <tr>
                  <td colspan="4" class="px-3 py-2 font-sans text-xs">Total Stored Bills: ${totalBillsCount}</td>
                  <td class="px-3 py-2 text-right text-indigo-700 font-mono">${formatRupees(totalPurchases)}</td>
                  <td class="px-2 py-2 text-right text-slate-700 font-mono">${formatRupees(totalCgstPool)}</td>
                  <td class="px-2 py-2 text-right text-slate-700 font-mono">${formatRupees(totalSgstPool)}</td>
                  <td class="px-2 py-2 text-right text-slate-700 font-mono">${formatRupees(totalIgstPool)}</td>
                  <td class="px-3 py-2 text-right text-emerald-700 font-mono">${formatRupees(totalVerifiedBilled)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        `}
      </div>

      <!-- SECTION C: CUSTOMIZABLE ANNUAL BUSINESS & ITR CALCULATOR (ITR-4 / ITR-3) -->
      <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-5">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div class="flex items-center space-x-2">
            <span class="text-lg">⚖️</span>
            <div>
              <h4 class="text-sm font-extrabold text-slate-900">C. Annual Business & ITR Tax Planning (ITR-4 / ITR-3)</h4>
              <p class="text-[11px] text-slate-500">Live computation under New Tax Regime (FY 2025-26 / 2026-27)</p>
            </div>
          </div>
          <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
            ${calcMode === '44AD' ? 'Sec 44AD Presumptive' : 'Normal Business P&L'}
          </span>
        </div>

        <!-- Mode Toggle & Annual Turnover -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Annual Turnover Input -->
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">
              Annual Gross Sales / Turnover (₹):
            </label>
            <input 
              type="number"
              id="input-ledger-turnover"
              step="10000"
              value="${annualTurnover}"
              class="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <span class="text-[10px] text-slate-400 mt-1 block">Expected annual retail counter sales</span>
          </div>

          <!-- Scheme Toggle -->
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">
              ITR Filing Scheme:
            </label>
            <div class="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button 
                type="button"
                id="btn-ledger-mode-44ad"
                class="py-2 px-3 rounded-lg text-xs font-bold transition-all text-center ${
                  calcMode === '44AD' 
                    ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' 
                    : 'text-slate-600 hover:text-slate-900'
                }"
              >
                Presumptive (Sec 44AD)
              </button>
              <button 
                type="button"
                id="btn-ledger-mode-regular"
                class="py-2 px-3 rounded-lg text-xs font-bold transition-all text-center ${
                  calcMode === 'REGULAR' 
                    ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' 
                    : 'text-slate-600 hover:text-slate-900'
                }"
              >
                Normal P&L (ITR-3)
              </button>
            </div>
          </div>
        </div>

        <!-- MODE SPECIFIC INPUTS -->
        ${calcMode === '44AD' ? `
          <!-- SEC 44AD PRESUMPTIVE ENGINE -->
          <div class="p-4 rounded-xl bg-purple-50/50 border border-purple-200 space-y-4">
            <div class="flex justify-between items-center text-xs">
              <span class="font-bold text-purple-900">Digital / UPI Receipts Ratio:</span>
              <span class="font-mono font-bold text-purple-700">
                ${digitalShare}% Digital (UPI/Bank) • ${cashShare}% Cash
              </span>
            </div>

            <!-- Slider -->
            <input 
              type="range"
              id="slider-ledger-digital-share"
              min="0"
              max="100"
              step="5"
              value="${digitalShare}"
              class="w-full accent-purple-600 cursor-pointer"
            />

            <!-- Custom Profit Rates -->
            <div class="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <label class="text-slate-600 font-semibold block mb-1">Digital Profit Rate (%) <span class="text-emerald-600 font-normal">(Min 6%)</span>:</label>
                <input 
                  type="number"
                  id="input-ledger-digital-rate"
                  step="0.5"
                  value="${digitalRate}"
                  class="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-mono text-sm font-bold text-emerald-800"
                />
              </div>

              <div>
                <label class="text-slate-600 font-semibold block mb-1">Cash Profit Rate (%) <span class="text-amber-600 font-normal">(Min 8%)</span>:</label>
                <input 
                  type="number"
                  id="input-ledger-cash-rate"
                  step="0.5"
                  value="${cashRate}"
                  class="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-mono text-sm font-bold text-amber-800"
                />
              </div>
            </div>

            <!-- Calculation formula breakdown -->
            <div class="p-3 bg-white rounded-lg border border-purple-100 font-mono text-xs space-y-1">
              <div class="flex justify-between text-slate-600">
                <span>Digital Sales (${formatWhole(digitalSales)} × ${digitalRate}%):</span>
                <span class="font-bold text-emerald-700">${formatRupees(digitalProfit)}</span>
              </div>
              <div class="flex justify-between text-slate-600">
                <span>Cash Sales (${formatWhole(cashSales)} × ${cashRate}%):</span>
                <span class="font-bold text-amber-700">${formatRupees(cashProfit)}</span>
              </div>
              <div class="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-900 text-sm">
                <span>Deemed Business Net Profit:</span>
                <span class="text-purple-700">${formatRupees(netTaxableProfit)}</span>
              </div>
            </div>
          </div>
        ` : `
          <!-- NORMAL P&L (ITR-3) ENGINE -->
          <div class="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <!-- Purchase Costs (Auto-populated from Stored Bills Total) -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="font-bold text-slate-700">Cost of Goods / Purchase Costs (₹):</label>
                  <button 
                    type="button" 
                    id="btn-autofill-ledger-purchases"
                    class="text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200"
                    title="Populate from sum of stored bills subtotal"
                  >
                    ⚡ Auto-fill Ledger (${formatWhole(totalPurchases)})
                  </button>
                </div>
                <input 
                  type="number"
                  id="input-ledger-purchases"
                  step="1000"
                  value="${purchaseCosts}"
                  class="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-mono text-sm font-bold text-slate-900"
                />
              </div>

              <!-- Other Operating Expenses -->
              <div>
                <label class="font-bold text-slate-700 block mb-1">Other Operating Expenses (Rent, Power, Salaries) (₹):</label>
                <input 
                  type="number"
                  id="input-ledger-opex"
                  step="1000"
                  value="${operatingExpenses}"
                  class="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-mono text-sm font-bold text-slate-900"
                />
              </div>
            </div>

            <!-- Calculation formula breakdown -->
            <div class="p-3 bg-white rounded-lg border border-blue-100 font-mono text-xs space-y-1">
              <div class="flex justify-between text-slate-600">
                <span>Gross Annual Sales:</span>
                <span class="font-bold text-slate-900">${formatWhole(annualTurnover)}</span>
              </div>
              <div class="flex justify-between text-slate-600">
                <span>Less Total Expenses (${formatWhole(purchaseCosts)} + ${formatWhole(operatingExpenses)}):</span>
                <span class="font-bold text-rose-600">- ${formatRupees(totalExpensesRegular)}</span>
              </div>
              <div class="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-900 text-sm">
                <span>Net Taxable Business Profit:</span>
                <span class="text-blue-700">${formatRupees(netTaxableProfit)}</span>
              </div>
            </div>
          </div>
        `}

        <!-- LIVE TAX LIABILITY SUMMARY & SECTION 87A REBATE -->
        <div class="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-slate-700">New Tax Regime Computation (FY 2025-26):</span>
            <span class="font-mono text-emerald-700 font-bold">Standard Deduction: ₹75,000 auto-applied</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div class="p-2.5 rounded-lg bg-white border border-slate-200">
              <span class="text-[10px] text-slate-400 block uppercase font-sans">Net Taxable Income</span>
              <span class="text-base font-bold text-slate-900">${formatRupees(netTaxableIncome)}</span>
            </div>

            <div class="p-2.5 rounded-lg bg-white border border-slate-200">
              <span class="text-[10px] text-slate-400 block uppercase font-sans">Section 87A Tax Rebate</span>
              <span class="text-base font-bold ${isRebateEligible ? 'text-emerald-600' : 'text-slate-500'}">
                ${isRebateEligible ? `100% (- ${formatRupees(rebate87a)})` : 'None (Income > 7L)'}
              </span>
            </div>

            <div class="p-2.5 rounded-lg bg-white border border-slate-200">
              <span class="text-[10px] text-slate-400 block uppercase font-sans">Total Estimated Tax</span>
              <span class="text-base font-bold ${totalTaxPayable === 0 ? 'text-emerald-700' : 'text-slate-900'}">
                ${totalTaxPayable === 0 ? '₹0.00' : formatRupees(totalTaxPayable)}
              </span>
            </div>
          </div>

          <!-- Section 87A Banner -->
          <div class="p-3 rounded-lg ${isRebateEligible ? 'bg-emerald-100/70 border border-emerald-300 text-emerald-950' : 'bg-slate-200/60 border border-slate-300 text-slate-800'} text-xs flex items-center justify-between">
            <span class="font-medium">
              ${isRebateEligible 
                ? '🎉 <strong>₹0 Tax Payable:</strong> Net Taxable Income is within the statutory ₹7,00,000 New Regime ceiling, qualifying for 100% tax rebate under Section 87A.' 
                : 'Standard New Regime slab rates applied.'}
            </span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded ${isRebateEligible ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-300 text-slate-700'}">
              ${isRebateEligible ? 'Zero Tax' : 'Taxable'}
            </span>
          </div>

          <!-- Section 44AB Tax Audit Check -->
          <div class="p-3 rounded-lg bg-white border border-slate-200 text-xs flex items-center justify-between">
            <div>
              <span class="font-bold text-slate-800">Section 44AB Tax Audit Applicability:</span>
              <span class="text-slate-600 block text-[11px] mt-0.5">${auditRuleMessage}</span>
            </div>
            <span class="text-[10px] font-bold px-2.5 py-1 rounded-full ${isAuditRequired ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}">
              ${isAuditRequired ? 'Audit Required' : 'Exempt'}
            </span>
          </div>
        </div>

      </div>

    </div>
  `;

  // Attach event handlers
  setupLedgerHandlers(container, {
    bills,
    state,
    onUpdateState,
    onViewBill,
    onDeleteBill,
    onClearBills,
    onSaveCurrentBill,
    currentInvoice,
    currentAudit,
    totalPurchases,
    totalClaimableITC,
    totalCgstPool,
    totalSgstPool,
    totalIgstPool,
    annualTurnover,
    calcMode,
    netTaxableProfit,
    netTaxableIncome,
    totalTaxPayable,
    isRebateEligible
  });
}

/**
 * Binds event handlers for Tab 2 actions
 */
function setupLedgerHandlers(container, props) {
  const {
    bills,
    state,
    onUpdateState,
    onViewBill,
    onDeleteBill,
    onClearBills,
    onSaveCurrentBill,
    totalPurchases,
    totalClaimableITC,
    totalCgstPool,
    totalSgstPool,
    totalIgstPool,
    annualTurnover,
    calcMode,
    netTaxableProfit,
    netTaxableIncome,
    totalTaxPayable,
    isRebateEligible
  } = props;

  // 1. Save Current Bill to Ledger
  const btnSaveFromTab2 = container.querySelector("#btn-save-current-from-tab2");
  if (btnSaveFromTab2 && onSaveCurrentBill) {
    btnSaveFromTab2.addEventListener("click", onSaveCurrentBill);
  }

  const btnSaveCurrentEmpty = container.querySelector("#btn-save-current-empty");
  if (btnSaveCurrentEmpty && onSaveCurrentBill) {
    btnSaveCurrentEmpty.addEventListener("click", onSaveCurrentBill);
  }

  // 2. Clear All Stored Bills
  const btnClearAll = container.querySelector("#btn-clear-all-bills");
  if (btnClearAll && onClearBills) {
    btnClearAll.addEventListener("click", () => {
      if (confirm("Are you sure you want to clear all stored verified bills from the Tax Ledger?")) {
        onClearBills();
      }
    });
  }

  // 3. View / Delete individual bills
  container.querySelectorAll("button[data-action='view-bill']").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.getAttribute("data-index"), 10);
      if (bills[idx] && onViewBill) {
        onViewBill(bills[idx]);
      }
    });
  });

  container.querySelectorAll("button[data-action='delete-bill']").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.getAttribute("data-index"), 10);
      if (bills[idx] && onDeleteBill) {
        onDeleteBill(bills[idx].id || idx);
      }
    });
  });

  // 4. Annual Turnover Input
  const inputTurnover = container.querySelector("#input-ledger-turnover");
  if (inputTurnover && onUpdateState) {
    inputTurnover.addEventListener("input", (e) => {
      onUpdateState({ annualTurnover: parseFloat(e.target.value) || 0 });
    });
  }

  // 5. Scheme Toggles (44AD vs Regular)
  const btn44ad = container.querySelector("#btn-ledger-mode-44ad");
  const btnRegular = container.querySelector("#btn-ledger-mode-regular");
  if (btn44ad && onUpdateState) {
    btn44ad.addEventListener("click", () => onUpdateState({ calcMode: '44AD' }));
  }
  if (btnRegular && onUpdateState) {
    btnRegular.addEventListener("click", () => onUpdateState({ calcMode: 'REGULAR' }));
  }

  // 6. 44AD Slider & Rates
  const sliderDigital = container.querySelector("#slider-ledger-digital-share");
  if (sliderDigital && onUpdateState) {
    sliderDigital.addEventListener("input", (e) => {
      onUpdateState({ digitalShare: parseInt(e.target.value, 10) || 0 });
    });
  }

  const inputDigitalRate = container.querySelector("#input-ledger-digital-rate");
  if (inputDigitalRate && onUpdateState) {
    inputDigitalRate.addEventListener("input", (e) => {
      onUpdateState({ digitalRate: parseFloat(e.target.value) || 0 });
    });
  }

  const inputCashRate = container.querySelector("#input-ledger-cash-rate");
  if (inputCashRate && onUpdateState) {
    inputCashRate.addEventListener("input", (e) => {
      onUpdateState({ cashRate: parseFloat(e.target.value) || 0 });
    });
  }

  // 7. Regular Mode: Purchase Auto-fill & Opex
  const btnAutofillPurchases = container.querySelector("#btn-autofill-ledger-purchases");
  if (btnAutofillPurchases && onUpdateState) {
    btnAutofillPurchases.addEventListener("click", () => {
      onUpdateState({ customPurchaseCosts: totalPurchases });
    });
  }

  const inputPurchases = container.querySelector("#input-ledger-purchases");
  if (inputPurchases && onUpdateState) {
    inputPurchases.addEventListener("input", (e) => {
      onUpdateState({ customPurchaseCosts: parseFloat(e.target.value) || 0 });
    });
  }

  const inputOpex = container.querySelector("#input-ledger-opex");
  if (inputOpex && onUpdateState) {
    inputOpex.addEventListener("input", (e) => {
      onUpdateState({ operatingExpenses: parseFloat(e.target.value) || 0 });
    });
  }

  // 8. Export CSV & Print
  const btnExportCsv = container.querySelector("#btn-export-consolidated-csv");
  if (btnExportCsv) {
    btnExportCsv.addEventListener("click", () => exportConsolidatedTaxCsv({
      bills,
      totalPurchases,
      totalClaimableITC,
      totalCgstPool,
      totalSgstPool,
      totalIgstPool,
      annualTurnover,
      calcMode,
      netTaxableProfit,
      netTaxableIncome,
      totalTaxPayable,
      isRebateEligible
    }));
  }

  const btnPrint = container.querySelector("#btn-print-consolidated-sheet");
  if (btnPrint) {
    btnPrint.addEventListener("click", () => window.print());
  }
}

/**
 * Generates and downloads a clean UTF-8 CSV containing all stored bills and ITR computation
 */
function exportConsolidatedTaxCsv(data) {
  const {
    bills,
    totalPurchases,
    totalClaimableITC,
    totalCgstPool,
    totalSgstPool,
    totalIgstPool,
    annualTurnover,
    calcMode,
    netTaxableProfit,
    netTaxableIncome,
    totalTaxPayable,
    isRebateEligible
  } = data;

  const rows = [
    ["AUDIT IT - CONSOLIDATED TAX & ITC LEDGER REPORT"],
    ["Financial Year", "FY 2025-26", "Assessment Year", "AY 2026-27"],
    ["Generated On", new Date().toLocaleString("en-IN")],
    [],
    ["--- ACCUMULATED LEDGER SUMMARY ---"],
    ["Total Bills Verified", bills.length],
    ["Total Purchase Expenditure (COGS) (₹)", totalPurchases],
    ["Total Claimable GST ITC (₹)", totalClaimableITC],
    ["Accumulated CGST Pool (₹)", totalCgstPool],
    ["Accumulated SGST Pool (₹)", totalSgstPool],
    ["Accumulated IGST Pool (₹)", totalIgstPool],
    [],
    ["--- STORED VERIFIED BILLS ---"],
    ["Invoice No", "Date", "Supplier Name", "Supplier GSTIN", "Subtotal (₹)", "CGST (₹)", "SGST (₹)", "IGST (₹)", "Verified Total (₹)"],
    ...bills.map(b => [
      b.invoice_no || "",
      b.date || "",
      b.vendor_name || "",
      b.gstin || "",
      b.subtotal || 0,
      b.cgst || 0,
      b.sgst || 0,
      b.igst || 0,
      b.verified_total || 0
    ]),
    [],
    ["--- ANNUAL BUSINESS ITR TAX COMPUTATION ---"],
    ["Selected Filing Scheme", calcMode === '44AD' ? "Presumptive Taxation (Section 44AD - ITR-4)" : "Normal Business P&L (ITR-3)"],
    ["Annual Gross Turnover / Revenue (₹)", annualTurnover],
    ["Net Taxable Business Profit (₹)", netTaxableProfit],
    ["Standard Deduction u/s 16/57 (₹)", 75000],
    ["Net Taxable Income (₹)", netTaxableIncome],
    ["Section 87A Full Rebate Status", isRebateEligible ? "YES (100% Tax Waiver under Sec 87A)" : "NO"],
    ["TOTAL ESTIMATED INCOME TAX PAYABLE (₹)", totalTaxPayable],
    [],
    ["--- STATUTORY COMPLIANCE NOTES ---"],
    ["Section 16 Rule", "Settle vendor payment within 180 days from invoice date to prevent ITC reversal."]
  ];

  const csvContent = rows
    .map(row => Array.isArray(row) ? row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",") : "")
    .join("\r\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `AUDIT_IT_Consolidated_Tax_Ledger_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Default export
export default function TaxAndITRTab(props) {
  if (props && props.target) {
    renderTaxAndITRTab(props.target, props);
    return props.target;
  }
  return props;
}
