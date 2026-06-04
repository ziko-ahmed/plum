import json
from ai_extractor import extract_from_text

# A tiny evaluation script to calculate AI accuracy metrics
# We compare the extracted output against a ground truth structure

GROUND_TRUTH = [
    {
        "raw_text": "Apollo Hospital Dr. Smith 12/05/2026 Patient: John Doe Diagnosis: Viral Fever Rx: Paracetamol 500mg - 150 INR Consultation: 500 INR",
        "expected": {
            "document_type": "prescription",
            "patient_name": "John Doe",
            "diagnosis": "Viral Fever",
            "total_amount": 650.0
        }
    },
    {
        "raw_text": "Elite Clinic Invoice Date: 01/01/2026 Patient: Mary Jane Root Canal - 4000 INR Total Due: 4000 INR",
        "expected": {
            "document_type": "bill",
            "patient_name": "Mary Jane",
            "total_amount": 4000.0
        }
    }
]

def calculate_metrics():
    print("Running AI Extraction Evaluation...")
    total_fields = 0
    correct_fields = 0
    
    for case in GROUND_TRUTH:
        doc = extract_from_text(case["raw_text"])
        
        for key, expected_val in case["expected"].items():
            total_fields += 1
            extracted_val = getattr(doc, key, None)
            
            if str(extracted_val).lower() == str(expected_val).lower():
                correct_fields += 1
            else:
                print(f"Mismatch on {key}! Expected: {expected_val}, Got: {extracted_val}")
                
    accuracy = (correct_fields / total_fields) * 100
    print(f"\n--- Metrics ---")
    print(f"Total Fields Evaluated: {total_fields}")
    print(f"Correct Extractions: {correct_fields}")
    print(f"Extraction Accuracy (Recall): {accuracy:.2f}%\n")
    
if __name__ == "__main__":
    calculate_metrics()
