import io
import random
from datetime import datetime, timedelta
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.colors import red, blue, black, gray, Color
from pdf2image import convert_from_bytes
import img2pdf
from PIL import ImageFilter, ImageEnhance, Image

# -----------------
# DATA POOLS
# -----------------

HOSPITALS = [
    "Apollo Hospitals", "Fortis Healthcare", "Max Super Speciality", "Medanta - The Medicity", 
    "Narayana Health", "Manipal Hospitals", "Global Hospitals", "Care Hospitals"
]

DOCTORS = [
    ("Dr. S. Sharma", "MD, General Medicine"), ("Dr. K. Patel", "MS, Orthopedics"),
    ("Dr. A. Gupta", "MD, Cardiology"), ("Dr. R. Singh", "MBBS, Family Medicine"),
    ("Dr. M. Reddy", "MD, Dermatology"), ("Dr. P. Kumar", "BDS, Dentistry"),
    ("Dr. V. Iyer", "MS, ENT"), ("Dr. S. Das", "MD, Pediatrics")
]

PATIENTS = [
    ("Rajesh Kumar", "EMP001"), ("Priya Sharma", "EMP002"), ("Amit Singh", "EMP003"),
    ("Neha Gupta", "EMP004"), ("Vikram Reddy", "EMP005"), ("Anita Desai", "EMP006")
]

# (Diagnosis, Items: [(Name, Cost)], Consultation, Subtype)
APPROVED_SCENARIOS = [
    # General Illness
    ("Viral Fever", [("Paracetamol 650mg", 150), ("Vitamin C", 100)], 1500, "prescription"),
    ("Dengue Fever", [("IV Fluids", 500), ("Paracetamol", 200), ("CBC Test", 400)], 2000, "prescription"),
    ("Food Poisoning", [("Antibiotics", 300), ("Antacids", 150)], 1000, "prescription"),
    ("Typhoid", [("Antibiotics", 500), ("Widal Test", 600)], 1200, "bill"),
    ("Malaria", [("Antimalarial Drugs", 800), ("Blood Smear", 300)], 1500, "prescription"),
    ("Migraine", [("Painkillers", 400), ("MRI Brain", 4500)], 2000, "bill"),
    
    # Injuries
    ("Fractured Arm", [("X-Ray", 800), ("Plaster Cast", 1200), ("Painkillers", 200)], 1500, "bill"),
    ("Sprained Ankle", [("X-Ray", 800), ("Crepe Bandage", 200), ("Ointment", 150)], 1000, "prescription"),
    ("Minor Burn", [("Burn Ointment", 300), ("Bandages", 100)], 800, "prescription"),
    ("Cut Wound", [("Stitches", 1000), ("Tetanus Injection", 150), ("Antibiotics", 250)], 1200, "bill"),

    # Chronic/Standard
    ("Hypertension", [("Blood Pressure Meds", 500), ("ECG", 800)], 1500, "bill"),
    ("Asthma Exacerbation", [("Inhaler", 400), ("Nebulization", 600)], 1200, "prescription"),
    ("Gastritis", [("Endoscopy", 3500), ("Antacids", 200)], 1500, "bill"),
    ("Tonsillitis", [("Antibiotics", 300), ("Throat Swab", 400)], 1000, "prescription"),

    # Family Packages / Multiple Patients (Edge Case)
    ("Family Health Checkup", [("Complete Blood Count (Mr. Rajesh)", 800), ("Lipid Profile (Mrs. Priya)", 1200)], 2000, "bill"),
    
    # Alternative Medicine (Edge Case: No Copay applied usually)
    ("Chronic Back Pain", [("Ayurvedic Massage Therapy", 2000), ("Herbal Supplements", 800)], 1500, "prescription"),
    ("Stress Relief", [("Panchakarma Treatment", 3500)], 2000, "bill"),

    # Partial Payments / Refunds (Edge Case)
    ("Kidney Stones", [("Ultrasound", 1500), ("Medications", 500), ("REFUND: Advance", -500)], 2000, "bill")
]

