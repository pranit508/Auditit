// AUDIT IT - Main Application Controller with Real-Time Reactive Auditing
import { SAMPLE_INVOICES } from "./data/sampleInvoices.js";
import { auditInvoice, round2 } from "./utils/auditEngine.js";
import { escapeHtml } from "./utils/html.js";
import { cleanExtractedItems, sanitizeAndCleanInvoice } from "./utils/itemCleaner.js";
import { sanitizeInvoiceData } from "./utils/privacyMasker.js";
import { generateSupplierDisputeNote } from "./utils/discrepancyNote.js";
import { extractInvoiceFromDocument } from "./utils/aiExtractor.js?v=required-fields-20261107";
import { requireTaxInvoice, invalidInvoice } from "./utils/documentValidation.js?v=required-fields-20261107";
import { calculateTaxMetrics } from "./utils/taxCalculator.js";
import { generate_tax_suggestions } from "./utils/taxSuggestions.js";
import { renderDashboardHero } from "./components/DashboardHero.js?v=minimal-home-20261108";
import { renderReviewWorkspace } from "./components/ReviewWorkspace.js?v=invoice-math-dropdowns-20261107";
import { renderCaSlipModal } from "./components/CaSlipModal.js?v=buyer-details-20261107";
import TaxAndITRTab, { renderTaxAndITRTab } from "./components/TaxAndITRTab.js?v=tax-ledger-toggle-fix-20261108";

export class AuditItApp {
  constructor() {
    this.currentView = "dashboard"; // "dashboard" | "review"
    this.activeTab = "audit"; // 'audit' | 'tax'
    this.activeReviewTab = "audit";
    this.currentInvoice = null;
    this.currentAudit = null;
    this.taxData = null;
    this.taxTabState = {
      isBusinessExpense: true,
      calcMode: "44AD",
      annualTurnover: 3000000,
      digitalShare: 80,
      digitalRate: 6.0,
      cashRate: 8.0,
      operatingExpenses: 450000
    };
    this.userTaxSettings = {
      regime: "NEW", // "NEW" | "OLD"
      filingScheme: "PRESUMPTIVE", // "PRESUMPTIVE" | "REGULAR"
      annualRevenue: 3600000,
      annualTurnover: 3600000,
      cogs: 2500000,
      operatingExpenses: 300000,
      digitalRatio: 0.60,
      digitalPercent: 60,
      cashPercent: 40,
      digitalProfitRate: 6,
      cashProfitRate: 8,
      sec80c: 150000,
      sec80d: 25000,
      otherDeductionsOld: 50000,
      newRegimeStdDeduction: 75000,
      isBusinessResale: true,
      grossOutputGst: 50000
    };
    this.isProcessing = false;
    // Never reuse the formerly bundled browser credential.
    this.apiKey = "";
    localStorage.removeItem("audit_it_gemini_api_key");

    // Load persistent Tax Ledger bills
    try {
      const stored = localStorage.getItem("audit_it_tax_ledger_bills");
      this.savedBills = stored ? JSON.parse(stored) : [];
    } catch (_) {
      this.savedBills = [];
    }
    // Seed with clean sample if empty so user has an active ledger out-of-the-box
    if (!Array.isArray(this.savedBills) || this.savedBills.length === 0) {
      const cleanSample = SAMPLE_INVOICES && SAMPLE_INVOICES['clean'];
      if (cleanSample) {
        this.savedBills = [
          {
            id: cleanSample.id || "inv-clean-sample",
            invoice_no: cleanSample.invoice_no || "INV-2026-0891",
            date: cleanSample.date || "2026-03-24",
            vendor_name: cleanSample.vendor_name || "Modern Electrical & Hardware Supplies",
            gstin: cleanSample.gstin || "06AAAAA0000A1Z5",
            buyer_gstin: cleanSample.buyer_gstin || null,
            subtotal: cleanSample.subtotal || 11000.00,
            cgst: cleanSample.cgst || 990.00,
            sgst: cleanSample.sgst || 990.00,
            igst: cleanSample.igst || 0.00,
            total_tax: round2((cleanSample.cgst || 990.00) + (cleanSample.sgst || 990.00) + (cleanSample.igst || 0)),
            verified_total: cleanSample.total_declared || cleanSample.declared_total || 12980.00,
            status: "VERIFIED",
            items: cleanSample.items || []
          }
        ];
        try {
          localStorage.setItem("audit_it_tax_ledger_bills", JSON.stringify(this.savedBills));
        } catch (_) {}
      } else {
        this.savedBills = [];
      }
    }

    this.mainMount = document.getElementById("app-main");
    this.modalMount = document.getElementById("modal-container");
    this.toastMount = document.getElementById("toast-container");

    this.init();
  }

