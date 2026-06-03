from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import os

def create_prescription(filename):
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter
    
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, "Apollo Hospitals")
    
    c.setFont("Helvetica", 12)
    c.drawString(50, height - 70, "Dr. S. Sharma, MBBS")
    c.drawString(50, height - 85, "Reg No: DL/12345/2010")
    c.drawString(50, height - 100, "Date: 01/11/2024")
    
    c.line(50, height - 110, width - 50, height - 110)
    
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, height - 140, "Patient Details")
    c.setFont("Helvetica", 12)
    c.drawString(50, height - 155, "Patient: Rajesh Kumar")
    c.drawString(50, height - 170, "Member ID: EMP001")
    
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, height - 200, "Diagnosis")
    c.setFont("Helvetica", 12)
    c.drawString(50, height - 215, "Viral Fever")
    
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, height - 245, "Rx (Prescription)")
    c.setFont("Helvetica", 12)
    c.drawString(50, height - 260, "1. Paracetamol 650mg - 1 tab twice a day for 3 days")
    c.drawString(50, height - 275, "2. Vitamin C - 1 tab daily")
    
    c.line(50, height - 300, width - 50, height - 300)
    
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, height - 325, "Consultation Fee: 1500 INR")
    
    c.setFont("Helvetica-Oblique", 10)
    c.drawString(50, 50, "Signature: Dr. S. Sharma")
    c.save()

def create_bill(filename):
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter
    
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, "Elite Skin Clinic")
    
    c.setFont("Helvetica", 12)
    c.drawString(50, height - 70, "Dr. K. Patel, MD Dermatology")
    c.drawString(50, height - 85, "Reg No: MH/67890/2015")
    c.drawString(50, height - 100, "Date: 15/11/2024")
    
    c.line(50, height - 110, width - 50, height - 110)
    
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, height - 140, "Invoice")
    c.setFont("Helvetica", 12)
    c.drawString(50, height - 155, "Patient: Priya Sharma")
    
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, height - 185, "Diagnosis")
    c.setFont("Helvetica", 12)
    c.drawString(50, height - 200, "Skin aging / Wrinkles")
    
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, height - 230, "Services Rendered")
    c.setFont("Helvetica", 12)
    c.drawString(50, height - 245, "- Consultation: 1000 INR")
    c.drawString(50, height - 260, "- Treatment: Cosmetic Botox Injections: 7000 INR")
    
    c.line(50, height - 280, width - 50, height - 280)
    
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, height - 310, "Total Bill Amount: 8000 INR")
    
    c.setFont("Helvetica-Oblique", 10)
    c.drawString(50, 50, "Authorized Signatory: K. Patel")
    c.save()

if __name__ == "__main__":
    out_dir = "../frontend/public/samples"
    os.makedirs(out_dir, exist_ok=True)
    create_prescription(os.path.join(out_dir, "sample_approved.pdf"))
    create_bill(os.path.join(out_dir, "sample_rejected.pdf"))
    print("PDFs generated successfully!")
