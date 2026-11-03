// Component: Review Workspace (Tab 1: Invoice Math Audit | Tab 2: Tax & ITR Filing)
import { renderInvoiceViewer } from "./InvoiceViewer.js";
import { renderAuditScorecard } from "./AuditScorecard.js";
import { renderTaxFilingDashboard } from "./TaxFilingDashboard.js";
import { formatRupees } from "../utils/auditEngine.js";

export function renderReviewWorkspace(container, invoice, audit, options = {}) {
  const { 
    activeMainTab = "audit", // "audit" (Tab 1) | "tax" (Tab 2)
    onSwitchMainTab,
    userTaxSettings = {},
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
    taxData, 
    onRefreshTaxAi 
  } = options;

  let currentTab = activeMainTab;
  let activeMobileTab = "audit"; // "audit" or "bill" for Tab 1 mobile view
  let selectedItemId = null;

  container.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 py-4 sm:py-6">
      
      <!-- Top Navigation Bar -->
      <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
        <div class="flex items-center space-x-3">
          <button id="btn-top-back" class="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all">
            <span>← Dashboard</span>
          </button>
          <div>
            <h2 class="text-sm sm:text-base font-bold text-slate-900 flex items-center space-x-2">
              <span>${invoice.vendor_name || "Supplier Invoice"}</span>
              <span class="text-xs font-normal text-slate-400 font-mono">(${invoice.invoice_no || "No ID"})</span>
            </h2>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <span class="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
            audit.status === 'VERIFIED'
              ? 'bg-emerald-100 text-emerald-800'
              : audit.status === 'OVERCHARGE_ERROR'
              ? 'bg-rose-100 text-rose-800'
              : 'bg-amber-100 text-amber-800'
          }">
            ${audit.statusText}
          </span>
          <button id="btn-top-ca-slip" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all flex items-center space-x-1">
            <span>📑 CA Audit Slip</span>
          </button>
        </div>
      </div>

      <!-- MAIN TABS NAVIGATION BAR (Tab 1 vs Tab 2) -->
      ${options.hideInternalTabs ? '' : `
      <div class="flex items-center space-x-2 border-b border-slate-200 mb-6 pb-2">
        <button 
          id="tab-btn-audit" 
          class="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            currentTab === 'audit' 
              ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-900' 
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }"
        >
          <span>🧾 Invoice Math Audit</span>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-mono ${
            currentTab === 'audit' ? 'bg-slate-800 text-emerald-400' : 'bg-slate-100 text-slate-500'
          }">
            ${audit.statusText}
          </span>
        </button>

        <button 
          id="tab-btn-tax" 
          class="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            currentTab === 'tax' 
              ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-900' 
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }"
        >
          <span>📊 Tax & ITR Filing</span>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
            currentTab === 'tax' ? 'bg-emerald-500/30 text-emerald-300' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }">
            Custom Engine
          </span>
        </button>
      </div>
      `}

      <!-- ============================================================ -->
      <!-- TAB 1: INVOICE MATH AUDIT CONTENT (Keep 100% UNTOUCHED)        -->
      <!-- ============================================================ -->
      <div id="tab-content-audit" class="${currentTab === 'audit' ? 'block' : 'hidden'}">
        
        <!-- MOBILE 1-TAP SEGMENTED TOGGLE (Visible on small screens) -->
        <div class="lg:hidden mb-4">
          <div class="bg-slate-200/80 p-1 rounded-xl flex">
            <button 
              id="tab-toggle-bill" 
              class="flex-1 py-2 text-xs font-bold rounded-lg transition-all text-center ${activeMobileTab === 'bill' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}"
            >
              📄 Original Bill
            </button>
            <button 
              id="tab-toggle-audit" 
              class="flex-1 py-2 text-xs font-bold rounded-lg transition-all text-center ${activeMobileTab === 'audit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}"
            >
              🔍 Audit Report (${audit.statusText})
            </button>
          </div>
        </div>

        <!-- SPLIT REVIEW GRID (Side-by-Side on Desktop, Toggled on Mobile) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          <!-- LEFT: ORIGINAL INVOICE PREVIEW WITH BOUNDING BOXES (col-span-6) -->
          <div id="viewer-column" class="lg:col-span-6 ${activeMobileTab === 'bill' ? 'block' : 'hidden lg:block'} sticky top-4">
            <div id="invoice-viewer-mount"></div>
          </div>

          <!-- RIGHT: AUDIT SCORECARD & EDITABLE LINE ITEMS (col-span-6) -->
          <div id="scorecard-column" class="lg:col-span-6 ${activeMobileTab === 'audit' ? 'block' : 'hidden lg:block'}">
            <div id="audit-scorecard-mount"></div>
          </div>

        </div>

        <!-- STICKY BOTTOM SUMMARY BAR FOR MOBILE -->
        <div class="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-lg z-30 flex items-center justify-between">
          <div>
            <span class="text-[10px] text-slate-400 font-semibold block uppercase">Audit Verdict</span>
            <span class="text-xs font-bold font-mono ${audit.hasTotalDiscrepancy ? 'text-rose-600' : 'text-emerald-700'}">
              ${audit.hasTotalDiscrepancy ? `Diff: ${formatRupees(audit.totalDiff)}` : 'Math Verified ✓'}
            </span>
          </div>
          <div class="flex items-center space-x-2">
            <button id="btn-mobile-quick-action" class="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold shadow">
              ${audit.hasTotalDiscrepancy ? '📋 Copy Dispute' : '📑 CA Slip'}
            </button>
          </div>
        </div>

      </div>

      <!-- ============================================================ -->
      <!-- TAB 2: TAX & ITR FILING CONTENT (Dedicated Customizable Engine) -->
      <!-- ============================================================ -->
      <div id="tab-content-tax" class="${currentTab === 'tax' ? 'block' : 'hidden'}">
        <div id="tax-filing-mount"></div>
      </div>

    </div>
  `;

  // Mount children
  const viewerMount = container.querySelector("#invoice-viewer-mount");
  const scorecardMount = container.querySelector("#audit-scorecard-mount");
  const taxMount = container.querySelector("#tax-filing-mount");

  function renderChildren() {
    if (currentTab === "audit") {
      if (viewerMount) {
        renderInvoiceViewer(viewerMount, invoice, audit, {
          selectedItemId,
          onSelectItem: (id) => {
            selectedItemId = id;
            renderChildren();
            // Switch to audit tab if on mobile so user sees the item
            if (window.innerWidth < 1024) {
              activeMobileTab = "audit";
              updateMobileTabs();
            }
            // Smooth scroll to scorecard row
            const row = document.getElementById(`scorecard-row-${id}`);
            if (row) {
              row.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }
        });
      }

      if (scorecardMount) {
        renderAuditScorecard(scorecardMount, invoice, audit, {
          selectedItemId,
          taxData,
          onRefreshTaxAi,
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
          onSaveToLedger: options.onSaveToLedger
        });
      }
    } else if (currentTab === "tax") {
      if (taxMount) {
        renderTaxFilingDashboard(taxMount, invoice, audit, taxData, userTaxSettings, {
          onUpdateTaxSettings,
          onRefreshTaxAi
        });
      }
    }
  }

  function updateMainTabs() {
    const tabAuditContent = container.querySelector("#tab-content-audit");
    const tabTaxContent = container.querySelector("#tab-content-tax");
    const btnTabAudit = container.querySelector("#tab-btn-audit");
    const btnTabTax = container.querySelector("#tab-btn-tax");

    if (currentTab === "audit") {
      tabAuditContent.classList.remove("hidden");
      tabAuditContent.classList.add("block");
      tabTaxContent.classList.remove("block");
      tabTaxContent.classList.add("hidden");

      btnTabAudit.className = "flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all bg-slate-900 text-white shadow-sm ring-1 ring-slate-900";
      btnTabTax.className = "flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200";
    } else {
      tabAuditContent.classList.remove("block");
      tabAuditContent.classList.add("hidden");
      tabTaxContent.classList.remove("hidden");
      tabTaxContent.classList.add("block");

      btnTabAudit.className = "flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200";
      btnTabTax.className = "flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all bg-slate-900 text-white shadow-sm ring-1 ring-slate-900";
    }

    renderChildren();
  }

  function updateMobileTabs() {
    const tabBill = container.querySelector("#tab-toggle-bill");
    const tabAudit = container.querySelector("#tab-toggle-audit");
    const viewerCol = container.querySelector("#viewer-column");
    const scoreCol = container.querySelector("#scorecard-column");

    if (!tabBill || !tabAudit || !viewerCol || !scoreCol) return;

    if (activeMobileTab === "bill") {
      tabBill.className = "flex-1 py-2 text-xs font-bold rounded-lg transition-all text-center bg-white text-slate-900 shadow-sm";
      tabAudit.className = "flex-1 py-2 text-xs font-bold rounded-lg transition-all text-center text-slate-600 hover:text-slate-900";
      viewerCol.classList.remove("hidden");
      scoreCol.classList.add("hidden");
    } else {
      tabBill.className = "flex-1 py-2 text-xs font-bold rounded-lg transition-all text-center text-slate-600 hover:text-slate-900";
      tabAudit.className = "flex-1 py-2 text-xs font-bold rounded-lg transition-all text-center bg-white text-slate-900 shadow-sm";
      viewerCol.classList.add("hidden");
      scoreCol.classList.remove("hidden");
    }
  }

  // Main Tab Navigation Listeners
  const btnTabAudit = container.querySelector("#tab-btn-audit");
  const btnTabTax = container.querySelector("#tab-btn-tax");
  if (btnTabAudit) {
    btnTabAudit.addEventListener("click", () => {
      currentTab = "audit";
      if (onSwitchMainTab) {
        onSwitchMainTab("audit");
      } else {
        updateMainTabs();
      }
    });
  }
  if (btnTabTax) {
    btnTabTax.addEventListener("click", () => {
      currentTab = "tax";
      if (onSwitchMainTab) {
        onSwitchMainTab("tax");
      } else {
        updateMainTabs();
      }
    });
  }

  // Mobile Tab Listeners
  const tabBill = container.querySelector("#tab-toggle-bill");
  const tabAudit = container.querySelector("#tab-toggle-audit");
  if (tabBill) {
    tabBill.addEventListener("click", () => {
      activeMobileTab = "bill";
      updateMobileTabs();
    });
  }
  if (tabAudit) {
    tabAudit.addEventListener("click", () => {
      activeMobileTab = "audit";
      updateMobileTabs();
    });
  }

  // Top buttons
  const btnTopBack = container.querySelector("#btn-top-back");
  if (btnTopBack && onBack) {
    btnTopBack.addEventListener("click", onBack);
  }

  const btnTopCa = container.querySelector("#btn-top-ca-slip");
  if (btnTopCa && onOpenCaSlip) {
    btnTopCa.addEventListener("click", onOpenCaSlip);
  }

  // Mobile quick action
  const btnMobileQuick = container.querySelector("#btn-mobile-quick-action");
  if (btnMobileQuick) {
    btnMobileQuick.addEventListener("click", () => {
      if (audit.hasTotalDiscrepancy && onCopyNote) {
        onCopyNote();
      } else if (onOpenCaSlip) {
        onOpenCaSlip();
      }
    });
  }

  // Initial render
  renderChildren();
}