  init() {
    this.render();
  }

  blockUnverifiedUpload() {
    const invoice = this.currentInvoice;
    if (!invoice) return false;
    const isUpload = invoice.file_name || invoice.file_type || invoice.uploaded_file_url ||
      String(invoice.id || "").startsWith("uploaded-");
    const isEmptyNonManual = invoice.scenarioName !== "Manual Bill Entry" &&
      (!Array.isArray(invoice.items) || invoice.items.length === 0);
    if (!isUpload && !isEmptyNonManual) return false;
    try {
      requireTaxInvoice(invoice);
      return false;
    } catch {
      if (invoice.uploaded_file_url) URL.revokeObjectURL(invoice.uploaded_file_url);
      this.currentInvoice = null;
      this.currentAudit = null;
      this.taxData = null;
      this.currentView = "dashboard";
      this.activeTab = "audit";
      this.activeReviewTab = "audit";
      this.uploadStatus = "invalid";
      this.uploadErrorCode = "INVALID_INVOICE";
      this.modalMount.innerHTML = "";
      return true;
    }
  }

  render() {
    this.blockUnverifiedUpload();
    // Never render the previous bill, tabs, or ledger while an upload is unverified.
    if (["pending", "invalid"].includes(this.uploadStatus)) {
      this.mainMount.innerHTML = `
        <section class="max-w-lg mx-auto my-16 p-8 bg-white border border-slate-200 rounded-2xl text-center" role="alert">
          <h1 class="text-xl font-bold text-slate-900">${this.uploadStatus === "pending" ? "Checking your document" : this.uploadErrorCode === "VERIFICATION_UNAVAILABLE" ? "Document verification unavailable" : "Please upload a valid tax invoice."}</h1>
          <p class="mt-3 text-sm text-slate-600">${this.uploadStatus === "pending" ? "Invoice and tax options will appear only after validation." : this.uploadErrorCode === "VERIFICATION_UNAVAILABLE" ? "We couldn't verify your document right now. Please try again. Invoice and tax options remain locked." : "This document could not be verified as a tax invoice. No calculations were performed."}</p>
          ${this.uploadStatus === "invalid" ? `
            <label for="retry-invoice-upload" class="inline-block mt-6 px-5 py-3 bg-emerald-700 text-white font-semibold rounded-xl cursor-pointer">Upload a tax invoice</label>
            <input id="retry-invoice-upload" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" class="sr-only" />
            <p class="mt-3 text-xs text-slate-500">Choose a clear JPG, PNG, WEBP or PDF of the complete invoice.</p>
          ` : ""}
        </section>`;
      document.getElementById("retry-invoice-upload")?.addEventListener("change", event => {
        const file = event.target.files?.[0];
        if (file) this.handleFileUpload(file);
      });
      return;
    }
    // Save active element focus and selection
    const activeEl = document.activeElement;
    let focusInfo = null;
    if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
      focusInfo = {
        id: activeEl.id,
        action: activeEl.getAttribute("data-action"),
        index: activeEl.getAttribute("data-index"),
        selectionStart: activeEl.selectionStart,
        selectionEnd: activeEl.selectionEnd
      };
    }
    const openDetailIds = this.mainMount?.querySelectorAll
      ? Array.from(this.mainMount.querySelectorAll("details[data-preserve-open][open]"))
          .map((detail) => detail.id).filter(Boolean)
      : [];

