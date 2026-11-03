// Sample Invoices for AUDIT IT
export const SAMPLE_INVOICES = {
  sample1: {
    id: "sample1",
    scenarioName: "Sample 1: Clean Bill",
    unreadable_fields: [],
    vendor_name: "Sharma Wholesale Traders",
    vendor_address: "Shop 14, Khari Baoli Spice Market, Old Delhi, Delhi - 110006",
    gstin: "07AAAAA0000A1Z5",
    buyer_gstin: "07CORPP2712A1Z1",
    invoice_no: "SWT/2026/0412",
    date: "2026-10-28",
    badge: {
      text: "Math Verified",
      color: "emerald"
    },
    items: [
      {
        id: "item-1",
        description: "Sharbati Wheat Flour (Atta 50kg)",
        hsn: "1101",
        qty: 20,
        rate: 420.00,
        amount: 8400.00,
        is_blurry: false
      },
      {
        id: "item-2",
        description: "Premium Basmati Rice (25kg)",
        hsn: "1006",
        qty: 10,
        rate: 950.00,
        amount: 9500.00,
        is_blurry: false
      },
      {
        id: "item-3",
        description: "Toor Dal Unpolished (10kg)",
        hsn: "0713",
        qty: 5,
        rate: 1100.00,
        amount: 5500.00,
        is_blurry: false
      }
    ],
    subtotal: 23400.00,
    cgst: 585.00, // 2.5%
    sgst: 585.00, // 2.5%
    igst: 0.00,
    total_declared: 24570.00,
    bank_details: {
      bank_name: "State Bank of India",
      account_number: "•••• •••• •••• 4821",
      ifsc: "SBIN••••••",
      branch: "Chandni Chowk, Delhi"
    },
    payment_terms: "Due on delivery - Net 7 Days",
    notes: "Essential food grains supplied under composite GST exemption scheme."
  },

  sample2: {
    id: "sample2",
    scenarioName: "Sample 2: Math Error",
    unreadable_fields: [],
    vendor_name: "Modern Electrical Supplies Pvt Ltd",
    vendor_address: "Plot 88, Lamington Road, Grant Road East, Mumbai - 400007",
    gstin: "27AABCM8291Q1Z8",
    buyer_gstin: "27CORPP2712A1Z1",
    invoice_no: "MES/MUM/2026/894",
    date: "2026-10-30",
    badge: {
      text: "₹1,000 Overcharge",
      color: "rose"
    },
    items: [
      {
        id: "item-1",
        description: "2.5 sq mm Copper Wire Coil (90m)",
        hsn: "8544",
        qty: 10,
        rate: 1200.00,
        amount: 12000.00,
        is_blurry: false
      },
      {
        id: "item-2",
        description: "Modular Switch 6A (White Poly)",
        hsn: "8536",
        qty: 50,
        rate: 45.00,
        amount: 2250.00,
        is_blurry: false
      },
      {
        id: "item-3",
        description: "9W Cool Day LED Bulb B22",
        hsn: "8539",
        qty: 20,
        rate: 95.00,
        amount: 2900.00, // INTENTIONAL ERROR: 20 * 95 should be 1900.00! Overcharge = ₹1,000.00
        is_blurry: false,
        error_flag: true,
        error_note: "Line item calculation mismatch: 20 × ₹95 = ₹1,900, but billed as ₹2,900."
      }
    ],
    subtotal: 17150.00, // Billed subtotal contains the ₹1,000 extra
    cgst: 1543.50, // 9% of 17,150
    sgst: 1543.50, // 9% of 17,150
    igst: 0.00,
    total_declared: 20237.00, // Should have been 16,150 + 1453.50 + 1453.50 = 19,057.00 (Discrepancy: ₹1,180.00)
    bank_details: {
      bank_name: "HDFC Bank",
      account_number: "•••• •••• •••• 9924",
      ifsc: "HDFC••••••",
      branch: "Opera House, Mumbai"
    },
    payment_terms: "Immediate settlement via NEFT/UPI",
    notes: "Goods once sold will not be taken back without original stamped cash memo."
  },

  sample3: {
    id: "sample3",
    scenarioName: "Sample 3: Missing GSTIN",
    unreadable_fields: ["gstin", "items[1].rate"],
    vendor_name: "Gupta Packaging Materials",
    vendor_address: "Shed 22, Industrial Area Site 4, Sahibabad, Ghaziabad - 201010",
    gstin: "", // INTENTIONALLY MISSING GSTIN
    buyer_gstin: "06CORPP2712A1Z1",
    invoice_no: "GPM/2026/102",
    date: "2026-11-01",
    badge: {
      text: "Review Needed",
      color: "amber"
    },
    items: [
      {
        id: "item-1",
        description: "Corrugated Shipping Boxes (5-Ply 12x10x8)",
        hsn: "4819",
        qty: 500,
        rate: 18.00,
        amount: 9000.00,
        is_blurry: false
      },
      {
        id: "item-2",
        description: "Heavy Duty Air Bubble Wrap Roll (100m)",
        hsn: "3923",
        qty: 2,
        rate: 900.00,
        amount: 1800.00,
        is_blurry: true, // Marked as blurry/unclear rate on paper
        unclear_note: "Rate digit smudged on physical parcha. Never hallucinated; please verify if ₹900.00 is agreed rate."
      },
      {
        id: "item-3",
        description: "Brown Packing Tape 2 inch (65m)",
        hsn: "3919",
        qty: 30,
        rate: 45.00,
        amount: 1350.00,
        is_blurry: false
      }
    ],
    subtotal: 12150.00,
    cgst: 0.00,
    sgst: 0.00,
    igst: 2187.00, // 18% IGST
    total_declared: 14337.00,
    bank_details: {
      bank_name: "Punjab National Bank",
      account_number: "•••• •••• •••• 1039",
      ifsc: "PUNB••••••",
      branch: "Sahibabad"
    },
    payment_terms: "Payment within 15 days",
    notes: "Supplied for retail ecommerce packaging."
  },

  sample4: {
    id: "sample4",
    scenarioName: "Sample 4: Retail Hardware & Electrical Bill",
    vendor_name: "Modern Electrical & Hardware",
    vendor_address: "Shop 12, Main Market, Delhi - 110006",
    gstin: "07AAECM4821F1ZX",
    buyer_gstin: "07CORPP2712A1Z1",
    invoice_no: "INV-2026-402",
    date: "2026-11-02",
    badge: {
      text: "Hardware Bill",
      color: "emerald"
    },
    items: [
      {
        id: "item-1",
        description: "LED Tube Light 20W (Cool Day Light)",
        hsn: "9405",
        qty: 10,
        rate: 250.00,
        amount: 2500.00,
        is_blurry: false
      },
      {
        id: "item-2",
        description: "Modular Switch 6A Single Pole",
        hsn: "8536",
        qty: 20,
        rate: 45.00,
        amount: 900.00,
        is_blurry: false
      }
    ],
    subtotal: 3400.00,
    cgst: 153.00,
    sgst: 153.00,
    igst: 0.00,
    total_declared: 3706.00,
    bank_details: {
      bank_name: "State Bank of India",
      account_number: "•••• •••• •••• 4402",
      ifsc: "SBIN••••••"
    },
    payment_terms: "Immediate",
    notes: "Electrical and lighting inventory for retail shop counter."
  }
};
