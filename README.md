# OPD Claim Adjudication Tool

Automated system for processing and deciding on OPD insurance claims. Upload medical documents, the system reads them, checks against policy rules, and returns an approve/reject decision with reasoning.

# Video Explanation & Demo: [Click Here](https://drive.google.com/file/d/1J6HK4wxk0uN2QRXaPSfYOfg6jPq2AjLr/view?usp=drive_link)

## Local development (Mac/Linux)

Built and run locally requiring Python and Node.js. Three rules will save you an afternoon:

1. **Install Prerequisites first.** You need Python 3.10+, Node.js 18+, Tesseract, and Poppler. You also need a free Groq API key from https://console.groq.com and a MongoDB URI (e.g., from MongoDB Atlas).
2. **Set up the Backend in its own environment.** Navigate to the `backend` folder, create a Python virtual environment (`python3 -m venv venv`), activate it, and install dependencies (`pip install -r requirements.txt`). Create a `.env` file from `.env.example` with your keys.
3. **Run two terminals simultaneously.** You need one for the backend server and one for the Next.js frontend.

```bash
# Terminal 1: Start Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000

# Terminal 2: Start Frontend
cd frontend
npm install
npm run dev
```

## Local development (Windows)

Built and run locally requiring Python and Node.js. Three rules will save you an afternoon:

