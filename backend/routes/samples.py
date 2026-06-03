import io
import random
from datetime import datetime, timedelta
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

router = APIRouter(prefix="/api/samples", tags=["samples"])

APPROVED_DIAGNOSES = [
    ("Viral Fever", [("Paracetamol 650mg", 150), ("Vitamin C", 100)], 1500),
    ("Dengue Fever", [("IV Fluids", 500), ("Paracetamol", 200), ("CBC Test", 400)], 2000),
    ("Food Poisoning", [("Antibiotics", 300), ("Antacids", 150)], 1000),
    ("Fractured Arm", [("X-Ray", 800), ("Plaster Cast", 1200), ("Painkillers", 200)], 1500),
]

REJECTED_DIAGNOSES = [
    ("Cosmetic Surgery", [("Rhinoplasty", 45000), ("Anesthesia", 5000)], 2000),
    ("Weight Loss Treatment", [("Bariatric Consultation", 2000), ("Diet Plan", 3000)], 1500),
    ("Infertility Treatment", [("IVF Consultation", 5000), ("Hormone Tests", 8000)], 3000),
    ("Dental Root Canal", [("Root Canal", 6000), ("Crown", 4000)], 1000),  # Will fail per-claim limit (5000) or sublimit
]

def random_date_str():
    days_ago = random.randint(1, 30)
    d = datetime.now() - timedelta(days=days_ago)
    return d.strftime("%d/%m/%Y")

@router.get("/approved")
async def get_approved_sample():
    diagnosis, items, consult_fee = random.choice(APPROVED_DIAGNOSES)
    return generate_pdf_response("Apollo Hospitals", "Dr. S. Sharma", diagnosis, items, consult_fee, "Rajesh Kumar", "EMP001")

@router.get("/rejected")
async def get_rejected_sample():
    diagnosis, items, consult_fee = random.choice(REJECTED_DIAGNOSES)
    return generate_pdf_response("Elite Skin Clinic", "Dr. K. Patel", diagnosis, items, consult_fee, "Priya Sharma", "EMP002")

def generate_pdf_response(hospital, doctor, diagnosis, items, consult_fee, patient, member_id):
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, hospital)
    
    c.setFont("Helvetica", 12)
    c.drawString(50, height - 70, f"{doctor}, MD")
    c.drawString(50, height - 85, f"Reg No: MH/{random.randint(10000, 99999)}/2015")
    c.drawString(50, height - 100, f"Date: {random_date_str()}")
    
    c.line(50, height - 110, width - 50, height - 110)
    
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, height - 140, "Patient Details")
    c.setFont("Helvetica", 12)
    c.drawString(50, height - 155, f"Patient: {patient}")
    c.drawString(50, height - 170, f"Member ID: {member_id}")
    
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, height - 200, "Diagnosis")
    c.setFont("Helvetica", 12)
    c.drawString(50, height - 215, diagnosis)
    
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, height - 245, "Services & Prescription")
    c.setFont("Helvetica", 12)
    
    y = height - 260
    total = consult_fee
    for item_name, item_cost in items:
        c.drawString(50, y, f"- {item_name}: {item_cost} INR")
        total += item_cost
        y -= 15
    
    c.line(50, y - 10, width - 50, y - 10)
    
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y - 35, f"Consultation Fee: {consult_fee} INR")
    
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y - 65, f"Total Bill Amount: {total} INR")
    
    c.setFont("Helvetica-Oblique", 10)
    c.drawString(50, 50, f"Authorized Signatory: {doctor}")
    c.save()
    
    buffer.seek(0)
    return StreamingResponse(
        buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"attachment; filename=claim_sample_{random.randint(100,999)}.pdf"}
    )
