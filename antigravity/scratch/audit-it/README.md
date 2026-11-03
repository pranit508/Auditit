# AUDIT IT 🛡️
### Modern Invoice & GST Verification Web App for Small Retail Shop Owners in India

> **Core Guarantee:** *"AI reads the bill, code does the math."* Never rely on LLMs or OCR models to calculate sums. All mathematical additions, multiplications, and tax formulas are strictly computed deterministically in code.

---

## 🌟 Highlights & Key Features

### 1. Clean, Mobile-Friendly Dashboard (2-Column Hero)
- **Left Column (Upload & Creation):**
  - Centered drag-and-drop container with dashed border and upload icon.
  - Accepts image formats (`.jpg`, `.jpeg`, `.png`, `.webp`) and `.pdf` files.
  - **"Snap Photo"** button for mobile devices to snap paper parchas on the counter.
  - **"✍️ Enter Bill Manually"** button to start auditing a fresh bill from scratch with zero upload needed.
  - Clear privacy guarantee: *"Privacy secured: bank details masked, files deleted after audit"*.
- **Right Column (Sample Scenarios):**
  - **Sample 1: Clean Bill** (*Sharma Wholesale Traders*): Green `Math Verified` pill badge.
  - **Sample 2: Math Error** (*Modern Electrical Supplies*): Red `₹1,000 Overcharge` pill badge (20 LED bulbs @ ₹95 billed as ₹2,900 instead of ₹1,900).
  - **Sample 3: Missing GSTIN** (*Gupta Packaging Materials*): Amber `Review Needed` pill badge with blurred rate check.
  - **1-Click Direct Testing:** Clicking any sample card immediately loads the audit review screen.

### 2. Strict Input Validation & Calculations Gatekeeper
- **Zero-Guesswork / Zero-Hallucination Rule:**
  - If any critical detail seems missing or unclear (e.g. smudged rate, missing quantity, missing supplier GSTIN, missing invoice number, or unreadable grand total), the engine **does NOT move ahead and calculate**.
  - All mathematical reconciliations, deemed profit calculations, and tax liabilities are **strictly paused**.
- **Interactive "Input Required" Form:**
  - The review workspace prompts the shopkeeper with clean input fields for each missing item, alongside the original document on the left so they can check their paper bill.
  - Quick action: **"Mark as Unregistered (No GSTIN)"** for unorganized vendors without GSTIN.
  - Clicking **"🚀 Confirm Inputs & Calculate Audit"** validates the inputs, clears unclear flags, and instantly runs the precision audit calculations!

### 3. Real-Time Interactive Editing & Dynamic Recalculation
- **Instant Reactive Inputs (No Page Refreshes):**
  - **Line Items:** Edit Item Description, Quantity, Rate, and Billed Amount in real time.
  - **➕ Add / ✕ Delete Line Items:** Instantly adds or removes items and recalculates subtotal, tax, and variance.
  - **🪄 Auto-Fix Bill Math:** 1-click button to automatically correct all line item amounts and declared totals to the verified mathematical sum.
  - **Live GSTIN Validation:** Instant Indian 15-character regex validation with visual status (Valid vs Missing/Invalid format).
  - **Quick GST Rate Presets:** 1-tap presets for 0% (Exempt), 5% (Atta/Rice), 12% (Standard), 18% (Electrical), 28% (Luxury) or custom CGST/SGST/IGST.
  - **Digital Ratio Slider:** Adjust cash vs digital turnover to see real-time updates to Section 44AD Deemed Profit (6% digital / 8% cash).
  - **Focus Preservation:** Buttery-smooth keystroke typing without losing input cursor position.

### 2. Simple and Trustworthy Design
- Color palette: Deep Slate (`slate-900`, `slate-800`), pure white surfaces, subtle Emerald accents (`#059669` / `emerald-600`), soft Amber for warnings, and Rose for discrepancies.
- Tailored for Indian retail: ₹ Rupee symbols formatted in Indian numbering (`₹1,24,570.00`), GSTIN structure verification, and familiar merchant terms.

### 3. Interactive Split Review Workspace
- **Desktop:** Side-by-side view (Left: High-fidelity realistic Tax Invoice preview with colored bounding boxes; Right: Audit scorecard & editable line-items table).
- **Mobile:** 1-tap Segmented Switcher (`Original Bill` ↔ `Audit Report`) with a sticky bottom summary card.
- **Interactive Bounding Box Overlays:**
  - 🔴 **Red overlay** on math errors and total discrepancies.
  - 🟡 **Amber overlay** on missing GSTIN and blurry/unclear fields.
  - 🟢 **Green overlay** on verified items and totals.
  - Tapping any bounding box synchronizes with and scrolls directly to that item in the scorecard.