REJECTED_SCENARIOS = [
    # Cosmetic (Excluded)
    ("Cosmetic Surgery", [("Rhinoplasty", 45000), ("Anesthesia", 5000)], 2000, "bill"),
    ("Acne Treatment", [("Chemical Peel", 3000), ("Creams", 1000)], 1500, "prescription"),
    ("Hair Transplant", [("Follicular Unit Extraction", 50000)], 2000, "bill"),

    # Weight Loss (Excluded)
    ("Weight Loss Treatment", [("Bariatric Consultation", 2000), ("Diet Plan", 3000)], 1500, "bill"),
    ("Obesity Management", [("Fat Burners", 4000), ("Gym Membership", 5000)], 1000, "prescription"),

    # Infertility (Excluded)
    ("Infertility Treatment", [("IVF Consultation", 5000), ("Hormone Tests", 8000)], 3000, "bill"),

    # Dental limits (Usually excluded or strict limits)
    ("Dental Root Canal", [("Root Canal", 6000), ("Crown", 4000)], 1000, "prescription"),
    ("Teeth Whitening", [("Bleaching", 5000)], 1000, "bill"), # Cosmetic + Dental

    # Waiting Periods (Usually failed if early in policy)
    ("Type 2 Diabetes", [("Insulin", 1000), ("HbA1c Test", 600)], 1500, "prescription"),
    ("Cataract Surgery", [("Lens Implant", 25000), ("OT Charges", 10000)], 2000, "bill"),
    ("Hernia Repair", [("Mesh", 5000), ("Surgery", 20000)], 2500, "bill"),
    
    # Maternity (Often has 9-month waiting or exclusion)
    ("Pregnancy Routine Checkup", [("Ultrasound", 2000), ("Vitamins", 500)], 1500, "prescription"),
]


def random_date_str():
    days_ago = random.randint(1, 30)
    d = datetime.now() - timedelta(days=days_ago)
    return d.strftime("%d/%m/%Y")


