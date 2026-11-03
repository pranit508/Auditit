// Gemini 2.5 Flash Tax Suggestions Generator for AUDIT IT
import { formatRupees } from "./auditEngine.js";

const DEFAULT_API_KEY = "AQ.Ab8RN6LhTNa6kIQRpd_OijgrXNfmwLOw7rcxiMN8aWW-_U7mPw";

/**
 * Calls Gemini 2.5 Flash to generate tax and ITR suggestions for small retail shopkeepers.
 * 
 * @param {Object} audit_summary - Financial context (turnover, invoices, GST, missing GSTINs)
 * @param {Object} calculated_tax - Code-calculated tax liability & deemed profit under Sec 44AD
 * @param {string} [apiKey] - Google Gemini API Key
 * @returns {Promise<{ suggestions: string[], disclaimer: string, isAiGenerated: boolean }>}
 */
export async function generate_tax_suggestions(audit_summary, calculated_tax, apiKey = null) {
  const effectiveKey = (apiKey && apiKey.trim().length > 10) ? apiKey.trim() : DEFAULT_API_KEY;

  if (!audit_summary || !calculated_tax) {
    return {
      suggestions: [
        "Recommended ITR Form: File ITR-4 Sugam under Sec 44AD presumptive scheme without maintaining formal accounting books.",
        "GST ITC Opportunity / Risk: Verified supplier GSTINs ensure 100% of input tax credit reduces your monthly GST liability.",
        "Advance Tax & Action Item: Remind yourself of the March 15 advance tax payment deadline."
      ],
      disclaimer: "Not tax advice; verify with your CA.",
      isAiGenerated: false
    };
  }

  const formattedData = JSON.stringify({
    turnover: formatRupees(audit_summary.total_turnover),
    deemed_profit: formatRupees(audit_summary.deemed_profit),
    invoices_analyzed: audit_summary.number_of_invoices_analyzed,
    total_gst_paid_on_purchases: formatRupees(audit_summary.total_gst_paid_on_purchases),
    eligible_itc: formatRupees(audit_summary.eligible_itc),
    invoices_missing_gstin: audit_summary.invoices_missing_gstin,
    disallowed_itc: formatRupees(audit_summary.disallowed_itc),
    estimated_tax_liability: formatRupees(calculated_tax.estimated_tax_liability),
    tax_regime: calculated_tax.tax_regime,
    recommended_form: calculated_tax.recommended_form
  }, null, 2);

  const promptText = `You are a tax preparation assistant for small Indian retail shopkeepers.
Given this pre-calculated financial data:
${formattedData}

Provide 3 concise bullet points:
1. Recommended ITR Form: (e.g., ITR-4 Sugam under Sec 44AD vs ITR-3) with a 1-sentence reason.
2. GST ITC Opportunity / Risk: Explain how much Input Tax Credit can be claimed from audited bills and warn about unverified supplier GSTINs.
3. Advance Tax & Action Item: Remind them of the March 15 advance tax deadline.

Tone: Grounded, simple English, no complex jargon. Include a clear disclaimer: 'Not tax advice; verify with your CA.'`;

  // Attempt live Gemini call with configured key
  if (effectiveKey && effectiveKey.trim().length > 10) {
    try {
      const isBearer = effectiveKey.trim().startsWith("AQ.");
      const url = isBearer
        ? "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
        : `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${effectiveKey.trim()}`;

      const headers = {
        "Content-Type": "application/json"
      };
      if (isBearer) {
        headers["Authorization"] = `Bearer ${effectiveKey.trim()}`;
      } else {
        headers["x-goog-api-key"] = effectiveKey.trim();
      }

      const payload = {
        contents: [
          {
            parts: [{ text: promptText }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 500
        }
      };

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content) {
          return parseAiResponse(content);
        }
      } else {
        console.warn(`Gemini 2.5 Flash API returned status ${res.status}; using local generator.`);
      }
    } catch (e) {
      console.warn("Gemini 2.5 Flash fetch error; using local generator:", e);
    }
  }

  // Fallback high-fidelity deterministic generator matching the exact prompt structure
  return generateLocalTaxSuggestions(audit_summary, calculated_tax);
}

/**
 * Parses Gemini response text into structured bullets and disclaimer
 */
function parseAiResponse(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const bullets = [];
  let disclaimer = "Not tax advice; verify with your CA.";

  for (const line of lines) {
    if (line.toLowerCase().includes("disclaimer") || line.toLowerCase().includes("not tax advice")) {
      disclaimer = line.replace(/^\*+/, "").replace(/\*+$/, "").trim();
    } else if (/^(\d+\.|\*|-|•)\s+/.test(line)) {
      bullets.push(line.replace(/^(\d+\.|\*|-|•)\s+/, "").trim());
    } else if (bullets.length > 0 && bullets.length < 3) {
      bullets[bullets.length - 1] += " " + line;
    }
  }

  return {
    suggestions: bullets.slice(0, 3),
    disclaimer,
    isAiGenerated: true
  };
}

/**
 * Local deterministic suggestions generator matching the exact Gemini prompt specifications
 */
function generateLocalTaxSuggestions(audit_summary, calculated_tax) {
  const hasMissingGstin = audit_summary.invoices_missing_gstin > 0;
  const eligibleItcStr = formatRupees(audit_summary.eligible_itc);
  const disallowedItcStr = formatRupees(audit_summary.disallowed_itc);

  const bullet1 = `Recommended ITR Form: File ITR-4 Sugam under Section 44AD presumptive scheme because your gross retail turnover is well under ₹2-3 Crores, allowing you to declare deemed profit without maintaining bulky account books.`;

  const bullet2 = hasMissingGstin
    ? `GST ITC Opportunity / Risk: You can claim ${eligibleItcStr} in Input Tax Credit from verified bills, but ${disallowedItcStr} is at risk/disallowed because supplier GSTIN is missing on some bills. Always collect bills with valid GSTIN to lower your net tax.`
    : `GST ITC Opportunity / Risk: You have ${eligibleItcStr} in eligible Input Tax Credit from audited bills with valid GSTINs. Keeping all purchase bills audited ensures 100% of GST paid reduces your monthly tax outgo.`;

  const bullet3 = `Advance Tax & Action Item: Remind yourself to pay 100% of your advance tax by March 15 to avoid penal interest under Section 234B/234C, especially if your net tax payable exceeds ₹10,000 for the financial year.`;

  return {
    suggestions: [bullet1, bullet2, bullet3],
    disclaimer: "Not tax advice; verify with your CA.",
    isAiGenerated: false
  };
}
