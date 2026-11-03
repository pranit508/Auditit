"""
Gemini 2.5 Flash Tax Suggestions Generator
Function: generate_tax_suggestions(audit_summary, calculated_tax)
"""

import json
import os
import urllib.request
import urllib.error

def format_rupees(amount):
    """Format numeric amount into Indian Currency display (e.g. ₹1,24,570.00)."""
    if amount is None:
        return "₹0.00"
    num = float(amount)
    is_neg = num < 0
    abs_num = abs(num)
    parts = f"{abs_num:.2f}".split(".")
    int_part, dec_part = parts[0], parts[1]
    if len(int_part) > 3:
        last3 = int_part[-3:]
        others = int_part[:-3]
        res = ""
        while len(others) > 2:
            res = "," + others[-2:] + res
            others = others[:-2]
        int_part = others + res + "," + last3
    return f"{'-₹' if is_neg else '₹'}{int_part}.{dec_part}"

def generate_tax_suggestions(audit_summary: dict, calculated_tax: dict, api_key: str = None) -> dict:
    """
    Generate tax suggestions for small retail shopkeepers using Gemini 2.5 Flash.
    
    Args:
        audit_summary (dict): Financial data containing:
            - total_turnover
            - deemed_profit
            - number_of_invoices_analyzed
            - total_gst_paid_on_purchases
            - invoices_missing_gstin
            - disallowed_itc / eligible_itc
        calculated_tax (dict): Code-calculated tax liability:
            - deemed_net_profit
            - estimated_tax_liability
            - recommended_form
            - tax_regime
        api_key (str, optional): Google Gemini API Key. If omitted, checks GEMINI_API_KEY env.
        
    Returns:
        dict: Contains 'suggestions' (list of 3 bullets), 'disclaimer', and 'raw_text'.
    """
    if not api_key:
        api_key = os.environ.get("GEMINI_API_KEY", "")

    if not audit_summary or audit_summary.get("total_turnover", 0) == 0:
        return {
            "suggestions": [
                "Document rejected by gatekeeper: not a commercial bill or invoice.",
                "Zero hallucination rule: no tax suggestions generated on non-bill media.",
                "Please upload a genuine invoice or enter bill details manually."
            ],
            "disclaimer": "Document not eligible for tax audit.",
            "raw_text": "Document rejected: Not a business invoice.",
            "is_ai_generated": False
        }

    # Structured context representation
    formatted_data = json.dumps({
        "turnover": format_rupees(audit_summary.get("total_turnover")),
        "deemed_profit": format_rupees(audit_summary.get("deemed_profit")),
        "invoices_analyzed": audit_summary.get("number_of_invoices_analyzed", 1),
        "total_gst_paid_on_purchases": format_rupees(audit_summary.get("total_gst_paid_on_purchases")),
        "eligible_itc": format_rupees(audit_summary.get("eligible_itc")),
        "invoices_missing_gstin": audit_summary.get("invoices_missing_gstin", 0),
        "disallowed_itc": format_rupees(audit_summary.get("disallowed_itc")),
        "estimated_tax_liability": format_rupees(calculated_tax.get("estimated_tax_liability")),
        "tax_regime": calculated_tax.get("tax_regime", "New Regime (Section 115BAC)"),
        "recommended_form": calculated_tax.get("recommended_form", "ITR-4 (Presumptive Scheme - Sec 44AD)")
    }, indent=2)

    prompt = f"""You are a tax preparation assistant for small Indian retail shopkeepers.
Given this pre-calculated financial data:
{formatted_data}

Provide 3 concise bullet points:
1. Recommended ITR Form: (e.g., ITR-4 Sugam under Sec 44AD vs ITR-3) with a 1-sentence reason.
2. GST ITC Opportunity / Risk: Explain how much Input Tax Credit can be claimed from audited bills and warn about unverified supplier GSTINs.
3. Advance Tax & Action Item: Remind them of the March 15 advance tax deadline.

Tone: Grounded, simple English, no complex jargon. Include a clear disclaimer: 'Not tax advice; verify with your CA.'"""

    if api_key and len(api_key.strip()) > 10:
        cleaned_key = api_key.strip()
        is_bearer = cleaned_key.startswith("AQ.")
        if is_bearer:
            url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
            req_headers = {
                "Authorization": f"Bearer {cleaned_key}",
                "Content-Type": "application/json"
            }
        else:
            url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
            req_headers = {
                "x-goog-api-key": cleaned_key,
                "Content-Type": "application/json"
            }
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 500}
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers=req_headers
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                res_body = json.loads(response.read().decode("utf-8"))
                text = res_body["candidates"][0]["content"]["parts"][0]["text"]
                return {
                    "suggestions": [line.strip() for line in text.split("\n") if line.strip().startswith(("1.", "2.", "3.", "*", "-", "•"))],
                    "disclaimer": "Not tax advice; verify with your CA.",
                    "raw_text": text,
                    "is_ai_generated": True
                }
        except Exception as err:
            print(f"[Gemini 2.5 Flash] Call error ({err}); falling back to local generator.")

    # Deterministic local fallback
    missing_count = audit_summary.get("invoices_missing_gstin", 0)
    eligible_itc = format_rupees(audit_summary.get("eligible_itc", 0))
    disallowed_itc = format_rupees(audit_summary.get("disallowed_itc", 0))

    bullet1 = "Recommended ITR Form: File ITR-4 Sugam under Section 44AD presumptive scheme because your retail turnover is within ₹2-3 Crores, allowing you to declare deemed profit without maintaining formal balance sheets."
    bullet2 = (
        f"GST ITC Opportunity / Risk: You can claim {eligible_itc} in Input Tax Credit from verified bills, but {disallowed_itc} is disallowed due to missing supplier GSTIN. Ensure all supplier bills have valid GSTINs."
        if missing_count > 0 else
        f"GST ITC Opportunity / Risk: You have {eligible_itc} in eligible Input Tax Credit ready to claim, which directly offsets your GST liability."
    )
    bullet3 = "Advance Tax & Action Item: Remind yourself to pay 100% of your advance tax by March 15 to prevent interest penalties under Section 234B/234C."

    return {
        "suggestions": [bullet1, bullet2, bullet3],
        "disclaimer": "Not tax advice; verify with your CA.",
        "raw_text": f"1. {bullet1}\n2. {bullet2}\n3. {bullet3}\n\nDisclaimer: Not tax advice; verify with your CA.",
        "is_ai_generated": False
    }

if __name__ == "__main__":
    # Test execution
    mock_audit = {
        "total_turnover": 3600000,
        "deemed_profit": 244800,
        "number_of_invoices_analyzed": 1,
        "total_gst_paid_on_purchases": 3087.00,
        "eligible_itc": 3087.00,
        "invoices_missing_gstin": 0,
        "disallowed_itc": 0.00
    }
    mock_tax = {
        "deemed_net_profit": 244800,
        "estimated_tax_liability": 0.00,
        "recommended_form": "ITR-4 (Presumptive Scheme - Sec 44AD)",
        "tax_regime": "New Regime (Section 115BAC)"
    }
    result = generate_tax_suggestions(mock_audit, mock_tax)
    print("Tax Suggestions Output:\n", json.dumps(result, indent=2))
