# OPD Claim Adjudication — Workflow Flowchart

## Main Pipeline

```mermaid
flowchart TD
    A["👤 User uploads documents\n(bills, prescriptions, reports)"] --> B["📄 OCR Processing\n(Tesseract extracts raw text)"]
    B --> C["🤖 AI Extraction via Groq\n(structures the raw text into\nclean JSON fields)"]
    C --> D["⚙️ Rule Engine\n(checks extracted data against policy)"]
    
    D --> E{"Step 1:\nEligibility?"}
    E -->|"❌ inactive / waiting period"| R["🔴 REJECTED\n(with reason codes)"]
    E -->|"✅ eligible"| F{"Step 2:\nDocuments valid?"}
    
    F -->|"❌ missing / invalid"| R
    F -->|"✅ all good"| G{"Step 3:\nCoverage check?"}
    
    G -->|"❌ excluded / not covered"| R
    G -->|"⚠️ partial coverage"| P["🟡 PARTIAL APPROVAL\n(covered items only)"]
    G -->|"✅ fully covered"| H{"Step 4:\nWithin limits?"}
    
    H -->|"❌ exceeds limits"| R
    H -->|"✅ within limits"| I{"Step 5:\nMedically necessary?"}
    
    I -->|"❌ not justified"| R
    I -->|"✅ justified"| J{"Step 6:\nFraud check?"}
    
    J -->|"🚩 suspicious"| M["🟠 MANUAL REVIEW\n(flagged for human)"]
    J -->|"✅ clean"| A2["🟢 APPROVED\n(with approved amount)"]
    
    R --> OUT["📊 Decision stored in MongoDB\n+ shown to user"]
    P --> OUT
    M --> OUT
    A2 --> OUT
```

## How It Works (Plain English)

1. **User uploads** their medical bills, prescriptions, and reports
2. **Tesseract OCR** reads the images/PDFs and pulls out raw text
3. **Groq AI** takes that messy text and structures it into clean fields (doctor name, diagnosis, amounts, etc.)
4. **Rule Engine** runs 6 checks in order:
   - Is the member eligible? (active policy, waiting period done)
   - Are documents valid? (doctor reg number, dates match, everything readable)
   - Is this treatment covered? (not excluded, not cosmetic, etc.)
   - Is the amount within limits? (per-claim ≤ ₹5000, annual ≤ ₹50000)
   - Is it medically necessary? (diagnosis justifies treatment)
   - Any fraud red flags? (multiple claims same day, suspicious patterns)
5. **Decision** is stored and shown to the user with full reasoning
