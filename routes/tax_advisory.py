from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List
import re

router = APIRouter(prefix="/api/tax", tags=["Tax & ITR"])

class TaxCalculationRequest(BaseModel):
    calc_mode: str = "44AD"  # "44AD" or "REGULAR"
    annual_turnover: float = 3000000.0
    digital_share_percent: float = 80.0
    digital_profit_rate: float = 6.0
    cash_profit_rate: float = 8.0
    operating_expenses: float = 0.0
    current_invoice_subtotal: float = 0.0
    current_invoice_cgst: float = 0.0
    current_invoice_sgst: float = 0.0
    current_invoice_igst: float = 0.0
    supplier_gstin: Optional[str] = None
    buyer_gstin: Optional[str] = None

class TaxCalculationResponse(BaseModel):
    # ITC Details
    total_itc: float
    is_inter_state: bool
    gstin_valid: bool
    itc_compliance_notes: List[str]
    # Income Tax Projections
    taxable_business_income: float
    projected_income_tax: float
    rebate_87a_applied: bool
    tax_audit_required: bool
    itr_form_suggested: str
    compliance_message: str

def validate_gstin_format(gstin: Optional[str]) -> bool:
    if not gstin:
        return False
    # Standard 15-character Indian GSTIN pattern
    pattern = r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"
    return bool(re.match(pattern, gstin.strip().upper()))

@router.post("/calculate-advisory", response_model=TaxCalculationResponse)
def calculate_tax_advisory(req: TaxCalculationRequest):
    # 1. GST ITC Verification
    total_itc = round(req.current_invoice_cgst + req.current_invoice_sgst + req.current_invoice_igst, 2)
    gstin_valid = validate_gstin_format(req.supplier_gstin)
    
    # State matching for inter-state determination
    is_inter_state = False
    if req.supplier_gstin and req.buyer_gstin and len(req.supplier_gstin) >= 2 and len(req.buyer_gstin) >= 2:
        is_inter_state = req.supplier_gstin[:2] != req.buyer_gstin[:2]

    itc_notes = []
    if gstin_valid:
        itc_notes.append("Supplier GSTIN format verified (Section 16 compliant).")
    else:
        itc_notes.append("Warning: Supplier GSTIN missing or unverified. Verify on GST portal.")

    if total_itc > 0:
        itc_notes.append(f"Eligible for ₹{total_itc:,.2f} credit in GSTR-3B under Section 16.")
        itc_notes.append("Statutory 180-Day Rule: Settle supplier payment within 180 days to avoid ITC reversal.")

    # 2. Income Tax (ITR) Calculation
    if req.calc_mode == "44AD":
        digital_turnover = (req.annual_turnover * req.digital_share_percent) / 100.0
        cash_turnover = req.annual_turnover - digital_turnover
        taxable_income = (digital_turnover * (req.digital_profit_rate / 100.0)) + (cash_turnover * (req.cash_profit_rate / 100.0))
        itr_form = "ITR-4 (Sugam)"
        tax_audit = req.annual_turnover > 30000000.0 if req.digital_share_percent >= 95.0 else req.annual_turnover > 20000000.0
        msg = "Presumptive scheme elected. No formal profit & loss or balance sheet required under Section 44AB."
    else:
        total_expenses = req.current_invoice_subtotal + req.operating_expenses
        taxable_income = max(0.0, req.annual_turnover - total_expenses)
        itr_form = "ITR-3"
        tax_audit = req.annual_turnover > (100000000.0 if req.digital_share_percent >= 95.0 else 10000000.0)
        msg = "Regular business filing. Maintain vouchers, purchase invoices, and expense registers."

    taxable_income = round(taxable_income, 2)

    # 3. Tax Slabs (New Tax Regime FY 2025-26 / 2026-27 with Sec 87A rebate & 75k standard deduction)
    net_taxable = max(0.0, taxable_income - 75000.0)
    base_tax = 0.0
    if net_taxable > 300000.0:
        if net_taxable <= 700000.0:
            base_tax = (net_taxable - 300000.0) * 0.05
        elif net_taxable <= 1000000.0:
            base_tax = 20000.0 + (net_taxable - 700000.0) * 0.10
        elif net_taxable <= 1200000.0:
            base_tax = 50000.0 + (net_taxable - 1000000.0) * 0.15
        elif net_taxable <= 1500000.0:
            base_tax = 80000.0 + (net_taxable - 1200000.0) * 0.20
        else:
            base_tax = 140000.0 + (net_taxable - 1500000.0) * 0.30

    rebate_eligible = net_taxable <= 700000.0
    rebate = base_tax if rebate_eligible else 0.0
    tax_after_rebate = max(0.0, base_tax - rebate)
    cess = round(tax_after_rebate * 0.04, 2)
    projected_tax = round(tax_after_rebate + cess, 2)

    return TaxCalculationResponse(
        total_itc=total_itc,
        is_inter_state=is_inter_state,
        gstin_valid=gstin_valid,
        itc_compliance_notes=itc_notes,
        taxable_business_income=taxable_income,
        projected_income_tax=projected_tax,
        rebate_87a_applied=rebate_eligible,
        tax_audit_required=tax_audit,
        itr_form_suggested=itr_form,
        compliance_message=msg
    )
