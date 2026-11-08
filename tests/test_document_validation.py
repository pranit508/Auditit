import json
import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
import server


class DocumentValidationTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(server.app)

    def upload(self):
        return self.client.post(
            "/api/analyze-bill",
            headers={"x-api-key": "test-only"},
            files={"file": ("document.png", b"test document", "image/png")},
        )

    def test_document_with_all_invoice_signals_missing_is_rejected(self):
        for document in [
            {"document_type": "other", "is_tax_invoice": False, "items": []},
            {"document_type": "tax_invoice", "is_tax_invoice": True, "invoice_evidence": [], "items": []},
        ]:
            with self.subTest(document=document), \
                 patch.object(server, "call_gemini_rest", new=AsyncMock(return_value=json.dumps(document))), \
                 patch.object(server, "sanitize_and_clean_invoice") as clean, \
                 patch.object(server, "get_genai_client") as fallback:
                response = self.upload()
                self.assertEqual(response.status_code, 422)
                self.assertEqual(response.json()["error"], "Please upload a valid tax invoice.")
                clean.assert_not_called()
                fallback.assert_not_called()

    def test_valid_tax_invoice_continues(self):
        document = {
            "document_type": "tax_invoice", "is_tax_invoice": True,
            "invoice_evidence": ["Tax Invoice INV-123", "CGST 9%"],
            "vendor_name": "Test Shop", "invoice_number": "INV-123",
            "gstin": "27ABCDE1234F1Z5",
            "supplier_gstin_source": "supplier",
            "items": [{"description": "LED bulb", "quantity": 2, "unit_rate": 100, "total_amount": 200}],
            "subtotal": 200, "cgst": 18, "sgst": 18, "igst": 0, "declared_total": 236,
        }
        with patch.object(server, "call_gemini_rest", new=AsyncMock(return_value=json.dumps(document))):
            response = self.upload()
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["document_type"], "tax_invoice")
        for field in ["gstin", "items", "vendor_name", "invoice_number", "declared_total", "supplier_gstin_source"]:
            missing = {key: value for key, value in document.items() if key != field}
            with self.subTest(missing=field), patch.object(server, "call_gemini_rest", new=AsyncMock(return_value=json.dumps(missing))):
                response = self.upload()
                self.assertEqual(response.status_code, 200)

    def test_each_individual_signal_is_sufficient(self):
        for field, value in [
            ("vendor_name", "Example Seller"),
            ("invoice_number", "INV-1"),
            ("gstin", "27ABCDE1234F1Z5"),
            ("declared_total", 125),
            ("items", [{"description": "Item", "quantity": 1, "unit_rate": 100}]),
        ]:
            with self.subTest(signal=field), patch.object(server, "call_gemini_rest", new=AsyncMock(return_value=json.dumps({field: value}))):
                self.assertEqual(self.upload().status_code, 200)

    def test_unsupported_file_rejected_before_ai(self):
        with patch.object(server, "call_gemini_rest") as ai:
            response = self.client.post("/api/analyze-bill", files={"file": ("resume.txt", b"resume", "text/plain")})
            self.assertEqual(response.status_code, 422)
            ai.assert_not_called()

    def test_invalid_process_request_never_calculates(self):
        with patch.object(server, "sanitize_and_clean_invoice") as clean:
            response = self.client.post("/api/process-invoice", json={
                "extracted_data": {"vendor_name": None, "invoice_no": None, "gstin": None,
                                   "declared_total": None, "items": []}
            })
            self.assertEqual(response.status_code, 422)
            clean.assert_not_called()


if __name__ == "__main__":
    unittest.main()
