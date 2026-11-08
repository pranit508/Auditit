"""Optional live smoke test: synthetic PDF fixtures only, no user data."""
from fastapi.testclient import TestClient
from server import app


def pdf(lines):
    text = "BT /F1 12 Tf 50 780 Td "
    for line in lines:
        text += "(" + line.replace("(", r"\(").replace(")", r"\)") + ") Tj 0 -24 Td "
    stream = (text + "ET").encode()
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
    ]
    output = b"%PDF-1.4\n"
    offsets = [0]
    for i, obj in enumerate(objects, 1):
        offsets.append(len(output))
        output += f"{i} 0 obj\n".encode() + obj + b"\nendobj\n"
    xref = len(output)
    output += b"xref\n0 6\n0000000000 65535 f \n"
    for offset in offsets[1:]:
        output += f"{offset:010} 00000 n \n".encode()
    return output + f"trailer << /Size 6 /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode()


if __name__ == "__main__":
    fixtures = [
        ("resume", ["RESUME", "Example Candidate", "Experience: Accountant",
                    "Handled GST, invoice records and total amounts.", "Skills: Excel and bookkeeping."], 422),
        ("invoice", ["TAX INVOICE", "Seller: Example Electrical Store",
                     "GSTIN: 27ABCDE1234F1Z5", "Invoice No: INV-123", "Date: 07-11-2026",
                     "Description       Qty    Rate    Amount", "LED bulbs         2      100     200",
                     "Subtotal: 200", "CGST 9%: 18", "SGST 9%: 18", "Grand Total: INR 236"], 200),
    ]
    with TestClient(app) as client:
        for name, lines, expected in fixtures:
            response = client.post("/api/analyze-bill",
                headers={"x-api-key": "stale-browser-credential"},
                files={"file": (name + ".pdf", pdf(lines), "application/pdf")})
            print(name, response.status_code, response.json().get("code", "accepted"))
            assert response.status_code == expected, f"{name}: unexpected status {response.status_code}"
