// Component: Tax & ITR Filing Dashboard (Tab 2)
// Fully customizable tax planning engine for Indian small retail shopkeepers
import { calculateComprehensiveTax } from "../utils/taxCalculator.js";
import { formatRupees, round2 } from "../utils/auditEngine.js";

/**
 * Renders the dedicated Tax & ITR Filing dashboard
 * @param {HTMLElement} container
 * @param {Object} invoice
 * @param {Object} audit
 * @param {Object} taxData
 * @param {Object} userTaxSettings
 * @param {Object} options
 */
export function renderTaxFilingDashboard(container, invoice = {}, audit = {}, taxData = null, userTaxSettings = {}, options = {}) {
  const { onUpdateTaxSettings, onRefreshTaxAi } = options;

  // Run comprehensive tax engine calculation
  const comp = calculateComprehensiveTax(invoice, audit, userTaxSettings);

  const regime = comp.regime; // "NEW" | "OLD"
  const scheme = comp.filingScheme; // "PRESUMPTIVE" | "REGULAR"
  const profit = comp.profitDetails;
  const ded = comp.deductions;
  const itc = comp.itcAudit;

  // Format currency without decimals for high-level figures
  const formatWhole = (num) => "₹" + Math.round(Number(num) || 0).toLocaleString("en-IN");

  container.innerHTML = `
    <div class="space-y-6">

      <!-- TOP HEADER & COMPLIANCE BADGE -->
      <div class="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-md border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center space-x-2.5">
            <span class="text-xl sm:text-2xl">📊</span>
            <div>
              <div class="flex items-center space-x-2">
                <h3 class="text-base sm:text-lg font-black tracking-tight text-white">Tax & ITR Filing Dashboard</h3>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  FY 2025-26 • AY 2026-27
                </span>
              </div>
              <p class="text-xs text-slate-300 mt-0.5">
                Customizable Retail Tax Planning • Presumptive Sec 44AD vs ITR-3 P&L • GST Input Tax Credit (ITC) Audit
              </p>
            </div>
          </div>
        </div>

        <div class="flex items-center flex-wrap gap-2">
          <!-- 1-Click Export Button -->
          <button 
            id="btn-export-tax-csv" 
            class="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition-all active:scale-95"
            title="Download CSV computation and ITC summary"
          >
            <span>📥 Download Tax & ITC Sheet (CSV)</span>
          </button>
          <button 
            id="btn-print-tax-sheet" 
            class="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-semibold shadow transition-all active:scale-95"
            title="Print or Save as PDF"
          >
            <span>🖨️ Print / PDF</span>
          </button>
        </div>
      </div>

      <!-- 4 HERO KPI METRIC CARDS -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        <!-- Card 1: Annual Turnover -->
        <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Annual Turnover</span>
            <span class="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">Gross</span>
          </div>
          <div class="mt-2">
            <div class="text-lg sm:text-xl font-black text-slate-900 font-mono">
              ${formatWhole(comp.annualRevenue)}
            </div>
            <span class="text-[10px] text-slate-500 block mt-0.5">
              ${scheme === 'PRESUMPTIVE' ? 'Presumptive Scheme' : 'Regular Business Sales'}
            </span>
          </div>
        </div>

        <!-- Card 2: Net Taxable Profit -->
        <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Net Taxable Profit</span>
            <span class="text-xs font-mono px-1.5 py-0.5 rounded ${scheme === 'PRESUMPTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'} font-semibold">
              ${scheme === 'PRESUMPTIVE' ? 'Sec 44AD' : 'ITR-3 P&L'}
            </span>
          </div>
          <div class="mt-2">
            <div class="text-lg sm:text-xl font-black text-emerald-700 font-mono">
              ${formatWhole(comp.netTaxableProfit)}
            </div>
            <span class="text-[10px] text-slate-500 block mt-0.5 truncate" title="${profit.description}">
              ${profit.description}
            </span>
          </div>
        </div>

        <!-- Card 3: Net Taxable Income (Post-Deduction) -->
        <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Net Taxable Income</span>
            <span class="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
              ${regime === 'NEW' ? 'After ₹75k Std' : 'After Deductions'}
            </span>
          </div>
          <div class="mt-2">
            <div class="text-lg sm:text-xl font-black text-slate-900 font-mono">
              ${formatWhole(comp.netTaxableIncome)}
            </div>
            <span class="text-[10px] text-slate-500 block mt-0.5">
              Total Deductions: ${formatWhole(ded.totalDeductions)}
            </span>
          </div>
        </div>

        <!-- Card 4: Estimated Tax Payable -->
        <div class="bg-white rounded-xl border ${comp.totalTaxPayable === 0 ? 'border-emerald-300 bg-emerald-50/30' : 'border-amber-300 bg-amber-50/20'} p-4 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold ${comp.totalTaxPayable === 0 ? 'text-emerald-800' : 'text-amber-800'} uppercase tracking-wider">Income Tax Payable</span>
            <span class="text-xs font-mono px-1.5 py-0.5 rounded font-bold ${comp.totalTaxPayable === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
              Eff: ${comp.effectiveTaxRate}%
            </span>
          </div>
          <div class="mt-2">
            <div class="text-lg sm:text-xl font-black ${comp.totalTaxPayable === 0 ? 'text-emerald-700' : 'text-slate-900'} font-mono">
              ${comp.totalTaxPayable === 0 ? '₹0.00' : formatRupees(comp.totalTaxPayable)}
            </div>
            <span class="text-[10px] font-semibold ${comp.is87aEligible ? 'text-emerald-700' : 'text-slate-500'} block mt-0.5">
              ${comp.is87aEligible ? '🎉 Sec 87A Full Rebate (₹0 Tax)' : 'Incl. 4% Cess'}
            </span>
          </div>
        </div>

      </div>

      <!-- MAIN CONFIGURATION GRID (Section 1 & Section 2) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        <!-- LEFT COLUMN (lg:col-span-7): Regime & Business Scheme Selector -->
        <div class="lg:col-span-7 space-y-6">

          <!-- 1. REGIME & FILING TYPE SELECTOR -->
          <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-5">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <div class="flex items-center space-x-2">
                <span class="text-base">⚖️</span>
                <h4 class="text-sm font-extrabold text-slate-900">1. Tax Regime & Filing Scheme Selector</h4>
              </div>
              <span class="text-[11px] text-slate-500">Live Simulation</span>
            </div>

            <!-- Tax Regime Toggle: New vs Old -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-2">Income Tax Regime:</label>
              <div class="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button 
                  type="button"
                  id="toggle-regime-new"
                  class="py-2.5 px-3 rounded-lg text-xs font-bold transition-all text-center flex flex-col items-center justify-center space-y-0.5 ${regime === 'NEW' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'}"
                >
                  <span class="flex items-center space-x-1.5">
                    <span>New Tax Regime</span>
                    <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">Default</span>
                  </span>
                  <span class="text-[10px] font-normal text-slate-500">Sec 115BAC • Lower Slabs • ₹75k Std Ded</span>
                </button>
                <button 
                  type="button"
                  id="toggle-regime-old"
                  class="py-2.5 px-3 rounded-lg text-xs font-bold transition-all text-center flex flex-col items-center justify-center space-y-0.5 ${regime === 'OLD' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'}"
                >
                  <span>Old Tax Regime</span>
                  <span class="text-[10px] font-normal text-slate-500">Traditional Slabs • 80C & 80D Deductions</span>
                </button>
              </div>
            </div>

            <!-- Business Filing Scheme Selector: Mode A vs Mode B -->
            <div class="space-y-2 pt-2">
              <label class="block text-xs font-bold text-slate-700">Business Filing Scheme:</label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                <!-- Scheme Card: Mode B (Presumptive) -->
                <div 
                  id="card-scheme-presumptive"
                  class="p-3.5 rounded-xl border-2 cursor-pointer transition-all ${scheme === 'PRESUMPTIVE' ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-500' : 'border-slate-200 bg-white hover:border-slate-300'}"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold ${scheme === 'PRESUMPTIVE' ? 'text-emerald-900' : 'text-slate-900'}">
                      Mode B: Section 44AD
                    </span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded font-bold ${scheme === 'PRESUMPTIVE' ? 'bg-emerald-200/80 text-emerald-900' : 'bg-slate-100 text-slate-600'}">
                      ITR-4 Sugam
                    </span>
                  </div>
                  <p class="text-[11px] text-slate-600 mt-1">
                    Presumptive taxation without books or audit. Deemed profit on turnover.
                  </p>
                </div>

                <!-- Scheme Card: Mode A (Regular P&L) -->
                <div 
                  id="card-scheme-regular"
                  class="p-3.5 rounded-xl border-2 cursor-pointer transition-all ${scheme === 'REGULAR' ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-500' : 'border-slate-200 bg-white hover:border-slate-300'}"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold ${scheme === 'REGULAR' ? 'text-blue-900' : 'text-slate-900'}">
                      Mode A: Regular P&L
                    </span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded font-bold ${scheme === 'REGULAR' ? 'bg-blue-200/80 text-blue-900' : 'bg-slate-100 text-slate-600'}">
                      ITR-3
                    </span>
                  </div>
                  <p class="text-[11px] text-slate-600 mt-1">
                    Normal bookkeeping: Revenue minus actual purchase expenses & overheads.
                  </p>
                </div>

              </div>
            </div>

            <!-- SCHEME SPECIFIC CONFIGURATION INPUTS -->
            <div class="pt-3 border-t border-slate-100">

              <!-- Common Input: Annual Gross Turnover -->
              <div class="mb-4">
                <div class="flex items-center justify-between mb-1">
                  <label class="text-xs font-bold text-slate-700">Annual Gross Revenue / Sales (₹):</label>
                  <span class="text-xs font-mono font-bold text-slate-900">${formatWhole(comp.annualRevenue)}</span>
                </div>
                <input 
                  type="number"
                  id="input-tax-annual-revenue"
                  step="10000"
                  value="${comp.annualRevenue}"
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="e.g. 3600000"
                />
                <span class="text-[10px] text-slate-400 mt-1 block">Expected annual receipts/counter sales of the shop</span>
              </div>

              <!-- MODE B: PRESUMPTIVE SECTION 44AD CONFIGURATION -->
              ${scheme === 'PRESUMPTIVE' ? `
                <div class="bg-slate-50/80 rounded-xl p-4 border border-slate-200 space-y-4">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-slate-800">Digital vs Cash Turnover Split</span>
                    <span class="text-xs font-mono font-bold text-emerald-700">
                      ${profit.digitalPercent}% Digital • ${profit.cashPercent}% Cash
                    </span>
                  </div>

                  <!-- Slider -->
                  <div>
                    <input 
                      type="range"
                      id="slider-tax-digital-split"
                      min="0"
                      max="100"
                      step="5"
                      value="${profit.digitalPercent}"
                      class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                    <div class="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                      <span>0% Digital (100% Cash)</span>
                      <span>50% Split</span>
                      <span>100% Digital (UPI/Bank)</span>
                    </div>
                  </div>

                  <!-- Custom Profit Percentage Inputs -->
                  <div class="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label class="block text-[11px] font-semibold text-slate-600 mb-1">
                        Digital Profit % <span class="text-[10px] text-emerald-600">(Sec 44AD Min: 6%)</span>:
                      </label>
                      <div class="relative">
                        <input 
                          type="number"
                          id="input-tax-digital-rate"
                          min="0"
                          max="100"
                          step="0.5"
                          value="${profit.digitalProfitRate}"
                          class="w-full pl-3 pr-7 py-1.5 rounded-lg border border-slate-300 font-mono text-xs text-right font-bold text-emerald-800"
                        />
                        <span class="absolute right-2.5 top-1.5 text-xs text-slate-400 font-mono">%</span>
                      </div>
                    </div>

                    <div>
                      <label class="block text-[11px] font-semibold text-slate-600 mb-1">
                        Cash Profit % <span class="text-[10px] text-amber-600">(Sec 44AD Min: 8%)</span>:
                      </label>
                      <div class="relative">
                        <input 
                          type="number"
                          id="input-tax-cash-rate"
                          min="0"
                          max="100"
                          step="0.5"
                          value="${profit.cashProfitRate}"
                          class="w-full pl-3 pr-7 py-1.5 rounded-lg border border-slate-300 font-mono text-xs text-right font-bold text-amber-800"
                        />
                        <span class="absolute right-2.5 top-1.5 text-xs text-slate-400 font-mono">%</span>
                      </div>
                    </div>
                  </div>

                  <!-- Live Presumptive Math Formula -->
                  <div class="p-2.5 rounded-lg bg-white border border-slate-200 text-xs font-mono space-y-1">
                    <div class="text-[11px] text-slate-500 font-sans font-semibold">Net Taxable Profit Calculation:</div>
                    <div class="flex justify-between text-slate-700 text-[11px]">
                      <span>Digital Sales (${formatWhole(profit.digitalSales)} × ${profit.digitalProfitRate}%):</span>
                      <span class="font-bold text-emerald-700">${formatRupees(profit.digitalProfit)}</span>
                    </div>
                    <div class="flex justify-between text-slate-700 text-[11px]">
                      <span>Cash Sales (${formatWhole(profit.cashSales)} × ${profit.cashProfitRate}%):</span>
                      <span class="font-bold text-amber-700">${formatRupees(profit.cashProfit)}</span>
                    </div>
                    <div class="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-900 text-xs">
                      <span>Total Deemed Profit:</span>
                      <span class="text-emerald-700">${formatRupees(comp.netTaxableProfit)}</span>
                    </div>
                  </div>
                </div>
              ` : `
                <!-- MODE A: REGULAR BUSINESS (ITR-3 P&L) INPUTS -->
                <div class="bg-slate-50/80 rounded-xl p-4 border border-slate-200 space-y-4">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-slate-800">Normal P&L Expense Tracking</span>
                    <span class="text-[11px] text-slate-500 font-mono">Net = Revenue - All Expenses</span>
                  </div>

                  <!-- COGS / Purchase Expense -->
                  <div>
                    <div class="flex items-center justify-between mb-1">
                      <label class="text-[11px] font-semibold text-slate-700">Cost of Goods Sold (Purchases) ₹:</label>
                      <button 
                        type="button"
                        id="btn-tax-autofill-cogs"
                        class="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors"
                      >
                        ⚡ Auto-fill from Current Bill (${formatWhole(itc.billSubtotal)})
                      </button>
                    </div>
                    <input 
                      type="number"
                      id="input-tax-cogs"
                      step="1000"
                      value="${profit.cogs}"
                      class="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="e.g. 2500000"
                    />
                  </div>

                  <!-- Other Operating Expenses -->
                  <div>
                    <label class="block text-[11px] font-semibold text-slate-700 mb-1">
                      Other Operating Expenses (Rent, Power, Salaries, Misc) ₹:
                    </label>
                    <input 
                      type="number"
                      id="input-tax-opex"
                      step="1000"
                      value="${profit.operatingExpenses}"
                      class="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="e.g. 300000"
                    />
                  </div>

                  <!-- Live P&L Math Formula -->
                  <div class="p-2.5 rounded-lg bg-white border border-slate-200 text-xs font-mono space-y-1">
                    <div class="text-[11px] text-slate-500 font-sans font-semibold">Net P&L Profit Calculation:</div>
                    <div class="flex justify-between text-slate-700 text-[11px]">
                      <span>Gross Sales Revenue:</span>
                      <span class="font-bold text-slate-900">${formatWhole(comp.annualRevenue)}</span>
                    </div>
                    <div class="flex justify-between text-slate-700 text-[11px]">
                      <span>Less Total Expenses (${formatWhole(profit.cogs)} + ${formatWhole(profit.operatingExpenses)}):</span>
                      <span class="font-bold text-rose-600">- ${formatRupees(profit.totalExpenses)}</span>
                    </div>
                    <div class="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-900 text-xs">
                      <span>Net Taxable Business Profit:</span>
                      <span class="text-blue-700">${formatRupees(comp.netTaxableProfit)}</span>
                    </div>
                  </div>
                </div>
              `}

            </div>

          </div>

          <!-- 2. CUSTOM DEDUCTIONS & EXEMPTIONS PANEL -->
          <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <div class="flex items-center space-x-2">
                <span class="text-base">🛡️</span>
                <h4 class="text-sm font-extrabold text-slate-900">2. Deductions & Exemptions Panel</h4>
              </div>
              <span class="text-xs font-bold font-mono text-emerald-700">
                Total Claimed: ${formatWhole(ded.totalDeductions)}
              </span>
            </div>

            ${regime === 'NEW' ? `
              <!-- NEW REGIME DEDUCTIONS (Auto-applied Standard Deduction & 87A Full Rebate) -->
              <div class="space-y-3">
                <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span class="text-xs font-bold text-slate-900 block">Standard Deduction (Budget 2024 / FY 2025-26)</span>
                    <span class="text-[11px] text-slate-500">Auto-applied without requiring investment receipts</span>
                  </div>
                  <span class="text-sm font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    ₹75,000.00
                  </span>
                </div>

                <!-- Section 87A Rebate Indicator -->
                <div class="p-4 rounded-xl ${comp.is87aEligible ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' : 'bg-slate-50 border border-slate-200 text-slate-700'}">
                  <div class="flex items-start space-x-2.5">
                    <span class="text-lg">${comp.is87aEligible ? '🎉' : 'ℹ️'}</span>
                    <div>
                      <div class="text-xs font-bold ${comp.is87aEligible ? 'text-emerald-900' : 'text-slate-900'}">
                        Section 87A Tax Rebate Status
                      </div>
                      <p class="text-[11px] mt-0.5 leading-relaxed">
                        ${comp.is87aEligible 
                          ? `<strong>100% Tax Rebate Applied:</strong> Since Net Taxable Income (${formatWhole(comp.netTaxableIncome)}) is within the statutory ₹7,00,000 threshold of the New Tax Regime, your final income tax liability is completely waived to <strong>₹0.00</strong>.`
                          : `Net Taxable Income (${formatWhole(comp.netTaxableIncome)}) exceeds the ₹7,00,000 threshold for Section 87A full rebate. Standard slab rates apply below.`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ` : `
              <!-- OLD REGIME DEDUCTIONS (80C, 80D, Other) -->
              <div class="space-y-3">
                <p class="text-[11px] text-slate-500">
                  Enter your eligible investments and health insurance premiums to reduce taxable income:
                </p>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <!-- Sec 80C -->
                  <div>
                    <label class="block text-[11px] font-semibold text-slate-700 mb-1">
                      Sec 80C (PPF/LIC/Tuition) ₹:
                    </label>
                    <input 
                      type="number"
                      id="input-tax-80c"
                      max="150000"
                      step="5000"
                      value="${ded.sec80c}"
                      class="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <span class="text-[9px] text-slate-400 mt-0.5 block">Max ₹1,50,000</span>
                  </div>

                  <!-- Sec 80D -->
                  <div>
                    <label class="block text-[11px] font-semibold text-slate-700 mb-1">
                      Sec 80D (Health Insurance) ₹:
                    </label>
                    <input 
                      type="number"
                      id="input-tax-80d"
                      max="50000"
                      step="1000"
                      value="${ded.sec80d}"
                      class="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <span class="text-[9px] text-slate-400 mt-0.5 block">Up to ₹25k/₹50k</span>
                  </div>

                  <!-- Standard / Other Deductions -->
                  <div>
                    <label class="block text-[11px] font-semibold text-slate-700 mb-1">
                      Standard / Other Deductions ₹:
                    </label>
                    <input 
                      type="number"
                      id="input-tax-other-ded"
                      step="1000"
                      value="${ded.otherDeductions}"
                      class="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <span class="text-[9px] text-slate-400 mt-0.5 block">Standard ₹50k</span>
                  </div>
                </div>

                <!-- Old Regime 87A Indicator -->
                <div class="p-3 rounded-lg ${comp.is87aEligible ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' : 'bg-slate-50 border border-slate-200 text-slate-600'} text-xs">
                  ${comp.is87aEligible 
                    ? `🎉 <strong>Sec 87A Rebate:</strong> Net Taxable Income (${formatWhole(comp.netTaxableIncome)}) ≤ ₹5,00,000. Full rebate up to ₹12,500 applied.` 
                    : `Old Regime Sec 87A rebate is available only if Net Taxable Income is ≤ ₹5,00,000.`}
                </div>
              </div>
            `}

          </div>

        </div>

        <!-- RIGHT COLUMN (lg:col-span-5): Dynamic Slabs & GST ITC Audit Card -->
        <div class="lg:col-span-5 space-y-6">

          <!-- 3. DYNAMIC TAX SLAB COMPUTATION ENGINE -->
          <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <div class="flex items-center space-x-2">
                <span class="text-base">🧮</span>
                <h4 class="text-sm font-extrabold text-slate-900">3. Dynamic Slab Computation</h4>
              </div>
              <span class="text-[11px] font-mono px-2 py-0.5 rounded font-bold ${regime === 'NEW' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}">
                ${regime === 'NEW' ? 'New Slabs (115BAC)' : 'Old Slabs'}
              </span>
            </div>

            <!-- Slab-by-Slab Breakdown Table -->
            <div class="overflow-x-auto rounded-lg border border-slate-200">
              <table class="w-full text-left text-xs font-mono">
                <thead class="bg-slate-50 text-slate-600 font-sans text-[11px] border-b border-slate-200">
                  <tr>
                    <th class="px-3 py-2 font-bold">Tax Slab</th>
                    <th class="px-2 py-2 font-bold text-center">Rate</th>
                    <th class="px-2 py-2 font-bold text-right">Taxable (₹)</th>
                    <th class="px-3 py-2 font-bold text-right">Tax (₹)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${comp.slabBreakdown.map(s => `
                    <tr class="${s.isActive ? 'bg-emerald-50/20 font-semibold' : 'text-slate-400'}">
                      <td class="px-3 py-1.5 text-slate-700">${s.label}</td>
                      <td class="px-2 py-1.5 text-center text-slate-600">${s.ratePercent}%</td>
                      <td class="px-2 py-1.5 text-right text-slate-700">${s.taxableAmount > 0 ? formatWhole(s.taxableAmount) : '—'}</td>
                      <td class="px-3 py-1.5 text-right font-bold ${s.taxAmount > 0 ? 'text-slate-900' : 'text-slate-400'}">
                        ${s.taxAmount > 0 ? formatRupees(s.taxAmount) : '₹0.00'}
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>

            <!-- Tax Math Calculation Stack -->
            <div class="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs">
              <div class="flex justify-between text-slate-600">
                <span>Gross Income Tax:</span>
                <span class="font-mono font-semibold">${formatRupees(comp.grossTaxBeforeRebate)}</span>
              </div>

              ${comp.rebate87a > 0 ? `
                <div class="flex justify-between text-emerald-700 font-medium">
                  <span>Less: Sec 87A Tax Rebate:</span>
                  <span class="font-mono font-bold">- ${formatRupees(comp.rebate87a)}</span>
                </div>
              ` : ''}

              <div class="flex justify-between text-slate-600">
                <span>Tax After Rebate:</span>
                <span class="font-mono font-semibold">${formatRupees(comp.taxAfterRebate)}</span>
              </div>

              <div class="flex justify-between text-slate-600">
                <span>Add: 4% Health & Education Cess:</span>
                <span class="font-mono font-semibold">+ ${formatRupees(comp.cess)}</span>
              </div>

              <div class="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900 text-sm">
                <span>Total Income Tax Payable:</span>
                <span class="font-mono ${comp.totalTaxPayable === 0 ? 'text-emerald-700' : 'text-slate-900'}">
                  ${formatRupees(comp.totalTaxPayable)}
                </span>
              </div>

              <div class="flex justify-between text-[11px] text-slate-500 pt-0.5">
                <span>Effective Tax Rate:</span>
                <span class="font-mono font-bold text-slate-700">${comp.effectiveTaxRate}% of Turnover</span>
              </div>
            </div>

          </div>

          <!-- 4. GST INPUT TAX CREDIT (ITC) AUDIT CARD -->
          <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <div class="flex items-center space-x-2">
                <span class="text-base">💳</span>
                <h4 class="text-sm font-extrabold text-slate-900">4. GST Input Tax Credit (ITC) Audit</h4>
              </div>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${itc.itcStatus === 'ELIGIBLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                ${itc.itcStatus === 'ELIGIBLE' ? '100% Eligible' : 'Blocked / Restricted'}
              </span>
            </div>

            <!-- Current Invoice Tax Details -->
            <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-slate-500">Current Purchase Invoice:</span>
                <span class="font-mono font-bold text-slate-900">${invoice.vendor_name || 'Supplier Bill'}</span>
              </div>
              <div class="grid grid-cols-3 gap-2 text-center pt-1 font-mono text-[11px]">
                <div class="p-1.5 rounded bg-white border border-slate-200">
                  <span class="text-[9px] text-slate-400 block uppercase">CGST</span>
                  <span class="font-bold text-slate-800">${formatRupees(itc.cgst)}</span>
                </div>
                <div class="p-1.5 rounded bg-white border border-slate-200">
                  <span class="text-[9px] text-slate-400 block uppercase">SGST</span>
                  <span class="font-bold text-slate-800">${formatRupees(itc.sgst)}</span>
                </div>
                <div class="p-1.5 rounded bg-white border border-slate-200">
                  <span class="text-[9px] text-slate-400 block uppercase">IGST</span>
                  <span class="font-bold text-slate-800">${formatRupees(itc.igst)}</span>
                </div>
              </div>
              <div class="flex justify-between items-center pt-1 text-xs">
                <span class="font-semibold text-slate-700">Total GST on this Bill:</span>
                <span class="font-mono font-bold text-emerald-700">${formatRupees(itc.totalBillGst)}</span>
              </div>
            </div>

            <!-- Custom Business Resale Toggle -->
            <div class="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-xs font-bold text-slate-900 block">Purchase for Business Resale / Capital Use?</span>
                  <span class="text-[10px] text-slate-500">Section 16 vs Blocked Credit under Section 17(5)</span>
                </div>
                <div class="flex items-center space-x-1.5 bg-slate-100 p-0.5 rounded-lg">
                  <button 
                    type="button"
                    id="toggle-itc-resale-yes"
                    class="px-2.5 py-1 text-xs font-bold rounded transition-all ${itc.isBusinessResale ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}"
                  >
                    Yes
                  </button>
                  <button 
                    type="button"
                    id="toggle-itc-resale-no"
                    class="px-2.5 py-1 text-xs font-bold rounded transition-all ${!itc.isBusinessResale ? 'bg-white text-rose-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}"
                  >
                    No
                  </button>
                </div>
              </div>

              <!-- Status Banner -->
              <div class="text-[11px] p-2 rounded-lg font-medium ${itc.itcStatus === 'ELIGIBLE' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'}">
                ${itc.itcStatusLabel}
              </div>
            </div>

            <!-- Net Cash GST Outflow Estimator -->
            <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div class="flex items-center justify-between">
                <label class="font-bold text-slate-800 text-xs">Gross Output GST on Sales (₹):</label>
                <input 
                  type="number"
                  id="input-tax-gross-gst"
                  step="1000"
                  value="${itc.grossOutputGst}"
                  class="w-28 px-2 py-1 text-right rounded border border-slate-300 font-mono text-xs font-bold"
                />
              </div>

              <div class="space-y-1.5 pt-1 text-xs">
                <div class="flex justify-between text-slate-600">
                  <span>Gross Output GST collected:</span>
                  <span class="font-mono">${formatRupees(itc.grossOutputGst)}</span>
                </div>
                <div class="flex justify-between text-emerald-700 font-medium">
                  <span>Less Eligible ITC from Purchases:</span>
                  <span class="font-mono font-bold">- ${formatRupees(itc.eligibleItc)}</span>
                </div>
                <div class="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-slate-900">
                  <span>Net Cash GST Outflow:</span>
                  <span class="font-mono text-emerald-700">${formatRupees(itc.netPayableCashGst)}</span>
                </div>
              </div>

              <div class="p-2 rounded bg-emerald-100/60 text-emerald-900 text-[11px] font-semibold flex items-center justify-between">
                <span>💰 Direct Cash Saved via ITC:</span>
                <span class="font-mono font-bold">${formatRupees(itc.itcCashSavings)}</span>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  `;

  // Attach interactive listeners for reactive state updates
  setupEventListeners(container, comp, userTaxSettings, onUpdateTaxSettings, invoice, audit);
}

/**
 * Binds DOM event listeners and dispatches onUpdateTaxSettings
 */
function setupEventListeners(container, comp, userTaxSettings, onUpdateTaxSettings, invoice, audit) {
  if (!onUpdateTaxSettings) return;

  // 1. Regime Toggles
  const btnNew = container.querySelector("#toggle-regime-new");
  const btnOld = container.querySelector("#toggle-regime-old");
  if (btnNew) {
    btnNew.addEventListener("click", () => onUpdateTaxSettings({ regime: "NEW" }));
  }
  if (btnOld) {
    btnOld.addEventListener("click", () => onUpdateTaxSettings({ regime: "OLD" }));
  }

  // 2. Scheme Cards
  const cardPresumptive = container.querySelector("#card-scheme-presumptive");
  const cardRegular = container.querySelector("#card-scheme-regular");
  if (cardPresumptive) {
    cardPresumptive.addEventListener("click", () => onUpdateTaxSettings({ filingScheme: "PRESUMPTIVE" }));
  }
  if (cardRegular) {
    cardRegular.addEventListener("click", () => onUpdateTaxSettings({ filingScheme: "REGULAR" }));
  }

  // 3. Annual Turnover Input
  const inputRevenue = container.querySelector("#input-tax-annual-revenue");
  if (inputRevenue) {
    inputRevenue.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value) || 0;
      onUpdateTaxSettings({ annualRevenue: val, annualTurnover: val });
    });
  }

  // 4. Presumptive Slider & Rates
  const sliderDigital = container.querySelector("#slider-tax-digital-split");
  if (sliderDigital) {
    sliderDigital.addEventListener("input", (e) => {
      const pct = parseInt(e.target.value, 10) || 0;
      onUpdateTaxSettings({ 
        digitalPercent: pct, 
        cashPercent: 100 - pct,
        digitalRatio: pct / 100 
      });
    });
  }

  const inputDigitalRate = container.querySelector("#input-tax-digital-rate");
  if (inputDigitalRate) {
    inputDigitalRate.addEventListener("input", (e) => {
      onUpdateTaxSettings({ digitalProfitRate: parseFloat(e.target.value) || 0 });
    });
  }

  const inputCashRate = container.querySelector("#input-tax-cash-rate");
  if (inputCashRate) {
    inputCashRate.addEventListener("input", (e) => {
      onUpdateTaxSettings({ cashProfitRate: parseFloat(e.target.value) || 0 });
    });
  }

  // 5. Regular Mode: COGS Auto-fill & Inputs
  const btnAutofillCogs = container.querySelector("#btn-tax-autofill-cogs");
  if (btnAutofillCogs) {
    btnAutofillCogs.addEventListener("click", () => {
      const billSub = round2(Number(invoice.subtotal) || Number(invoice.calculated_subtotal) || (audit && audit.sum_items) || 0);
      onUpdateTaxSettings({ cogs: billSub });
    });
  }

  const inputCogs = container.querySelector("#input-tax-cogs");
  if (inputCogs) {
    inputCogs.addEventListener("input", (e) => {
      onUpdateTaxSettings({ cogs: parseFloat(e.target.value) || 0 });
    });
  }

  const inputOpex = container.querySelector("#input-tax-opex");
  if (inputOpex) {
    inputOpex.addEventListener("input", (e) => {
      onUpdateTaxSettings({ operatingExpenses: parseFloat(e.target.value) || 0 });
    });
  }

  // 6. Old Regime Deductions
  const input80c = container.querySelector("#input-tax-80c");
  if (input80c) {
    input80c.addEventListener("input", (e) => {
      onUpdateTaxSettings({ sec80c: parseFloat(e.target.value) || 0 });
    });
  }

  const input80d = container.querySelector("#input-tax-80d");
  if (input80d) {
    input80d.addEventListener("input", (e) => {
      onUpdateTaxSettings({ sec80d: parseFloat(e.target.value) || 0 });
    });
  }

  const inputOtherDed = container.querySelector("#input-tax-other-ded");
  if (inputOtherDed) {
    inputOtherDed.addEventListener("input", (e) => {
      onUpdateTaxSettings({ otherDeductionsOld: parseFloat(e.target.value) || 0 });
    });
  }

  // 7. ITC Resale Toggles
  const btnResaleYes = container.querySelector("#toggle-itc-resale-yes");
  const btnResaleNo = container.querySelector("#toggle-itc-resale-no");
  if (btnResaleYes) {
    btnResaleYes.addEventListener("click", () => onUpdateTaxSettings({ isBusinessResale: true }));
  }
  if (btnResaleNo) {
    btnResaleNo.addEventListener("click", () => onUpdateTaxSettings({ isBusinessResale: false }));
  }

  // 8. Gross Output GST Input
  const inputGrossGst = container.querySelector("#input-tax-gross-gst");
  if (inputGrossGst) {
    inputGrossGst.addEventListener("input", (e) => {
      onUpdateTaxSettings({ grossOutputGst: parseFloat(e.target.value) || 0 });
    });
  }

  // 9. Export Buttons
  const btnCsv = container.querySelector("#btn-export-tax-csv");
  if (btnCsv) {
    btnCsv.addEventListener("click", () => exportTaxComputationCsv(comp, invoice, audit));
  }

  const btnPrint = container.querySelector("#btn-print-tax-sheet");
  if (btnPrint) {
    btnPrint.addEventListener("click", () => window.print());
  }
}

/**
 * Exports a structured CSV with full tax calculation & ITC sheet
 */
function exportTaxComputationCsv(comp, invoice, audit) {
  const p = comp.profitDetails;
  const d = comp.deductions;
  const itc = comp.itcAudit;

  const rows = [
    ["AUDIT IT - RETAIL TAX & ITR FILING COMPUTATION SHEET"],
    ["Financial Year", "FY 2025-26", "Assessment Year", "AY 2026-27"],
    ["Generated On", new Date().toLocaleString("en-IN")],
    [],
    ["--- INVOICE CONTEXT ---"],
    ["Supplier Vendor Name", invoice.vendor_name || "Supplier"],
    ["Supplier GSTIN", invoice.gstin || "MISSING"],
    ["Buyer GSTIN", invoice.buyer_gstin || "06CORPP2712A1Z1"],
    ["Invoice Number", invoice.invoice_no || "N/A"],
    ["Invoice Date", invoice.date || "N/A"],
    ["Invoice Subtotal (₹)", itc.billSubtotal],
    ["Invoice Verified Total (₹)", (audit && audit.calculated_total) || 0],
    [],
    ["--- TAX REGIME & SCHEME CONFIGURATION ---"],
    ["Selected Tax Regime", comp.regime === "NEW" ? "New Tax Regime (Section 115BAC)" : "Old Tax Regime"],
    ["Selected Filing Scheme", comp.filingScheme === "PRESUMPTIVE" ? "Section 44AD Presumptive (ITR-4 Sugam)" : "Regular Business P&L (ITR-3)"],
    ["Annual Gross Turnover / Revenue (₹)", comp.annualRevenue],
    [],
    ["--- PROFIT COMPUTATION ---"],
    comp.filingScheme === "PRESUMPTIVE" ? [
      ["Digital Receipts Ratio (%)", `${p.digitalPercent}%`],
      ["Cash Receipts Ratio (%)", `${p.cashPercent}%`],
      ["Digital Profit Rate (%)", `${p.digitalProfitRate}%`],
      ["Cash Profit Rate (%)", `${p.cashProfitRate}%`],
      ["Deemed Digital Profit (₹)", p.digitalProfit],
      ["Deemed Cash Profit (₹)", p.cashProfit],
      ["Total Net Deemed Profit (₹)", comp.netTaxableProfit]
    ] : [
      ["Cost of Goods Sold / Purchases (₹)", p.cogs],
      ["Operating Expenses (Rent/Power/Salaries) (₹)", p.operatingExpenses],
      ["Total Business Expenses (₹)", p.totalExpenses],
      ["Net Taxable Profit (₹)", comp.netTaxableProfit]
    ],
    [],
    ["--- DEDUCTIONS & EXEMPTIONS ---"],
    comp.regime === "NEW" ? [
      ["Standard Deduction u/s 16/57 (₹)", d.standardDeduction],
      ["Total Deductions Claimed (₹)", d.totalDeductions],
      ["Net Taxable Income (₹)", comp.netTaxableIncome],
      ["Section 87A Full Rebate Eligible?", comp.is87aEligible ? "YES (Full 100% Tax Waiver)" : "NO"]
    ] : [
      ["Section 80C (PPF/LIC/Tuition) (₹)", d.sec80c],
      ["Section 80D (Health Insurance) (₹)", d.sec80d],
      ["Other / Standard Deductions (₹)", d.otherDeductions],
      ["Total Deductions Claimed (₹)", d.totalDeductions],
      ["Net Taxable Income (₹)", comp.netTaxableIncome],
      ["Section 87A Rebate Eligible?", comp.is87aEligible ? "YES" : "NO"]
    ],
    [],
    ["--- DYNAMIC SLAB-WISE TAX BREAKDOWN ---"],
    ["Slab Description", "Rate (%)", "Taxable in Slab (₹)", "Tax Amount (₹)"],
    ...comp.slabBreakdown.map(s => [s.label, `${s.ratePercent}%`, s.taxableAmount, s.taxAmount]),
    [],
    ["--- TAX LIABILITY SUMMARY ---"],
    ["Gross Income Tax before Rebate (₹)", comp.grossTaxBeforeRebate],
    ["Less: Section 87A Rebate (₹)", comp.rebate87a],
    ["Net Tax after Rebate (₹)", comp.taxAfterRebate],
    ["4% Health & Education Cess (₹)", comp.cess],
    ["TOTAL ESTIMATED INCOME TAX PAYABLE (₹)", comp.totalTaxPayable],
    ["Effective Tax Rate on Turnover (%)", `${comp.effectiveTaxRate}%`],
    [],
    ["--- GST INPUT TAX CREDIT (ITC) AUDIT ---"],
    ["Bill CGST (₹)", itc.cgst],
    ["Bill SGST (₹)", itc.sgst],
    ["Bill IGST (₹)", itc.igst],
    ["Total GST on Current Bill (₹)", itc.totalBillGst],
    ["Business Resale / Capital Use?", itc.isBusinessResale ? "YES" : "NO"],
    ["Supplier GSTIN Valid?", itc.isGstinValid ? "YES" : "NO"],
    ["ITC Eligibility Status", itc.itcStatusLabel],
    ["Eligible ITC Available (₹)", itc.eligibleItc],
    ["Blocked / Ineligible ITC (₹)", itc.blockedItc],
    ["Gross Output GST on Sales (₹)", itc.grossOutputGst],
    ["Net Cash GST Outflow (₹)", itc.netPayableCashGst],
    ["Direct Cash Saved via ITC (₹)", itc.itcCashSavings]
  ].flat(1);

  // Flatten formatted lines
  const csvContent = rows
    .map(row => Array.isArray(row) ? row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",") : "")
    .join("\r\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `AUDIT_IT_Tax_Computation_and_ITC_${(invoice.invoice_no || "bill").replace(/[^\w]/g, "_")}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