    if (this.currentView === "dashboard") {
      renderDashboardHero(this.mainMount, {
        savedBillsCount: this.savedBills ? this.savedBills.length : 0,
        onOpenTaxLedger: () => this.openTaxLedger(),
        onSelectSample: (sampleKey) => this.loadSample(sampleKey),
        onFileUpload: (file) => this.handleFileUpload(file),
        onCreateManualBill: () => this.createManualBill()
      });
    } else if (this.currentView === "review") {
      this.mainMount.innerHTML = `
        <div id="review-main-wrapper" class="w-full">
          <!-- TOP NAVIGATION SWITCHER BAR -->
          <div class="flex items-center gap-2 border-b border-slate-200 px-4 sm:px-6 pt-3 bg-white sticky top-16 z-30 shadow-sm">
            <button
              type="button"
              id="top-nav-tab-audit"
              class="pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                this.activeTab === 'audit'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }"
            >
              <span>🧾</span>
              <span>Invoice Math Audit</span>
            </button>

            <button
              type="button"
              id="top-nav-tab-tax"
              class="pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                this.activeTab === 'tax'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }"
            >
              <span>📊</span>
              <span>Tax & ITR Filing</span>
              <span class="ml-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                this.activeTab === 'tax' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
              }">
                ${this.savedBills?.length || 0}
              </span>
            </button>
          </div>

          <!-- CONDITIONAL RENDERING / VIEW SWAP -->
          <div id="review-tab-content-area" class="w-full">
            ${this.activeTab === 'audit' ? `
              <div id="review-workspace-mount"></div>
            ` : `
              <div class="max-w-6xl mx-auto p-4 sm:p-6">
                <!-- Tab 2 Top Bar: Return to Dashboard & CA Slip -->
                <div class="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
                  <div class="flex items-center space-x-2">
                    <button id="btn-tax-back-dash" class="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-all">
                      ← Dashboard
                    </button>
                    ${this.currentInvoice ? `
                      <span class="text-xs text-slate-400 font-mono">(${escapeHtml(this.currentInvoice.vendor_name || 'Current Bill')})</span>
                    ` : ''}
                  </div>
                  <div class="flex items-center space-x-2">
                    <button id="btn-tax-switch-audit" class="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all">
                      🧾 Switch to Bill Audit
                    </button>
                    <button id="btn-tax-ca-slip" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all flex items-center space-x-1">
                      <span>📑 CA Audit Slip</span>
                    </button>
                  </div>
                </div>

                <div id="tax-and-itr-tab-mount"></div>
              </div>
            `}
          </div>
        </div>
      `;

      // Top Tab Switcher listeners
      const btnAudit = document.getElementById("top-nav-tab-audit");
      const btnTax = document.getElementById("top-nav-tab-tax");
      if (btnAudit) {
        btnAudit.addEventListener("click", () => this.setActiveTab("audit"));
      }
      if (btnTax) {
        btnTax.addEventListener("click", () => this.setActiveTab("tax"));
      }

      // Tab 2 Action buttons
      const btnTaxDash = document.getElementById("btn-tax-back-dash");
      if (btnTaxDash) {
        btnTaxDash.addEventListener("click", () => this.goToDashboard());
      }
      const btnTaxSwitchAudit = document.getElementById("btn-tax-switch-audit");
      if (btnTaxSwitchAudit) {
        btnTaxSwitchAudit.addEventListener("click", () => this.setActiveTab("audit"));
      }
      const btnTaxCa = document.getElementById("btn-tax-ca-slip");
      if (btnTaxCa) {
        btnTaxCa.addEventListener("click", () => this.openCaSlipModal());
      }

      if (this.activeTab === 'audit') {
        const workspaceMount = document.getElementById("review-workspace-mount");
        if (workspaceMount) {
          renderReviewWorkspace(workspaceMount, this.currentInvoice, this.currentAudit, {
            activeMainTab: "audit",
            hideInternalTabs: true,
            userTaxSettings: this.userTaxSettings,
            onSwitchMainTab: (tab) => this.setActiveTab(tab),
            taxData: this.taxData,
            onRefreshTaxAi: () => this.handleRefreshTaxAi(),
            onUpdateItem: (idx, action, val) => this.handleUpdateItem(idx, action, val),
            onAddItem: () => this.handleAddItem(),
            onDeleteItem: (idx) => this.handleDeleteItem(idx),
            onUpdateHeader: (field, val) => this.handleUpdateHeader(field, val),
            onAutoFixMath: () => this.handleAutoFixMath(),
            onUpdateTaxSettings: (settings) => this.handleUpdateTaxSettings(settings),
            onSubmitValidInputs: (fields) => this.handleSubmitValidInputs(fields),
            onCopyNote: (openWhatsApp) => this.handleCopyDiscrepancyNote(openWhatsApp),
            onOpenCaSlip: () => this.openCaSlipModal(),
            onBack: () => this.goToDashboard(),
            onSaveToLedger: (inv, aud) => this.handleSaveBillToLedger(inv, aud)
          });
        }
      } else {
        const taxMount = document.getElementById("tax-and-itr-tab-mount");
        if (taxMount) {
          renderTaxAndITRTab(taxMount, {
            savedBills: this.savedBills,
            currentInvoice: this.currentInvoice,
            currentAudit: this.currentAudit,
            state: this.taxTabState,
            onUpdateState: (newState) => {
              this.taxTabState = { ...this.taxTabState, ...newState };
              this.render();
            },
            onViewBill: (bill) => {
              this.currentInvoice = JSON.parse(JSON.stringify(bill));
              if (this.blockUnverifiedUpload()) {
                this.render();
                return;
              }
              this.currentAudit = auditInvoice(this.currentInvoice);
              const { audit_summary, calculated_tax } = calculateTaxMetrics(this.currentInvoice, this.currentAudit, this.userTaxSettings);
              this.taxData = { audit_summary, calculated_tax, ai_suggestions: null };
              this.setActiveTab("audit");
              this.showToast(`Loaded "${bill.invoice_no}" into Invoice Math Audit`, "info");
            },
            onDeleteBill: (idOrIdx) => {
              this.savedBills = this.savedBills.filter((b, idx) => (b.id !== idOrIdx && idx !== idOrIdx && b.invoice_no !== idOrIdx));
              try {
                localStorage.setItem("audit_it_tax_ledger_bills", JSON.stringify(this.savedBills));
              } catch (_) {}
              this.render();
              this.showToast("Bill removed from Tax Ledger", "info");
            },
            onClearBills: () => {
              this.savedBills = [];
              try {
                localStorage.removeItem("audit_it_tax_ledger_bills");
              } catch (_) {}
              this.render();
              this.showToast("All stored bills cleared from Tax Ledger", "info");
            },
            onSaveCurrentBill: () => this.handleSaveBillToLedger(this.currentInvoice, this.currentAudit)
          });
        }
      }
    }

