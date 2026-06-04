"""
ai_extractor.py — sends raw ocr text to groq and gets back structured data

the idea is simple: give groq messy document text, ask it to pull out
the important fields in a clean json format
"""

import json
from groq import Groq
from config import GROQ_API_KEY
from models import ExtractedDocument

client = Groq(api_key=GROQ_API_KEY)

# this prompt tells groq exactly what to extract from a medical document
EXTRACTION_PROMPT = """you are a medical document reader. given the raw text from a medical document,
extract the following fields into a json object. if a field is not present, use null.

FEW-SHOT EXAMPLES:
[Example 1 - Prescription]
RAW TEXT: "Apollo Hospital Dr. Smith 12/05/2026 Patient: John Doe Diagnosis: Viral Fever Rx: Paracetamol 500mg"
JSON: {"document_type": "prescription", "doctor_name": "Dr. Smith", "clinic_or_hospital": "Apollo Hospital", "patient_name": "John Doe", "treatment_date": "2026-05-12", "diagnosis": "Viral Fever", "medicines": ["Paracetamol 500mg"]}

[Example 2 - Bill]
RAW TEXT: "Elite Clinic Invoice Date: 01/01/2026 Patient: Mary Jane Root Canal - 4000 INR Total Due: 4000 INR"
JSON: {"document_type": "bill", "clinic_or_hospital": "Elite Clinic", "patient_name": "Mary Jane", "treatment_date": "2026-01-01", "line_items": [{"item": "Root Canal", "amount": 4000}], "total_amount": 4000.0}

return ONLY valid json, no extra text:

{
  "document_type": "prescription" or "bill" or "report" or "pharmacy_bill",
  "doctor_name": "full name of the doctor",
  "doctor_registration": "registration number (format like KA/12345/2015)",
  "clinic_or_hospital": "name of the clinic or hospital",
  "patient_name": "patient's full name",
  "patient_age": "age as written",
  "treatment_date": "date in YYYY-MM-DD format",
  "diagnosis": "the medical diagnosis or chief complaint",
  "medicines": ["list of medicines prescribed"],
  "tests": ["list of diagnostic tests"],
  "procedures": ["list of procedures performed"],
  "line_items": [{"item": "description", "amount": 1000}],
  "total_amount": 1500.00
}

here is the raw document text:
"""


def extract_from_text(raw_text: str) -> ExtractedDocument:
    """
    send raw ocr text to groq and parse the response into an ExtractedDocument.
    falls back to a mostly-empty document if anything goes wrong.
    """
    if not raw_text.strip():
        return ExtractedDocument(raw_text="[empty document]")

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": "you extract structured data from medical documents. you use few-shot prompting logic to match the schema exactly. respond only with valid json."
                },
                {
                    "role": "user",
                    "content": EXTRACTION_PROMPT + raw_text
                }
            ],
            temperature=0.1,  # low temp for consistent extraction
            max_tokens=2000,
        )

        # grab the response text
        content = response.choices[0].message.content.strip()

        # sometimes groq wraps the json in markdown code blocks, strip those
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
            content = content.strip()

        parsed = json.loads(content)

        # build the ExtractedDocument from the parsed json
        doc = ExtractedDocument(
            document_type=parsed.get("document_type", ""),
            doctor_name=parsed.get("doctor_name"),
            doctor_registration=parsed.get("doctor_registration"),
            clinic_or_hospital=parsed.get("clinic_or_hospital"),
            patient_name=parsed.get("patient_name"),
            patient_age=parsed.get("patient_age"),
            treatment_date=parsed.get("treatment_date"),
            diagnosis=parsed.get("diagnosis"),
            medicines=parsed.get("medicines") or [],
            tests=parsed.get("tests") or [],
            procedures=parsed.get("procedures") or [],
            line_items=parsed.get("line_items") or [],
            total_amount=parsed.get("total_amount"),
            raw_text=raw_text,
        )
        return doc

    except json.JSONDecodeError as e:
        print(f"failed to parse groq response as json: {e}")
        return ExtractedDocument(raw_text=raw_text)

    except Exception as e:
        print(f"groq extraction failed: {e}")
        return ExtractedDocument(raw_text=raw_text)


def extract_from_claim_data(claim_data: dict) -> ExtractedDocument:
    """
    for test cases where we already have structured data (no actual document),
    convert the test case dict directly into an ExtractedDocument.
    this lets us skip ocr/groq when running automated tests.
    """
    doc = ExtractedDocument()

    # pull from prescription data if present
    prescription = claim_data.get("documents", {}).get("prescription", {})
    if prescription:
        doc.document_type = "prescription"
        doc.doctor_name = prescription.get("doctor_name")
        doc.doctor_registration = prescription.get("doctor_reg")
        doc.diagnosis = prescription.get("diagnosis")
        doc.medicines = prescription.get("medicines_prescribed", [])
        doc.tests = prescription.get("tests_prescribed", [])
        doc.procedures = prescription.get("procedures", [])
        if prescription.get("treatment"):
            doc.procedures.append(prescription["treatment"])

    # pull from bill data if present
    bill = claim_data.get("documents", {}).get("bill", {})
    if bill:
        items = []
        for key, value in bill.items():
            if isinstance(value, (int, float)):
                items.append({"item": key.replace("_", " "), "amount": value})
            elif key == "test_names":
                doc.tests = value
        doc.line_items = items
        doc.total_amount = sum(item["amount"] for item in items)

    doc.patient_name = claim_data.get("member_name")
    doc.treatment_date = claim_data.get("treatment_date")

    return doc