- **Human-in-the-Loop Inline Editing:**
  - Shopkeepers can click directly into any Quantity, Rate, or Billed amount to adjust it.
  - The audit engine dynamically recalculates the line item, subtotal, GST, and difference in real time.

### 4. Post-Audit Dispute & Compliance Outputs
- **📋 1-Tap Copy Dispute Note:** Generates a polite, pre-composed dispute message in English + Hindi ready to paste into WhatsApp/SMS to the supplier:
  ```text
  Namaste Modern Electrical Supplies Pvt Ltd,
  In invoice #MES/MUM/2026/894, there is a calculation discrepancy of ₹1,180.
  Line Item: 9W Cool Day LED Bulb B22 — 20 × ₹95 is ₹1,900, but billed as ₹2,900.
  Please verify and issue a Credit Note (जमा पर्चा).
  ```
- **📑 Download / Print CA Audit Slip:** Opens a formal, printable A4 audit certificate formatted with invoice metadata, reconciliation table, and auditor sign-off block for tax accountants and GST ITC filing.

### 5. Tax & ITR Insights (Gemini 2.5 Flash + Sec 44AD Engine)
- **Deterministic Presumptive Tax Calculation:**
  - Deemed Profit calculated strictly in code under **Section 44AD** at **6% digital / 8% cash**.
  - Estimated Tax Liability computed under the **New Tax Regime (Section 115BAC)** with Section 87A rebate checks.
- **3 Dynamic KPI Pills:**
  - **Pill 1:** `Recommended Form: ITR-4 (Presumptive Scheme - Sec 44AD)`
  - **Pill 2:** `Deemed Net Profit: ₹X,XX,XXX (Calculated at 6% digital / 8% cash)`
  - **Pill 3:** `Estimated Tax Liability: ₹X,XXX (Computed via New Regime)`
- **Advisory Callout Box:** Plain-English summary explaining how keeping supplier GSTINs verified maximizes Input Tax Credit (ITC) and lowers tax outgo.
- **`generate_tax_suggestions(audit_summary, calculated_tax)`:**
  - Uses **Gemini 2.5 Flash** to provide 3 concise bullet points (Recommended ITR Form, GST ITC Opportunity/Risk, Advance Tax deadline of March 15) with the mandatory disclaimer: *"Not tax advice; verify with your CA."*

### 6. Client-Side Privacy & Masking
- Bank account numbers are automatically masked (e.g. `•••• •••• •••• 4821`).
- IFSC codes are masked (e.g. `SBIN••••••`).
- Personal phone numbers are masked.
- Raw files stay in memory and are discarded after processing.

---

## 🚀 How to Run the App

1. Open your terminal and navigate to the project directory:
   ```bash
   cd /Users/pranit405/.gemini/antigravity/scratch/audit-it
   ```

2. Start the lightweight local Python server:
   ```bash
   python3 server.py
   ```
   *(Or `/usr/bin/python3 server.py 3000`)*

3. Open your browser and visit:
   ```text
   http://localhost:3000
   ```

---

## 📂 File Architecture

```
audit-it/
├── index.html                 # Main HTML entry with Tailwind CSS configuration
├── app.js                     # Central state controller, routing & event handling
├── styles.css                 # Custom design tokens, pulse animations & @media print styles
├── server.py                  # Python 3 zero-dependency HTTP server with ES module MIME types
├── data/
│   └── sampleInvoices.js      # The 3 high-fidelity sample bills (Clean, Math Error, Missing GSTIN)
├── utils/
│   ├── auditEngine.js         # Strict calculation engine: "AI reads, code calculates"
│   ├── discrepancyNote.js     # Bilingual dispute note generator
│   ├── privacyMasker.js       # Client-side bank account & IFSC masking engine
│   └── aiExtractor.js         # Multimodal Gemini API pipeline + offline smart fallback
└── components/
    ├── DashboardHero.js       # 2-column upload dropzone & demo sample chips
    ├── ReviewWorkspace.js     # Split-screen & mobile segmented toggle workspace
    ├── InvoiceViewer.js       # Realistic Indian Tax Invoice renderer with bounding boxes
    ├── AuditScorecard.js      # Scorecard, math discrepancy banner & editable table
    ├── CaSlipModal.js         # Printable A4 CA Audit Certificate modal
    └── ApiKeyModal.js         # Optional Gemini API key configuration modal
```