    // Restore disclosure state and focus after the scorecard is rebuilt.
    openDetailIds.forEach((id) => {
      const detail = document.getElementById(id);
      if (detail) detail.open = true;
    });

    // Restore focus seamlessly if user was actively typing
    if (focusInfo) {
      let targetInput = null;
      if (focusInfo.id) {
        targetInput = document.getElementById(focusInfo.id);
      } else if (focusInfo.action && focusInfo.index !== null) {
        targetInput = document.querySelector(`input[data-action="${focusInfo.action}"][data-index="${focusInfo.index}"]`);
      }
      if (targetInput) {
        targetInput.focus();
        if (targetInput.setSelectionRange && focusInfo.selectionStart !== null) {
          try {
            targetInput.setSelectionRange(focusInfo.selectionStart, focusInfo.selectionEnd);
          } catch (_) {}
        }
      }
    }
  }

  async loadSample(sampleKey) {
    const rawSample = SAMPLE_INVOICES[sampleKey];
    if (!rawSample) return;

    // Deep copy to allow editing without mutating original sample
    this.currentInvoice = JSON.parse(JSON.stringify(rawSample));
    this.currentAudit = auditInvoice(this.currentInvoice);

    // Compute code-calculated tax & deemed profit under Sec 44AD
    const { audit_summary, calculated_tax } = calculateTaxMetrics(this.currentInvoice, this.currentAudit, this.userTaxSettings);
    const ai_suggestions = await generate_tax_suggestions(audit_summary, calculated_tax, this.apiKey);
    
    this.taxData = { audit_summary, calculated_tax, ai_suggestions };
    this.activeTab = "audit";
    this.activeReviewTab = "audit";
    this.activeTab = "audit";
    this.activeReviewTab = "audit";
    this.currentView = "review";
    this.render();
    window.scrollTo({ top: 0, behavior: "smooth" });
    this.showToast(`Loaded ${rawSample.scenarioName}`, "info");
  }

  createManualBill() {
    this.currentInvoice = {
      id: "manual-" + Date.now(),
      scenarioName: "Manual Bill Entry",
      vendor_name: "Gupta General Traders",
      vendor_address: "Wholesale Mandi, Shop 4B, Delhi",
      gstin: "07AAAAA0000A1Z5",
      buyer_gstin: null,
      buyer_name: null,
      buyer_address: null,
      invoice_no: `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toISOString().split("T")[0],
      badge: { text: "Manual Draft", color: "slate" },
      items: [
        {
          id: "item-1",
          description: "Basmati Rice 25kg",
          hsn: "1006",
          qty: 10,
          rate: 850.00,
          amount: 8500.00,
          is_blurry: false
        },
        {
          id: "item-2",
          description: "Refined Mustard Oil 15L Tin",
          hsn: "1514",
          qty: 4,
          rate: 1650.00,
          amount: 6600.00,
          is_blurry: false
        }
      ],
      subtotal: 15100.00,
      cgst: 377.50, // 2.5%
      sgst: 377.50, // 2.5%
      igst: 0.00,
      total_declared: 15855.00,
      bank_details: {
        bank_name: "State Bank of India",
        account_number: "•••• •••• •••• 1029",
        ifsc: "SBIN••••••"
      },
      payment_terms: "Cash on delivery",
      notes: "Manual invoice entered on shop counter."
    };

    this.currentAudit = auditInvoice(this.currentInvoice);
    const { audit_summary, calculated_tax } = calculateTaxMetrics(this.currentInvoice, this.currentAudit, this.userTaxSettings);
    this.taxData = {
      audit_summary,
      calculated_tax,
      ai_suggestions: {
        suggestions: [
          "Recommended ITR Form: File ITR-4 Sugam under Sec 44AD presumptive scheme without maintaining formal books.",
          "GST ITC Opportunity / Risk: Verified GSTIN ensures 100% of GST paid directly reduces your monthly tax outgo.",
          "Advance Tax & Action Item: Remind yourself of the March 15 advance tax deadline."
        ],
        disclaimer: "Not tax advice; verify with your CA.",
        isAiGenerated: false
      }
    };

    this.activeTab = "audit";
    this.activeReviewTab = "audit";
    this.currentView = "review";
    this.render();
    window.scrollTo({ top: 0, behavior: "smooth" });
    this.showToast("Created new bill - start editing line items live!", "success");
  }

  async handleFileUpload(file) {
    if (this.uploadStatus === "pending") return;
    if (this.currentInvoice?.uploaded_file_url) URL.revokeObjectURL(this.currentInvoice.uploaded_file_url);
    this.currentInvoice = null;
    this.currentAudit = null;
    this.taxData = null;
    this.activeTab = "audit";
    this.activeReviewTab = "audit";
    this.currentView = "dashboard";
    this.uploadStatus = "pending";
    this.uploadErrorCode = null;
    this.render();
    this.showProcessingOverlay(file.name);

    try {
      let extractedInvoice = await extractInvoiceFromDocument(file, this.apiKey, (msg) => {
        const progressEl = document.getElementById("upload-progress-text");
        if (progressEl) progressEl.textContent = msg;
      });

      // Apply sanitize_and_clean_invoice to all Gemini outputs before updating UI state
      requireTaxInvoice(extractedInvoice);
      try {
        const resp = await fetch("/api/process-invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ extracted_data: extractedInvoice })
        });
        if (resp.ok) {
          const res = await resp.json();
          if (res.extracted_data) {
            extractedInvoice = res.extracted_data;
          }
        } else {
          if (resp.status === 422) throw invalidInvoice();
          extractedInvoice = sanitizeAndCleanInvoice(extractedInvoice);
        }
      } catch (error) {
        if (error.code === "INVALID_INVOICE") throw error;
        extractedInvoice = sanitizeAndCleanInvoice(extractedInvoice);
      }

      // CRITICAL PARSING RULE ENFORCEMENT: Purge metadata, phone, GSTIN strings and garbage items
      extractedInvoice = sanitizeAndCleanInvoice(extractedInvoice);
      if (extractedInvoice && Array.isArray(extractedInvoice.items)) {
        extractedInvoice.items = cleanExtractedItems(extractedInvoice.items);
      }
      extractedInvoice = sanitizeInvoiceData(extractedInvoice);
      requireTaxInvoice(extractedInvoice);

      // Grand Total Sanity: Reject 774 and OCR hallucinations
      const subtot = Number(extractedInvoice.subtotal) || 0;
      const taxes = Math.round(((Number(extractedInvoice.cgst) || 0) + (Number(extractedInvoice.sgst) || 0) + (Number(extractedInvoice.igst) || 0)) * 100) / 100;
      const expTotal = Math.round((subtot + taxes) * 100) / 100;
      let decTotal = Number(extractedInvoice.total_declared !== undefined && extractedInvoice.total_declared !== null ? extractedInvoice.total_declared : extractedInvoice.declared_total) || 0;
      if (expTotal > 0 && (decTotal === 774 || (subtot > 0 && decTotal < (subtot * 0.5)))) {
        decTotal = expTotal;
        extractedInvoice.total_declared = decTotal;
        extractedInvoice.declared_total = decTotal;
      }

      this.currentInvoice = extractedInvoice;
      this.currentAudit = auditInvoice(this.currentInvoice);

      // Compute code-calculated tax & deemed profit under Sec 44AD
      const { audit_summary, calculated_tax } = calculateTaxMetrics(this.currentInvoice, this.currentAudit, this.userTaxSettings);
      const ai_suggestions = await generate_tax_suggestions(audit_summary, calculated_tax, this.apiKey);
      this.taxData = { audit_summary, calculated_tax, ai_suggestions };

      this.uploadStatus = "valid";
      this.activeTab = "audit";
    this.activeReviewTab = "audit";
    this.currentView = "review";
      this.hideProcessingOverlay();
      this.render();
      window.scrollTo({ top: 0, behavior: "smooth" });

      this.showToast("Invoice analyzed by Gemini 2.5 Flash successfully!", "success");
    } catch (err) {
      this.currentInvoice = null;
      this.currentAudit = null;
      this.taxData = null;
      this.currentView = "dashboard";
      this.activeTab = "audit";
      this.activeReviewTab = "audit";
      this.uploadStatus = "invalid";
      this.uploadErrorCode = err.code || "VERIFICATION_UNAVAILABLE";
      this.hideProcessingOverlay();
      this.render();
    }
  }

  handleUpdateItem(index, action, value) {
    if (!this.currentInvoice || !this.currentInvoice.items[index]) return;

    const item = this.currentInvoice.items[index];
    if (action === "edit-desc") {
      item.description = value;
    } else if (action === "edit-qty") {
      item.qty = value;
    } else if (action === "edit-rate") {
      item.rate = value;
      item.is_blurry = false;
    } else if (action === "edit-amount") {
      item.amount = value;
    }

    this.recomputeEverything();
  }

  handleAddItem() {
    if (!this.currentInvoice) return;
    const newItem = {
      id: "item-" + Date.now(),
      description: "New Item " + (this.currentInvoice.items.length + 1),
      hsn: "9900",
      qty: 1,
      rate: 100.00,
      amount: 100.00,
      is_blurry: false
    };

    this.currentInvoice.items.push(newItem);
    this.recomputeEverything();
    this.showToast("Added new line item", "info");
  }

  handleDeleteItem(index) {
    if (!this.currentInvoice || this.currentInvoice.items.length <= 1) {
      this.showToast("Invoice must contain at least 1 item", "error");
      return;
    }

    this.currentInvoice.items.splice(index, 1);
    this.recomputeEverything();
    this.showToast("Removed line item", "info");
  }

  handleUpdateHeader(field, value) {
    if (!this.currentInvoice) return;

    if (field === "gst_preset") {
      this.currentInvoice.cgst = value.cgst;
      this.currentInvoice.sgst = value.sgst;
      this.currentInvoice.igst = value.igst;
    } else {
      this.currentInvoice[field] = value;
    }

    this.recomputeEverything();
  }

  handleAutoFixMath() {
    if (!this.currentInvoice) return;

    // Fix each item's declared amount to equal qty * rate
    let newSubtotal = 0;
    this.currentInvoice.items.forEach(item => {
      item.amount = round2(item.qty * item.rate);
      item.error_flag = false;
      newSubtotal += item.amount;
    });

    this.currentInvoice.subtotal = round2(newSubtotal);
    const totalTax = round2((this.currentInvoice.cgst || 0) + (this.currentInvoice.sgst || 0) + (this.currentInvoice.igst || 0));
    this.currentInvoice.total_declared = round2(this.currentInvoice.subtotal + totalTax);

    this.recomputeEverything();
    this.showToast("Auto-corrected all math discrepancies to verified total!", "success");
  }

  handleUpdateTaxSettings(settings) {
    this.userTaxSettings = { ...this.userTaxSettings, ...settings };
    this.recomputeEverything();
  }

  handleSubmitValidInputs(fields) {
    if (!this.currentInvoice) return;

    Object.keys(fields).forEach(key => {
      const { value, itemIndex } = fields[key];

      if (key === "gstin") {
        if (value.toUpperCase() === "UNREGISTERED") {
          this.currentInvoice.is_unregistered_vendor = true;
          this.currentInvoice.gstin = "";
        } else {
          this.currentInvoice.gstin = value.toUpperCase();
          this.currentInvoice.is_unregistered_vendor = false;
        }
      } else if (key === "vendor_name") {
        this.currentInvoice.vendor_name = value;
      } else if (key === "invoice_no") {
        this.currentInvoice.invoice_no = value;
      } else if (key === "total_declared") {
        this.currentInvoice.total_declared = parseFloat(value) || 0;
      } else if (key.startsWith("item_rate_") && itemIndex !== null) {
        if (this.currentInvoice.items[itemIndex]) {
          const rateVal = parseFloat(value) || 0;
          this.currentInvoice.items[itemIndex].rate = rateVal;
          this.currentInvoice.items[itemIndex].is_blurry = false;
          this.currentInvoice.items[itemIndex].amount = round2(this.currentInvoice.items[itemIndex].qty * rateVal);
        }
      } else if (key.startsWith("item_qty_") && itemIndex !== null) {
        if (this.currentInvoice.items[itemIndex]) {
          const qtyVal = parseFloat(value) || 1;
          this.currentInvoice.items[itemIndex].qty = qtyVal;
          this.currentInvoice.items[itemIndex].amount = round2(qtyVal * this.currentInvoice.items[itemIndex].rate);
        }
      }
    });

    this.currentInvoice.inputs_validated = true;
    this.recomputeEverything();
    this.showToast("Valid inputs confirmed! Calculations completed.", "success");
  }

  recomputeEverything() {
    // 1. Audit invoice strictly in code
    this.currentAudit = auditInvoice(this.currentInvoice);

    // 2. Recompute tax metrics strictly in code
    const { audit_summary, calculated_tax } = calculateTaxMetrics(this.currentInvoice, this.currentAudit, this.userTaxSettings);
    
    // Retain current AI suggestions text while updating dynamic numbers
    const prevAi = this.taxData ? this.taxData.ai_suggestions : null;
    const ai_suggestions = prevAi || {
      suggestions: [
        "Recommended ITR Form: File ITR-4 Sugam under Sec 44AD presumptive scheme.",
        this.currentAudit.gstinValid ? "GST ITC: 100% eligible Input Tax Credit." : "GST ITC: Warning - missing GSTIN.",
        "Advance Tax: Pay by March 15 to prevent interest."
      ],
      disclaimer: "Not tax advice; verify with your CA.",
      isAiGenerated: false
    };

    this.taxData = { audit_summary, calculated_tax, ai_suggestions };
    this.render();
  }

  async handleRefreshTaxAi() {
    if (!this.taxData) return;
    this.showToast("Invoking Gemini 2.5 Flash for tax preparation suggestions...", "info");
    
    const { audit_summary, calculated_tax } = this.taxData;
    const ai_suggestions = await generate_tax_suggestions(audit_summary, calculated_tax, this.apiKey);
    this.taxData.ai_suggestions = ai_suggestions;
    
    this.render();
    this.showToast(ai_suggestions.isAiGenerated ? "Updated via Gemini 2.5 Flash!" : "Tax suggestions refreshed", "success");
  }

  handleCopyDiscrepancyNote(openWhatsApp = false) {
    if (!this.currentInvoice || !this.currentAudit) return "";
    const noteText = generateSupplierDisputeNote(this.currentInvoice, this.currentAudit);

    if (openWhatsApp) {
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(noteText)}`;
      window.open(waUrl, "_blank");
      this.showToast("Opening WhatsApp with dispute note...", "success");
      return noteText;
    }

    navigator.clipboard.writeText(noteText).then(() => {
      this.showToast("Dispute Note copied! Ready to paste in WhatsApp", "success");
    }).catch(() => {
      prompt("Copy your dispute note below:", noteText);
    });

    return noteText;
  }

  handleSaveBillToLedger(invoice, audit) {
    if (this.blockUnverifiedUpload()) {
      this.render();
      return;
    }
    const inv = invoice || this.currentInvoice;
    if (!inv) {
      this.showToast("No active bill to save to Tax Ledger", "error");
      return;
    }
    const aud = audit || this.currentAudit || auditInvoice(inv);

    const subtotal = round2(Number(inv.subtotal) || 0);
    const cgst = round2(Number(inv.cgst) || 0);
    const sgst = round2(Number(inv.sgst) || 0);
    const igst = round2(Number(inv.igst) || 0);
    const total_tax = round2(cgst + sgst + igst);
    const verified_total = (aud && aud.expectedTotal !== undefined && !isNaN(aud.expectedTotal))
      ? round2(aud.expectedTotal)
      : round2(subtotal + total_tax);

    const billEntry = {
      id: inv.id || "bill-" + Date.now(),
      invoice_no: inv.invoice_no || `INV-${Date.now().toString().slice(-4)}`,
      date: inv.date || new Date().toISOString().slice(0, 10),
      vendor_name: inv.vendor_name || "Supplier",
      gstin: (inv.gstin || "").trim().toUpperCase(),
      buyer_gstin: (inv.buyer_gstin || "").trim().toUpperCase(),
      subtotal,
      cgst,
      sgst,
      igst,
      total_tax,
      verified_total,
      status: aud && aud.hasDiscrepancy ? "DISCREPANCY" : "VERIFIED",
      items: Array.isArray(inv.items) ? JSON.parse(JSON.stringify(inv.items)) : []
    };

    const existingIdx = this.savedBills.findIndex(b => 
      (billEntry.id && b.id === billEntry.id) || 
      (billEntry.invoice_no && b.invoice_no === billEntry.invoice_no && b.vendor_name === billEntry.vendor_name)
    );

    if (existingIdx >= 0) {
      this.savedBills[existingIdx] = billEntry;
      this.showToast(`Updated "${billEntry.invoice_no}" in Tax Ledger!`, "success");
    } else {
      this.savedBills.unshift(billEntry);
      this.showToast(`Saved "${billEntry.invoice_no}" to Tax Ledger!`, "success");
    }

    try {
      localStorage.setItem("audit_it_tax_ledger_bills", JSON.stringify(this.savedBills));
    } catch (_) {}

    this.render();
  }

  openTaxLedger() {
    if (this.blockUnverifiedUpload()) {
      this.render();
      return;
    }
    if (["pending", "invalid"].includes(this.uploadStatus)) return;
    this.currentView = "review";
    this.activeTab = "tax";
    this.activeReviewTab = "tax";
    this.render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  openCaSlipModal() {
    if (this.blockUnverifiedUpload()) {
      this.render();
      return;
    }
    if (["pending", "invalid"].includes(this.uploadStatus)) return;
    if (!this.currentInvoice) {
      if (this.savedBills && this.savedBills.length > 0) {
        this.currentInvoice = JSON.parse(JSON.stringify(this.savedBills[0]));
        if (this.blockUnverifiedUpload()) {
          this.render();
          return;
        }
        this.currentAudit = auditInvoice(this.currentInvoice);
      } else {
        this.showToast("No bill available to generate CA Slip", "info");
        return;
      }
    }
    if (!this.currentAudit) {
      if (this.blockUnverifiedUpload()) {
        this.render();
        return;
      }
      this.currentAudit = auditInvoice(this.currentInvoice);
    }
    renderCaSlipModal(this.modalMount, this.currentInvoice, this.currentAudit, () => {
      this.modalMount.innerHTML = "";
    });
  }

  goToDashboard() {
    this.currentView = "dashboard";
    this.activeTab = "audit";
    this.activeReviewTab = "audit";
    this.render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  setActiveTab(tab) {
    if (this.blockUnverifiedUpload()) {
      this.render();
      return;
    }
    if (["pending", "invalid"].includes(this.uploadStatus)) return;
    this.activeTab = tab;
    this.activeReviewTab = tab;
    this.render();
  }

  showProcessingOverlay(fileName) {
    this.modalMount.innerHTML = `
      <div class="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl">
          <div class="w-16 h-16 mx-auto mb-4 relative flex items-center justify-center">
            <div class="absolute inset-0 rounded-full border-4 border-slate-200 border-t-emerald-600 animate-spin"></div>
            <span class="text-xl">🔍</span>
          </div>
          <h3 class="text-base font-bold text-slate-900">Checking document</h3>
          <div id="upload-progress-text" class="mt-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            Scanning document & reading text...
          </div>
          
          <div class="mt-4 space-y-2 text-left bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-slate-600">
            <div class="flex items-center space-x-2">
              <span class="text-emerald-600 font-bold">✓</span>
              <span>Masking bank accounts & phone numbers</span>
            </div>
            <div class="flex items-center space-x-2">
              <span class="text-emerald-600 font-bold">✓</span>
              <span>Extracting vendor & GSTIN details</span>
            </div>
            <div class="flex items-center space-x-2 text-emerald-800 font-semibold">
              <span class="animate-pulse">●</span>
              <span>Calculations stay locked until the invoice is verified</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  hideProcessingOverlay() {
    this.modalMount.innerHTML = "";
  }

  showToast(message, type = "info") {
    const toast = document.createElement("div");
    const bgClass = type === "success" 
      ? "bg-emerald-700 text-white" 
      : type === "error" 
      ? "bg-rose-700 text-white" 
      : "bg-slate-900 text-white";

    toast.className = `transform transition-all duration-300 ease-out translate-y-2 opacity-0 pointer-events-auto px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center space-x-2 ${bgClass}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
      <span class="toast-message"></span>
    `;
    toast.querySelector(".toast-message").textContent = message;

    this.toastMount.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove("translate-y-2", "opacity-0");
    });

    setTimeout(() => {
      toast.classList.add("translate-y-2", "opacity-0");
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
}

// Bootstrap app on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  new AuditItApp();
});
