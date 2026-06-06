# Plum AI Adjudication Engine

An intelligent, AI-powered system that automates the adjudication (approval, rejection, or partial approval) of Outpatient Department (OPD) insurance claims for Plum. The system ingests medical documents, extracts clinical information using state-of-the-art vision models, enforces rigorous policy rules, and provides a polished UI for review.

---

### Links & Submission Assets
- **Live Deployment**: [https://plum-frontend.onrender.com/](https://plum-frontend.onrender.com/)
- **GitHub Repository**: [https://github.com/ziko-ahmed/plum.git](https://github.com/ziko-ahmed/plum.git)
- **Demo Video**: [Google Drive Link](https://drive.google.com/file/d/1J6HK4wxk0uN2QRXaPSfYOfg6jPq2AjLr/view?usp=drive_link)

---

## Architecture Diagram

The system operates on a modern Next.js stack, using Prisma for relational state management and the Gemini 2.5 Flash API for advanced multimodal document extraction and medical necessity reasoning.

```mermaid
graph LR
    subgraph ClientBoundary["CLIENT APPLICATION BOUNDARY (Next.js Frontend)"]
        direction TB
        A["A: Document Upload Client<br/>(Web Interface - with upload icon)"]
        B["B: Adjudication Dashboard<br/>(Web Interface - with dashboard icon)"]
        C["C: Swagger API Documentation<br/>(API Docs - with paper stack & API icon)"]
    end

    subgraph ServerBoundary["APPLICATION SERVER BOUNDARY (Next.js API Routes)"]
        direction TB
        D["D: /api/extract<br/>(Extraction Service - with multi-step process icon)"]
        E["E: /api/adjudicate<br/>(Core Rules Engine - with gears icon)"]
        F["F: /api/claims<br/>(Data Retrieval Service - with database/search icon)"]
    end

    subgraph ExternalBoundary["EXTERNAL INFRASTRUCTURE & PERSISTENCE BOUNDARY"]
        direction TB
        G["G: Google Gemini 2.5 Flash API<br/>(LLM / Vision Service - with AI & eye icons)"]
        H["H: PostgreSQL Database<br/>(via Prisma ORM - with DB stack & Prisma icon)"]
    end

    A -->|sends file payload| D
    B -->|sends JSON + Member ID| E
    D -->|sends Base64 data & prompt| G
    G -->|returns structured JSON| D
    E -->|prompts medical necessity| G
    E -->|queries Member Policy| H
    E -->|writes final decision| H
    F -->|reads history| H
    H -->|returns history| B
```

---

## Decision Logic Flowchart

The adjudication engine processes claims through a strict, deterministic pipeline before handing off subjective medical reviews to the AI.

```mermaid
flowchart TD
    A["👤 User uploads documents\n(bills, prescriptions, reports)"] --> B["📄 Document Processing\n(Gemini 2.5 Flash / Tesseract extracts raw text)"]
    B --> C["🤖 AI Extraction\n(structures the raw text into\nclean JSON fields)"]
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
    
    R --> OUT["📊 Decision stored in PostgreSQL\n+ shown to user"]
    P --> OUT
    M --> OUT
    A2 --> OUT
```

---

## API Documentation

The backend is completely serverless, utilizing Next.js App Router API Routes. An interactive Swagger UI is also available at `/api-docs` when running the application.

### 1. POST /api/extract
Extracts structured clinical data from uploaded medical documents.
- Request Body: multipart/form-data containing file (JPEG/PNG/PDF).
- Response:
  ```json
  {
    "documentType": "PRESCRIPTION",
    "patientName": "John Doe",
    "treatmentDate": "2023-10-15",
    "doctorName": "Dr. Smith",
    "clinicName": "City Hospital",
    "diagnosis": "Viral Fever",
    "medicines": ["Paracetamol 500mg"],
    "totalAmount": 1500,
    "confidence": 0.95
  }
  ```

### 2. POST /api/adjudicate
Runs the rule engine and AI medical assessment on the extracted claim data.
- Request Body:
  ```json
  {
    "memberId": "MEM001",
    "claimData": { ...ExtractedData },
    "cashlessRequest": false
  }
  ```
- Response:
  ```json
  {
    "decision": "APPROVED",
    "approvedAmount": 1350,
    "rejectionReasons": [],
    "deduction": {
      "copay": 150,
      "networkDiscount": 0
    },
    "aiReasoning": "Treatment aligns with diagnosis. Approved."
  }
  ```

### 3. GET /api/claims
Fetches a chronological history of all processed claims for the dashboard.
- Response: Array of Claim objects, populated with their associated Adjudication details and Documents.


## Additionally the API documentation is also available at API-Docs from Sidebar 
---

## Assumptions Made

To build this MVP within the timeframe, several architectural and logical assumptions were made:

1. Authentication & Authorization: Assumed the user is an internal Plum Claims Adjuster. No authentication layer was implemented.
2. Language Constraints: Assumed all submitted medical documents are predominantly in English (or bilingual with English).
3. Currency & Localization: Hardcoded formatting to INR and Indian Date formats, given Plum's target market.
4. Member Data: Assumed that the core insurance registry is handled externally. A dummy seeding script (prisma/seed.ts) was used to populate initial members for testing.
5. PDF Processing Limitations: Assumed that PDFs are mostly text-based or clean scans. Large, multi-page complex PDFs rely heavily on the Gemini context window.
6. Network Discounts: Simplified the network discount logic to a flat 10% deduction if the user checks the "Cashless Processing" option, assuming cashless implies an in-network hospital.

---

## Local Setup Instructions

### Option 1: Docker (Recommended)
The easiest way to run the application and database locally is via Docker Compose.

1. Clone the repository.
2. Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY="your_google_gemini_api_key"
   ```
3. Run the following command:
   ```bash
   docker-compose up --build
   ```
   This will automatically spin up a PostgreSQL database, run the Prisma migrations, seed the dummy users, and start the Next.js application at `http://localhost:3000`.

### Option 2: Manual Setup
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Environment Setup (create a `.env` file):
   ```env
   DATABASE_URL="postgresql://user:pass@localhost:5432/plum"
   GEMINI_API_KEY="your_google_gemini_api_key"
   ```
4. Database Setup:
   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```
5. Run the Development Server:
   ```bash
   npm run dev
   ```
   Access the UI at `http://localhost:3000`.
