// Component: Dashboard Hero Section (Upload Box & 3 Demo Scenarios)
import { SAMPLE_INVOICES } from "../data/sampleInvoices.js";

export function renderDashboardHero(container, options = {}) {
  const { onSelectSample, onFileUpload, onOpenApiKeyModal, onCreateManualBill, onOpenTaxLedger, savedBillsCount, hasApiKey } = options;

  container.innerHTML = `
    <div class="max-w-6xl mx-auto px-4 py-6 sm:py-10">
      
      <!-- Top Title & Value Proposition -->
      <div class="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
        <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-3">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Built for Retail Shop Owners & Kirana Stores in India</span>
        </div>
        
        <h1 class="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Never Pay a Wrong Bill Again.
        </h1>
        
        <p class="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
          Drop or snap any supplier invoice (पर्चा). Our strict mathematical audit checks every line item (Qty × Rate) and verifies GST totals in seconds.
        </p>

        <!-- Rule Highlight Pill -->
        <div class="mt-3 inline-flex items-center space-x-2 text-[11px] text-slate-500 bg-slate-100/90 px-3 py-1 rounded-lg">
          <span class="font-bold text-slate-700">Core Guarantee:</span>
          <span>"AI reads the bill, code does the math" — 100% calculation accuracy</span>
        </div>
      </div>

      <!-- 2-COLUMN HERO GRID (Stacks on mobile) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        <!-- LEFT COLUMN: UPLOAD DROPZONE (col-span-6 or 7) -->
        <div class="lg:col-span-7 flex flex-col">
          <div 
            id="dropzone-area" 
            class="relative flex-1 flex flex-col items-center justify-center p-6 sm:p-10 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl bg-white hover:bg-emerald-50/20 transition-all cursor-pointer group shadow-sm text-center"
          >
            <!-- Hidden file inputs -->
            <input 
              type="file" 
              id="file-input" 
              class="hidden" 
              accept="image/jpeg,image/png,image/jpg,application/pdf"
            />
            <input 
              type="file" 
              id="camera-input" 
              class="hidden" 
              accept="image/*" 
              capture="environment"
            />

            <!-- Upload Icon Graphic -->
            <div class="w-16 h-16 rounded-2xl bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center text-slate-600 group-hover:text-emerald-700 transition-colors mb-4 shadow-inner">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
            </div>

            <h3 class="text-base sm:text-lg font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
              Upload supplier invoice or photo
            </h3>
            
            <p class="text-xs text-slate-500 mt-1 max-w-sm">
              Drag & drop your PDF or image here, or choose an option below
            </p>

            <!-- Buttons: Browse & Snap Camera -->
            <div class="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <button 
                type="button" 
                id="btn-browse-file" 
                class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow transition-all active:scale-95 flex items-center space-x-1.5"
              >
                <span>📁 Select File / PDF</span>
              </button>

              <button 
                type="button" 
                id="btn-snap-photo" 
                class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow transition-all active:scale-95 flex items-center space-x-1.5"
              >
                <span>📷 Snap Photo</span>
              </button>

              <button 
                type="button" 
                id="btn-manual-bill" 
                class="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold shadow-xs transition-all active:scale-95 flex items-center space-x-1.5"
              >
                <span>✍️ Enter Bill Manually</span>
              </button>
            </div>

            <!-- Formats Allowed -->
            <div class="mt-4 text-[11px] text-slate-400 font-mono">
              Supports: JPG, PNG, WEBP, PDF (Max 15MB)
            </div>

            <!-- Privacy Guarantee Caption -->
            <div class="mt-6 pt-4 border-t border-slate-100 w-full flex items-center justify-center space-x-1.5 text-xs text-slate-500">
              <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <span class="font-medium text-[11px] text-slate-600">Privacy secured: bank details masked, files deleted after audit</span>
            </div>

          </div>
        </div>

        <!-- RIGHT COLUMN: DEMO SCENARIOS (col-span-5) -->
        <div class="lg:col-span-5 flex flex-col justify-between">
          <div class="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex-1 flex flex-col">
            
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xs font-bold uppercase tracking-wider text-slate-500">
                Or test with sample bills:
              </h2>
              <span class="text-[10px] text-slate-400">1-click instant audit</span>
            </div>

            <div class="space-y-3 flex-1 flex flex-col justify-around">
              
              <!-- Sample 1: Clean Bill -->
              <button 
                type="button" 
                id="btn-sample-1" 
                class="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all group flex items-center justify-between"
              >
                <div class="flex items-center space-x-3">
                  <div class="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                    S1
                  </div>
                  <div>
                    <h4 class="text-xs font-bold text-slate-900 group-hover:text-emerald-900">
                      Sample 1: Clean Bill
                    </h4>
                    <p class="text-[11px] text-slate-500">Sharma Wholesale Traders</p>
                  </div>
                </div>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Math Verified
                </span>
              </button>

              <!-- Sample 2: Math Error -->
              <button 
                type="button" 
                id="btn-sample-2" 
                class="w-full text-left p-3.5 rounded-xl border border-rose-200 bg-rose-50/20 hover:border-rose-500 hover:bg-rose-50/50 transition-all group flex items-center justify-between"
              >
                <div class="flex items-center space-x-3">
                  <div class="w-9 h-9 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center font-bold text-xs shrink-0">
                    S2
                  </div>
                  <div>
                    <h4 class="text-xs font-bold text-slate-900 group-hover:text-rose-900">
                      Sample 2: Math Error
                    </h4>
                    <p class="text-[11px] text-slate-500">Modern Electrical Supplies</p>
                  </div>
                </div>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                  ₹1,000 Overcharge
                </span>
              </button>

              <!-- Sample 3: Missing GSTIN -->
              <button 
                type="button" 
                id="btn-sample-3" 
                class="w-full text-left p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 hover:border-amber-500 hover:bg-amber-50/50 transition-all group flex items-center justify-between"
              >
                <div class="flex items-center space-x-3">
                  <div class="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                    S3
                  </div>
                  <div>
                    <h4 class="text-xs font-bold text-slate-900 group-hover:text-amber-900">
                      Sample 3: Missing GSTIN
                    </h4>
                    <p class="text-[11px] text-slate-500">Gupta Packaging Materials</p>
                  </div>
                </div>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  Review Needed
                </span>
              </button>

              <!-- Sample 4: Hardware & Electrical Bill -->
              <button 
                type="button" 
                id="btn-sample-4" 
                class="w-full text-left p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:border-emerald-400 hover:bg-emerald-50/20 transition-all group flex items-center justify-between"
              >
                <div class="flex items-center space-x-3">
                  <div class="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                    S4
                  </div>
                  <div>
                    <h4 class="text-xs font-bold text-slate-900 group-hover:text-emerald-900">
                      Sample 4: Hardware & Electrical
                    </h4>
                    <p class="text-[11px] text-slate-500">2 Line Items, GST 9%, Grand Total ₹3,706</p>
                  </div>
                </div>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Clean Hardware
                </span>
              </button>

            </div>

            <!-- Optional Gemini Multimodal API Key config -->
            <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span class="text-slate-500">Live Gemini AI Pipeline:</span>
              <button 
                id="btn-toggle-apikey" 
                class="text-xs font-semibold ${hasApiKey ? 'text-emerald-700 hover:underline' : 'text-slate-700 hover:text-slate-900'} flex items-center space-x-1"
              >
                <span>${hasApiKey ? '🔑 API Key Active' : '⚙️ Configure Gemini Key'}</span>
              </button>
            </div>

            <!-- Tax Ledger Quick Link -->
            <div class="mt-3 pt-3 border-t border-slate-100">
              <button 
                type="button" 
                id="btn-open-tax-ledger" 
                class="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-between shadow-sm active:scale-95"
              >
                <div class="flex items-center space-x-2">
                  <span>📊</span>
                  <span>Stored Bills Tax Ledger & ITR</span>
                </div>
                <span class="bg-indigo-500/40 text-indigo-200 text-[10px] px-2 py-0.5 rounded-full border border-indigo-400/30">
                  ${savedBillsCount || 0} Bills
                </span>
              </button>
            </div>

          </div>
        </div>

      </div>

      <!-- Trust Badges Bar -->
      <div class="mt-10 pt-6 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div class="p-3">
          <div class="text-emerald-600 font-bold text-lg">100%</div>
          <div class="text-[11px] text-slate-600 font-medium">Deterministic Math Check</div>
        </div>
        <div class="p-3">
          <div class="text-slate-800 font-bold text-lg">GST Section 16</div>
          <div class="text-[11px] text-slate-600 font-medium">ITC Compliance Verification</div>
        </div>
        <div class="p-3">
          <div class="text-emerald-600 font-bold text-lg">0 Server Leaks</div>
          <div class="text-[11px] text-slate-600 font-medium">Client Redaction & Masking</div>
        </div>
        <div class="p-3">
          <div class="text-slate-800 font-bold text-lg">WhatsApp Ready</div>
          <div class="text-[11px] text-slate-600 font-medium">1-Tap Dispute Note Generator</div>
        </div>
      </div>

    </div>
  `;

  // Attach sample button listeners
  const btn1 = container.querySelector("#btn-sample-1");
  const btn2 = container.querySelector("#btn-sample-2");
  const btn3 = container.querySelector("#btn-sample-3");
  const btn4 = container.querySelector("#btn-sample-4");

  if (btn1 && onSelectSample) {
    btn1.addEventListener("click", () => onSelectSample("sample1"));
  }
  if (btn2 && onSelectSample) {
    btn2.addEventListener("click", () => onSelectSample("sample2"));
  }
  if (btn3 && onSelectSample) {
    btn3.addEventListener("click", () => onSelectSample("sample3"));
  }
  if (btn4 && onSelectSample) {
    btn4.addEventListener("click", () => onSelectSample("sample4"));
  }

  // File Input and Drag-and-Drop
  const dropzone = container.querySelector("#dropzone-area");
  const fileInput = container.querySelector("#file-input");
  const cameraInput = container.querySelector("#camera-input");
  const btnBrowse = container.querySelector("#btn-browse-file");
  const btnSnap = container.querySelector("#btn-snap-photo");

  if (btnBrowse && fileInput) {
    btnBrowse.addEventListener("click", (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  if (btnSnap && cameraInput) {
    btnSnap.addEventListener("click", (e) => {
      e.stopPropagation();
      cameraInput.click();
    });
  }

  const btnManual = container.querySelector("#btn-manual-bill");
  if (btnManual && onCreateManualBill) {
    btnManual.addEventListener("click", (e) => {
      e.stopPropagation();
      onCreateManualBill();
    });
  }

  if (dropzone && fileInput) {
    dropzone.addEventListener("click", () => {
      fileInput.click();
    });

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("border-emerald-500", "bg-emerald-50/40");
    });

    dropzone.addEventListener("dragleave", () => {
      dropzone.classList.remove("border-emerald-500", "bg-emerald-50/40");
    });

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("border-emerald-500", "bg-emerald-50/40");
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        if (onFileUpload) onFileUpload(e.dataTransfer.files[0]);
      }
    });
  }

  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files.length > 0) {
        if (onFileUpload) onFileUpload(e.target.files[0]);
      }
    });
  }

  if (cameraInput) {
    cameraInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files.length > 0) {
        if (onFileUpload) onFileUpload(e.target.files[0]);
      }
    });
  }

  // API Key Modal Trigger
  const btnApiKey = container.querySelector("#btn-toggle-apikey");
  if (btnApiKey && onOpenApiKeyModal) {
    btnApiKey.addEventListener("click", onOpenApiKeyModal);
  }

  // Open Stored Bills Tax Ledger
  const btnOpenTaxLedger = container.querySelector("#btn-open-tax-ledger");
  if (btnOpenTaxLedger && onOpenTaxLedger) {
    btnOpenTaxLedger.addEventListener("click", onOpenTaxLedger);
  }
}