1. **Install Prerequisites first.** You need Python 3.10+, Node.js 18+. Install [Tesseract OCR for Windows](https://github.com/UB-Mannheim/tesseract/wiki) and [Poppler for Windows](https://github.com/oschwartz10612/poppler-windows/releases/), and add their `bin` folders to your System PATH. You also need a free Groq API key and a MongoDB URI.
2. **Set up the Backend in its own environment.** Navigate to the `backend` folder, create a Python virtual environment (`python -m venv venv`), activate it, and install dependencies (`pip install -r requirements.txt`). Create a `.env` file from `.env.example` with your keys.
3. **Run two terminals simultaneously.** You need one for the backend server and one for the Next.js frontend.

```powershell
# Terminal 1: Start Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload --port 8000

# Terminal 2: Start Frontend
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 in your browser to view the app. The backend API docs are available at http://localhost:8000/docs.

## How It Works

```
user submits claim + uploads documents
         |
         v
   tesseract reads the documents (ocr)
         |
         v
   groq extracts structured data from the text (can also use OpenAI or Gemini but they are paid)
         |
         v
   rule engine runs 6 checks:
     1. is the member eligible?
     2. are documents valid?
     3. is this treatment covered?
     4. is the amount within limits?
     5. is it medically necessary?
     6. any fraud red flags?
         |
         v
   decision: approved / rejected / partial / manual review
         |
         v
   stored in mongodb, shown to user
```

## Tech Stack

- **frontend**: next.js 15 + typescript + vanilla css
- **backend**: python + fastapi
- **document reading**: groq (llama 3.1) for structured extraction
- **ocr**: tesseract (pytesseract)
- **database**: mongodb

## Project Structure

```
plum/
├── backend/                     python fastapi server
│   ├── main.py                  app entry point, cors setup, mounts routes
│   ├── config.py                env vars, mongodb connection
│   ├── models.py                pydantic data models (claims, decisions, etc.)
│   ├── ocr.py                   tesseract text extraction from images/pdfs
│   ├── ai_extractor.py          sends ocr text to groq, gets structured json back
│   ├── rule_engine.py           the 6-step adjudication logic
│   ├── policy_terms.json        insurance policy configuration (limits, exclusions)
│   ├── requirements.txt         python dependencies
│   ├── .env                     env vars
│   └── routes/
│       └── claims.py            api endpoints (submit, list, get claim)
│
├── frontend/                    next.js react app
│   └── src/
│       ├── app/
│       │   ├── layout.tsx       root layout with navigation bar
│       │   ├── page.tsx         dashboard -> lists all claims with stats
│       │   ├── globals.css      the entire design system
│       │   ├── submit/
│       │   │   └── page.tsx     claim submission form + document upload
│       │   └── claims/
│       │       └── [id]/
│       │           └── page.tsx claim detail view with decision timeline
│       └── lib/
│           ├── api.ts           fetch wrapper for backend calls
│           └── types.ts         shared typescript types
│
├── docs/                        flowcharts and architecture diagrams
│   ├── workflow_flowchart.md
│   ├── amount_calculation_flowchart.md
│   └── architecture_diagram.md
│
├── adjudication_rules.md        business rules (provided by plum)
├── policy_terms.json            master policy config (provided by plum)
├── test_cases.json              10 test scenarios (provided by plum)
└── sample_documents_guide.md    document format guide (provided by plum)
```

## What Each File Does

### Backend

| File | What it does |
|------|-------------|
| `main.py` | starts the fastapi server, sets up cors so the frontend can talk to it, connects to mongodb on startup |
| `config.py` | loads env vars (groq key, mongo url), creates the mongodb connection, provides a `get_db()` helper |
| `models.py` | defines all data shapes --> what a claim looks like, what extracted data looks like, what a decision looks like |
| `ocr.py` | takes an image or pdf, runs tesseract ocr, returns raw text |
| `ai_extractor.py` | takes raw ocr text, sends it to groq with a structured prompt, parses the response into clean json |
| `rule_engine.py` | the core logic --> runs 6 checks in order and returns approve/reject with detailed reasoning |
| `routes/claims.py` | api endpoints --> POST to submit a claim, GET to list or view claims |
| `policy_terms.json` | the insurance policy config --> limits, exclusions, waiting periods, network hospitals |

### Frontend

| File | What it does |
|------|-------------|
| `layout.tsx` | wraps every page with a nav bar |
| `page.tsx` | dashboard with stat cards and a list of all claims |
| `submit/page.tsx` | form for submitting claims --> member info, amounts, drag-and-drop file upload |
| `claims/[id]/page.tsx` | detail view showing decision, amounts, deductions, and step-by-step verification timeline |
| `globals.css` | the design system --> clean and minimal, neutral colors with semantic status colors |
| `api.ts` | all backend calls go through here |
| `types.ts` | typescript types shared across components |

## API Endpoints

**Swagger Docs:** [https://plum-backend-dqg6.onrender.com/docs](https://plum-backend-dqg6.onrender.com/docs)

| Method | Endpoint | What it does |
|--------|----------|-------------|
| `GET` | `/` | health check |
| `POST` | `/api/upload` | upload a document file |
| `POST` | `/api/claims` | submit a claim with file uploads (multipart form) |
| `POST` | `/api/claims/test` | submit a claim with structured json (for test cases) |
| `GET` | `/api/claims` | list all claims |
| `GET` | `/api/claims/{claim_id}` | get a single claim with full details |

## Decision Logic

the rule engine checks 6 things in order. if any check fails, it stops:

1. **eligibility** --> policy active? waiting period passed?
2. **documents** --> prescription present? doctor reg valid? dates match?
3. **coverage** --> treatment covered? not excluded? pre-auth needed?
4. **limits** --> under per-claim cap (5000)? under annual cap (50000)?
5. **medical necessity** --> diagnosis justifies treatment?
6. **fraud** --> multiple claims same day? high amounts?

co-pay (10% on consultations) and network discounts (20%) are applied during the limits step.

## Engineering assumptions

| Area | Implementation Detail |
|---|---|
| **Doctor Registration** | Numbers follow format: `XX/NNNNN/YYYY` |
| **Name Matching** | Fuzzy matching; checks if any word overlaps rather than strict equality. |
| **Fraud Detection** | Basic heuristics checking frequency and amount thresholds. |
| **Medical Necessity** | Verifies that a diagnosis exists to justify the treatment. |
| **AI Model** | Extractor uses `llama-3.1-8b-instant` via Groq. |
| **Currency** | All amounts are processed in INR. |

## Test suite

`test_cases.json` contains 10 assignment scenarios provided by Plum. The integration runner feeds each case through the synchronous endpoint and asserts on decision, amount, and reason codes.

```bash
# Make sure the backend is running on port 8000
cd backend
python run_tests.py
```

The script will output a one-liner for each test case indicating pass/fail status and save the full results to `test_results.json`.

## Upload Handling in Deployment (Free Tier)

This app is designed to run perfectly on free-tier platforms like Render, which use an **ephemeral filesystem** (meaning the `uploads/` folder is wiped whenever the server goes to sleep or restarts).

**Why this works without data loss:**
1. When a user uploads a document, it is temporarily saved locally.
2. The backend immediately runs OCR and extracts structured data.
3. The claim is adjudicated, and the final *results, decisions, and reasoning* are permanently saved to MongoDB.
4. The frontend only displays these final results, so it doesn't need to serve the original image back to the user.

If you scale this to a production environment where you *do* want to view the original images in the dashboard later, you can easily swap the local save logic in `routes/claims.py` to upload files to a persistent blob storage service like AWS S3 or Cloudinary.


# Diagrams & Flowcharts

## System Architecture

```mermaid
graph TB
    subgraph "Frontend --> Next.js"
        UI["🖥️ Web Interface"]
        DASH["Dashboard\n(all claims + stats)"]
        FORM["Claim Submission\n(upload + member info)"]
        DETAIL["Claim Detail\n(decision + timeline)"]
    end

    subgraph "Backend --> FastAPI"
        API["🔌 REST API"]
        OCR["📄 Tesseract OCR\n(image → text)"]
        AI["🤖 Groq AI\n(text → structured data)"]
        RULES["⚙️ Rule Engine\n(6-step adjudication)"]
    end

    subgraph "Data --> MongoDB"
        DB["🗄️ Claims Collection"]
        POLICY["📋 Policy Config"]
    end

    UI --> API
    FORM -->|"POST /api/claims"| API
    DASH -->|"GET /api/claims"| API
    DETAIL -->|"GET /api/claims/:id"| API

    API --> OCR
    OCR --> AI
    AI --> RULES
    RULES --> DB
    RULES -->|"reads"| POLICY

    style UI fill:#6366f1,color:#fff
    style DASH fill:#818cf8,color:#fff
    style FORM fill:#818cf8,color:#fff
    style DETAIL fill:#818cf8,color:#fff
    style API fill:#f59e0b,color:#000
    style OCR fill:#fbbf24,color:#000
    style AI fill:#fbbf24,color:#000
    style RULES fill:#fbbf24,color:#000
    style DB fill:#10b981,color:#fff
    style POLICY fill:#34d399,color:#000
```



## Data Flow

```
user fills form + uploads files
        ↓
POST /api/claims (member info + file paths)
        ↓
backend runs tesseract on each file → raw text
        ↓
raw text sent to groq → structured JSON
        ↓
rule engine checks JSON against policy_terms.json
        ↓
decision saved to mongodb
        ↓
response sent back to frontend
```


## Adjudication Workflow

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

## How It Works

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


## Amount Calculation Logic
```mermaid
flowchart TD
    subgraph "Limits & Deductions Logic"
        EA["Effective Claim Amount\n(After partial rejections)"] --> CAT{"Category Check"}
        
        CAT -->|"Dental"| DL["Set Limit = ₹10,000"]
        CAT -->|"Alt. Medicine"| AL["Set Limit = ₹8,000"]
        CAT -->|"Other"| PL["Set Limit = ₹5,000"]
        
        DL --> LC{"Amount > Limit?"}
        AL --> LC
        PL --> LC
        
        LC -->|"yes"| RJ1["REJECT:\nPER_CLAIM_EXCEEDED"]
        LC -->|"no"| YTD{"YTD Total + Amount\n> ₹50,000?"}
        
        YTD -->|"yes"| RJ2["REJECT:\nANNUAL_LIMIT_EXCEEDED"]
        YTD -->|"no"| DED{"Deductions Type"}
        
        DED -->|"Alt. Med"| AP["Approved (No deductions)"]
        DED -->|"Cashless Network"| ND["Apply 20% Network Discount"]
        DED -->|"Standard"| CP["Apply 10% Consultation Copay"]
        
        ND --> AP
        CP --> AP
    end
```

## Calculation Steps

1. **Start with the Effective Amount**: This is the total claim amount (or the reduced amount if some items were rejected).
2. **Determine the Applicable Limit**:
   - If the diagnosis or procedures involve **Dental**, the limit is **₹10,000**.
   - If it involves **Alternative Medicine** (Ayurveda, Homeopathy, Unani, Panchakarma), the limit is **₹8,000**.
   - Otherwise, the standard per-claim limit is **₹5,000**.
3. **Check Limits**:
   - Reject if the amount exceeds the applicable limit.
   - Reject if adding this amount exceeds the **₹50,000** annual limit.
4. **Calculate Deductions (Mutually Exclusive)**:
   - **Alternative Medicine**: No copays apply.
   - **Cashless at Network Hospital**: Apply a **20% network discount** on the amount (copay is skipped).
   - **Standard Consultation**: Apply a **10% copay** on the amount if a consultation fee is present.
