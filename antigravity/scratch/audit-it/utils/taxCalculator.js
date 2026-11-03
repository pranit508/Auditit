// Deterministic Tax & ITR Calculator for Small Indian Retail Shopkeepers
// Core Rule: "Code does the math, deterministic calculations only"
import { round2 } from "./auditEngine.js";

/**
 * Calculates comprehensive tax computation across New & Old Regimes,
 * Section 44AD Presumptive (ITR-4) vs Regular Business P&L (ITR-3),
 * Dynamic Slab-by-Slab breakdown with 4% Cess, and GST ITC Cash Outflow.
 *
 * @param {Object} invoice
 * @param {Object} audit
 * @param {Object} [settings]
 * @returns {Object} Full comprehensive tax computation
 */
export function calculateComprehensiveTax(invoice = {}, audit = {}, settings = {}) {
  // 1. Settings & Defaults
  const regime = settings.regime === "OLD" ? "OLD" : "NEW"; // "NEW" is default
  const filingScheme = settings.filingScheme === "REGULAR" ? "REGULAR" : "PRESUMPTIVE"; // "PRESUMPTIVE" is default
  const annualRevenue = Math.max(0, Number(settings.annualRevenue !== undefined && settings.annualRevenue !== null ? settings.annualRevenue : 3600000));
  
  // Current bill verified GST
  const cgst = round2(Number(invoice.cgst) || 0);
  const sgst = round2(Number(invoice.sgst) || 0);
  const igst = round2(Number(invoice.igst) || 0);
  const totalBillGst = round2(cgst + sgst + igst);
  const billSubtotal = round2(Number(invoice.subtotal) || Number(invoice.calculated_subtotal) || (audit && audit.sum_items) || 0);

  // Business Resale Toggle (Sec 17(5))
  const isBusinessResale = settings.isBusinessResale !== false;
  const isGstinValid = audit ? (audit.gstinValid !== false) : true;

  let itcStatus = "ELIGIBLE";
  let itcStatusLabel = "100% Eligible ITC for GSTR-3B Set-off";
  let eligibleItc = 0;
  let blockedItc = 0;

  if (!isBusinessResale) {
    itcStatus = "BLOCKED_17_5";
    itcStatusLabel = "Ineligible / Blocked Credit under Sec 17(5)";
    blockedItc = totalBillGst;
    eligibleItc = 0;
  } else if (!isGstinValid) {
    itcStatus = "MISSING_GSTIN";
    itcStatusLabel = "Restricted: Missing / Invalid Supplier GSTIN (Sec 16(2))";
    blockedItc = totalBillGst;
    eligibleItc = 0;
  } else {
    itcStatus = "ELIGIBLE";
    itcStatusLabel = "100% Eligible ITC for GSTR-3B Set-off";
    eligibleItc = totalBillGst;
    blockedItc = 0;
  }

  // Net Cash GST Outflow Estimator
  const grossOutputGst = Math.max(0, Number(settings.grossOutputGst !== undefined && settings.grossOutputGst !== null ? settings.grossOutputGst : 50000));
  const netPayableCashGst = Math.max(0, round2(grossOutputGst - eligibleItc));
  const itcCashSavings = eligibleItc;

  // 2. Profit Calculation based on Filing Scheme
  let netTaxableProfit = 0;
  let profitDetails = {};

  if (filingScheme === "REGULAR") {
    // Mode A: Regular Business (Normal P&L - ITR-3)
    let defaultCogs = billSubtotal > 0 ? billSubtotal : 2500000;
    const cogs = Math.max(0, Number(settings.cogs !== undefined && settings.cogs !== null ? settings.cogs : defaultCogs));
    const operatingExpenses = Math.max(0, Number(settings.operatingExpenses !== undefined && settings.operatingExpenses !== null ? settings.operatingExpenses : 300000));
    const totalExpenses = round2(cogs + operatingExpenses);
    netTaxableProfit = Math.max(0, round2(annualRevenue - totalExpenses));

    profitDetails = {
      mode: "REGULAR",
      modeName: "Regular Business (Normal P&L - ITR-3)",
      annualRevenue,
      cogs,
      operatingExpenses,
      totalExpenses,
      netTaxableProfit,
      description: `Revenue (₹${annualRevenue.toLocaleString('en-IN')}) - Expenses (₹${totalExpenses.toLocaleString('en-IN')})`
    };
  } else {
    // Mode B: Presumptive Taxation (Section 44AD - ITR-4 Sugam)
    let digitalPercent = settings.digitalPercent !== undefined && settings.digitalPercent !== null
      ? Number(settings.digitalPercent) 
      : (settings.digitalRatio !== undefined && settings.digitalRatio !== null ? Math.round(Number(settings.digitalRatio) * 100) : 60);
    digitalPercent = Math.min(100, Math.max(0, digitalPercent));
    const cashPercent = Math.max(0, 100 - digitalPercent);
    const digitalProfitRate = settings.digitalProfitRate !== undefined && settings.digitalProfitRate !== null ? Number(settings.digitalProfitRate) : 6;
    const cashProfitRate = settings.cashProfitRate !== undefined && settings.cashProfitRate !== null ? Number(settings.cashProfitRate) : 8;

    const digitalSales = round2(annualRevenue * (digitalPercent / 100));
    const cashSales = round2(annualRevenue * (cashPercent / 100));
    const digitalProfit = round2(digitalSales * (digitalProfitRate / 100));
    const cashProfit = round2(cashSales * (cashProfitRate / 100));
    netTaxableProfit = round2(digitalProfit + cashProfit);

    profitDetails = {
      mode: "PRESUMPTIVE",
      modeName: "Presumptive Taxation (Section 44AD - ITR-4 Sugam)",
      annualRevenue,
      digitalPercent,
      cashPercent,
      digitalProfitRate,
      cashProfitRate,
      digitalSales,
      cashSales,
      digitalProfit,
      cashProfit,
      netTaxableProfit,
      description: `Digital (${digitalPercent}% @ ${digitalProfitRate}%) + Cash (${cashPercent}% @ ${cashProfitRate}%)`
    };
  }

  // 3. Deductions & Net Taxable Income
  let standardDeduction = 0;
  let sec80c = 0;
  let sec80d = 0;
  let otherDeductions = 0;
  let totalDeductions = 0;
  let netTaxableIncome = 0;

  if (regime === "NEW") {
    // New Tax Regime: Standard Deduction ₹75,000 auto-applied
    standardDeduction = 75000;
    totalDeductions = Math.min(netTaxableProfit, standardDeduction);
    netTaxableIncome = Math.max(0, round2(netTaxableProfit - totalDeductions));
  } else {
    // Old Tax Regime: 80C (up to 1.5L), 80D (up to 50k), standard/other deductions
    sec80c = Math.min(150000, Math.max(0, Number(settings.sec80c !== undefined && settings.sec80c !== null ? settings.sec80c : 150000)));
    sec80d = Math.min(50000, Math.max(0, Number(settings.sec80d !== undefined && settings.sec80d !== null ? settings.sec80d : 25000)));
    otherDeductions = Math.max(0, Number(settings.otherDeductionsOld !== undefined && settings.otherDeductionsOld !== null ? settings.otherDeductionsOld : 50000));
    const claimable = round2(sec80c + sec80d + otherDeductions);
    totalDeductions = Math.min(netTaxableProfit, claimable);
    netTaxableIncome = Math.max(0, round2(netTaxableProfit - totalDeductions));
  }

  // 4. Dynamic Slab Computation
  const slabBreakdown = [];
  let grossTaxBeforeRebate = 0;
  let rebate87a = 0;
  let is87aEligible = false;

  if (regime === "NEW") {
    // New Tax Regime Slabs (FY 2025-26 / 2026-27 under Section 115BAC):
    // Up to 3,00,000: 0%
    // 3,00,001 to 7,00,000: 5%
    // 7,00,001 to 10,00,000: 10%
    // 10,00,001 to 12,00,000: 15%
    // 12,00,001 to 15,00,000: 20%
    // Above 15,00,000: 30%
    const slabs = [
      { min: 0, max: 300000, rate: 0, label: "Up to ₹3,00,000" },
      { min: 300000, max: 700000, rate: 0.05, label: "₹3,00,001 to ₹7,00,000" },
      { min: 700000, max: 1000000, rate: 0.10, label: "₹7,00,001 to ₹10,00,000" },
      { min: 1000000, max: 1200000, rate: 0.15, label: "₹10,00,001 to ₹12,00,000" },
      { min: 1200000, max: 1500000, rate: 0.20, label: "₹12,00,001 to ₹15,00,000" },
      { min: 1500000, max: Infinity, rate: 0.30, label: "Above ₹15,00,000" }
    ];

    for (const s of slabs) {
      if (netTaxableIncome > s.min) {
        const taxableInSlab = Math.min(netTaxableIncome, s.max) - s.min;
        const taxInSlab = round2(taxableInSlab * s.rate);
        grossTaxBeforeRebate += taxInSlab;
        slabBreakdown.push({
          label: s.label,
          ratePercent: s.rate * 100,
          taxableAmount: taxableInSlab,
          taxAmount: taxInSlab,
          isActive: true
        });
      } else {
        slabBreakdown.push({
          label: s.label,
          ratePercent: s.rate * 100,
          taxableAmount: 0,
          taxAmount: 0,
          isActive: false
        });
      }
    }
    grossTaxBeforeRebate = round2(grossTaxBeforeRebate);

    // Section 87A Full Rebate in New Regime: Net Taxable Income <= ₹7,00,000
    if (netTaxableIncome <= 700000 && grossTaxBeforeRebate > 0) {
      is87aEligible = true;
      rebate87a = grossTaxBeforeRebate;
    } else if (netTaxableIncome <= 700000) {
      is87aEligible = true;
      rebate87a = 0;
    }
  } else {
    // Old Tax Regime Slabs:
    // Up to 2,50,000: 0%
    // 2,50,001 to 5,00,000: 5% (max 12,500)
    // 5,00,001 to 10,00,000: 20% (max 1,00,000)
    // Above 10,00,000: 30%
    const slabs = [
      { min: 0, max: 250000, rate: 0, label: "Up to ₹2,50,000" },
      { min: 250000, max: 500000, rate: 0.05, label: "₹2,50,001 to ₹5,00,000" },
      { min: 500000, max: 1000000, rate: 0.20, label: "₹5,00,001 to ₹10,00,000" },
      { min: 1000000, max: Infinity, rate: 0.30, label: "Above ₹10,00,000" }
    ];

    for (const s of slabs) {
      if (netTaxableIncome > s.min) {
        const taxableInSlab = Math.min(netTaxableIncome, s.max) - s.min;
        const taxInSlab = round2(taxableInSlab * s.rate);
        grossTaxBeforeRebate += taxInSlab;
        slabBreakdown.push({
          label: s.label,
          ratePercent: s.rate * 100,
          taxableAmount: taxableInSlab,
          taxAmount: taxInSlab,
          isActive: true
        });
      } else {
        slabBreakdown.push({
          label: s.label,
          ratePercent: s.rate * 100,
          taxableAmount: 0,
          taxAmount: 0,
          isActive: false
        });
      }
    }
    grossTaxBeforeRebate = round2(grossTaxBeforeRebate);

    // Section 87A Rebate in Old Regime: Net Taxable Income <= ₹5,00,000
    if (netTaxableIncome <= 500000 && grossTaxBeforeRebate > 0) {
      is87aEligible = true;
      rebate87a = Math.min(grossTaxBeforeRebate, 12500);
    } else if (netTaxableIncome <= 500000) {
      is87aEligible = true;
      rebate87a = 0;
    }
  }

  const taxAfterRebate = Math.max(0, round2(grossTaxBeforeRebate - rebate87a));
  const cess = round2(taxAfterRebate * 0.04);
  const totalTaxPayable = round2(taxAfterRebate + cess);
  const effectiveTaxRate = annualRevenue > 0 ? round2((totalTaxPayable / annualRevenue) * 100) : 0;
  const effectiveProfitTaxRate = netTaxableProfit > 0 ? round2((totalTaxPayable / netTaxableProfit) * 100) : 0;

  return {
    regime,
    filingScheme,
    annualRevenue,
    profitDetails,
    netTaxableProfit,
    deductions: {
      standardDeduction,
      sec80c,
      sec80d,
      otherDeductions,
      totalDeductions
    },
    netTaxableIncome,
    slabBreakdown,
    grossTaxBeforeRebate,
    rebate87a,
    is87aEligible,
    taxAfterRebate,
    cess,
    totalTaxPayable,
    effectiveTaxRate,
    effectiveProfitTaxRate,
    itcAudit: {
      cgst,
      sgst,
      igst,
      totalBillGst,
      billSubtotal,
      isBusinessResale,
      isGstinValid,
      itcStatus,
      itcStatusLabel,
      eligibleItc,
      blockedItc,
      grossOutputGst,
      netPayableCashGst,
      itcCashSavings
    }
  };
}

