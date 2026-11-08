import unittest
from utils.clean_items import sanitize_and_clean_invoice


class BuyerDetailsTests(unittest.TestCase):
    def test_absent_buyer_stays_absent_and_printed_taxes_are_preserved(self):
        result = sanitize_and_clean_invoice({
            "vendor_name": "Test Store", "gstin": "27ABCDE1234F1Z5",
            "items": [], "cgst": 18, "sgst": 18, "igst": 0,
        })
        for field in ("buyer_name", "buyer_address", "buyer_gstin"):
            self.assertIsNone(result[field])
        self.assertEqual((result["cgst"], result["sgst"], result["igst"]), (18, 18, 0))

    def test_actual_buyer_preserved(self):
        buyer = {"buyer_name": "Example Buyer", "buyer_address": "12 Example Street", "buyer_gstin": "27ABCDE1234F1Z5"}
        result = sanitize_and_clean_invoice({**buyer, "items": []})
        for field, value in buyer.items():
            self.assertEqual(result[field], value)

    def test_invalid_buyer_gstin_removed(self):
        result = sanitize_and_clean_invoice({"buyer_gstin": "invalid", "items": []})
        self.assertIsNone(result["buyer_gstin"])