class DocumentGenerator:

    @staticmethod
    def generate_random_document(is_approved=True, flatten_to_image=False):
        """Generates a PDF document with various layouts and quality degradations"""
        
        # Pick scenario
        scenario = random.choice(APPROVED_SCENARIOS if is_approved else REJECTED_SCENARIOS)
        diagnosis, items, consult_fee, doc_type = scenario
        
        hospital = random.choice(HOSPITALS)
        doctor, doc_qual = random.choice(DOCTORS)
        patient, member_id = random.choice(PATIENTS)
        date_str = random_date_str()

        # Canvas Setup
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        
        # Draw a white background so text doesn't disappear when rasterizing to image
        c.setFillColorRGB(1, 1, 1)
        c.rect(0, 0, width, height, fill=1, stroke=0)
        c.setFillColorRGB(0, 0, 0) # reset to black for text
        
        # Add a slight random rotation to simulate bad scanning (for the native canvas text)
        if random.random() < 0.5:
            # Note: Native rotation on canvas translates the entire coordinate system. 
            # We will rotate slightly.
            angle = random.uniform(-1.5, 1.5)
            c.translate(width/2, height/2)
            c.rotate(angle)
            c.translate(-width/2, -height/2)

        # Draw content based on type
        if doc_type == "prescription":
            DocumentGenerator._draw_prescription(c, width, height, hospital, doctor, doc_qual, date_str, patient, member_id, diagnosis, items, consult_fee)
        else:
            DocumentGenerator._draw_bill(c, width, height, hospital, doctor, doc_qual, date_str, patient, member_id, diagnosis, items, consult_fee)
            
        # Draw fake stamps
        if random.random() < 0.7:
            DocumentGenerator._draw_stamp(c, width, height)

        c.showPage()
        c.save()
        buffer.seek(0)
        
        if flatten_to_image:
            # Convert PDF to Image, apply noise/blur, and convert back to PDF
            # This completely destroys the native text layer, forcing Tesseract OCR.
            images = convert_from_bytes(buffer.getvalue(), dpi=200)
            img = images[0].convert('RGB')
            
            # Apply some noise/blur
            if random.random() < 0.5:
                img = img.filter(ImageFilter.BoxBlur(1))
            
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format='JPEG', quality=85)
            pdf_bytes = img2pdf.convert(img_byte_arr.getvalue())
            return io.BytesIO(pdf_bytes)
            
        return buffer

    @staticmethod
    def _draw_prescription(c, width, height, hospital, doctor, doc_qual, date_str, patient, member_id, diagnosis, items, consult_fee):
        # Header
        c.setFont("Helvetica-Bold", 18)
        c.drawString(50, height - 50, hospital)
        
        c.setFont("Helvetica", 12)
        c.drawString(50, height - 70, f"{doctor}, {doc_qual}")
        c.drawString(50, height - 85, f"Reg No: MH/{random.randint(10000, 99999)}/2015")
        c.drawString(width - 150, height - 85, f"Date: {date_str}")
        
        c.setStrokeColor(gray)
        c.line(50, height - 100, width - 50, height - 100)
        
        # Patient Details
        c.setFont("Helvetica-Bold", 12)
        c.drawString(50, height - 130, "Patient Details")
        c.setFont("Helvetica", 12)
        c.drawString(50, height - 145, f"Name: {patient}")
        c.drawString(50, height - 160, f"Member ID: {member_id}")
        
        # Diagnosis
        c.setFont("Helvetica-Bold", 12)
        c.drawString(50, height - 190, "Diagnosis / Complaints")
        c.setFont("Helvetica", 12)
        c.drawString(50, height - 205, diagnosis)
        
        # Rx
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, height - 240, "Rx")
        c.setFont("Helvetica", 12)
        
        y = height - 265
        for item_name, item_cost in items:
            c.drawString(50, y, f"- {item_name}")
            y -= 20
        
        y -= 20
        c.setFont("Helvetica-Bold", 12)
        c.drawString(50, y, f"Consultation Fee: {consult_fee} INR")
        
        # Footer / Signature
        c.setFont("Helvetica-Oblique", 12)
        c.drawString(width - 200, 100, doctor)
        c.setFont("Helvetica", 10)
        c.drawString(width - 200, 85, "Authorized Signatory")

    @staticmethod
    def _draw_bill(c, width, height, hospital, doctor, doc_qual, date_str, patient, member_id, diagnosis, items, consult_fee):
        # Invoice Header
        c.setFont("Helvetica-Bold", 20)
        c.drawString(50, height - 60, hospital)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(width - 150, height - 60, "INVOICE")
        
        c.setFont("Helvetica", 10)
        c.drawString(50, height - 75, "123 Health Avenue, Medical District")
        c.drawString(50, height - 90, f"GSTIN: 27AAAAA{random.randint(1000, 9999)}A1Z5")
        
        c.setStrokeColor(gray)
        c.line(50, height - 105, width - 50, height - 105)
        
        # Details
        c.setFont("Helvetica", 11)
        c.drawString(50, height - 130, f"Bill No: INV-{random.randint(10000, 99999)}")
        c.drawString(width - 200, height - 130, f"Date: {date_str}")
        
        c.drawString(50, height - 150, f"Patient Name: {patient}")
        c.drawString(50, height - 165, f"Member ID: {member_id}")
        c.drawString(width - 200, height - 150, f"Ref Dr: {doctor}")
        
        c.drawString(50, height - 195, f"Diagnosis: {diagnosis}")
        
        # Table Header
        y = height - 230
        c.setFillColor(gray)
        c.rect(50, y-5, width - 100, 20, fill=1, stroke=0)
        c.setFillColor(black)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(60, y, "PARTICULARS")
        c.drawString(width - 150, y, "AMOUNT (INR)")
        
        # Table Rows
        y -= 25
        c.setFont("Helvetica", 11)
        
        total = consult_fee
        c.drawString(60, y, "Consultation Fee")
        c.drawString(width - 150, y, f"{consult_fee}.00")
        y -= 20
        
        for item_name, item_cost in items:
            c.drawString(60, y, item_name)
            c.drawString(width - 150, y, f"{float(item_cost):.2f}")
            total += item_cost
            y -= 20
        
        c.setStrokeColor(gray)
        c.line(50, y, width - 50, y)
        
        y -= 20
        c.setFont("Helvetica-Bold", 12)
        c.drawString(60, y, "TOTAL AMOUNT DUE:")
        c.drawString(width - 150, y, f"{float(total):.2f}")
        
        # Footer
        c.setFont("Helvetica-Oblique", 12)
        c.drawString(width - 200, 100, "Authorized Signatory")
        c.setFont("Helvetica", 10)
        c.drawString(width - 200, 85, hospital)

    @staticmethod
    def _draw_stamp(c, width, height):
        """Draws a fake semi-transparent hospital stamp/signature overlapping text"""
        c.saveState()
        
        # Random position in the lower right quadrant
        x = random.randint(int(width/2), int(width - 100))
        y = random.randint(100, 250)
        
        c.translate(x, y)
        c.rotate(random.randint(-30, 30))
        
        # Red or Blue ink color with some transparency simulation (we just use lighter color)
        stamp_color = Color(0.8, 0.2, 0.2, alpha=0.5) if random.random() < 0.5 else Color(0.2, 0.2, 0.8, alpha=0.5)
        c.setStrokeColor(stamp_color)
        c.setFillColor(stamp_color)
        
        # Draw a circular or rectangular stamp
        c.setLineWidth(2)
        if random.random() < 0.5:
            c.circle(0, 0, 40, stroke=1, fill=0)
            c.circle(0, 0, 35, stroke=1, fill=0)
            c.setFont("Helvetica-Bold", 10)
            c.drawCentredString(0, 5, "VERIFIED")
            c.drawCentredString(0, -10, "HOSPITAL SEAL")
        else:
            c.rect(-50, -20, 100, 40, stroke=1, fill=0)
            c.setFont("Helvetica-Bold", 12)
            c.drawCentredString(0, -5, "PAID IN FULL")
            
        c.restoreState()