/**
 * Calculates turnover, deemed profit under Sec 44AD, and estimated tax under New Regime
 * (Retained for full backwards compatibility)
 * @param {Object} invoice
 * @param {Object} audit
 * @param {Object} [settings] - Optional user overrides for turnover and digital ratio
 */
export function calculateTaxMetrics(invoice, audit, settings = {}) {
  const comp = calculateComprehensiveTax(invoice, audit, settings);

  const audit_summary = {
    total_turnover: comp.annualRevenue,
    deemed_profit: comp.netTaxableProfit,
    number_of_invoices_analyzed: 1,
    current_invoice_total: (audit && audit.calculated_total) || 0,
    total_gst_paid_on_purchases: comp.itcAudit.totalBillGst,
    eligible_itc: comp.itcAudit.eligibleItc,
    invoices_missing_gstin: comp.itcAudit.isGstinValid ? 0 : 1,
    disallowed_itc: comp.itcAudit.blockedItc,
    vendor_name: (invoice && invoice.vendor_name) || "Supplier",
    supplier_gstin: (invoice && invoice.gstin) || "MISSING",
    digital_ratio: (comp.profitDetails.digitalPercent || 60) / 100,
    cash_ratio: (comp.profitDetails.cashPercent || 40) / 100
  };

  const calculated_tax = {
    recommended_form: comp.filingScheme === "REGULAR" ? "ITR-3 (Normal Business P&L)" : "ITR-4 (Presumptive Scheme - Sec 44AD)",
    annual_turnover: comp.annualRevenue,
    digital_percent: comp.profitDetails.digitalPercent || 60,
    cash_percent: comp.profitDetails.cashPercent || 40,
    deemed_net_profit: comp.netTaxableProfit,
    profit_computation_basis: comp.profitDetails.description,
    estimated_tax_liability: comp.totalTaxPayable,
    tax_regime: comp.regime === "NEW" ? "New Regime (Section 115BAC)" : "Old Tax Regime",
    rebate_87a_applied: comp.is87aEligible,
    eligible_itc: comp.itcAudit.eligibleItc,
    blocked_itc: comp.itcAudit.blockedItc,
    comprehensive: comp
  };

  return { audit_summary, calculated_tax };
}
