# OPD Claim Adjudication Tool

Automated system for processing and deciding on OPD insurance claims. Upload medical documents, the system reads them, checks against policy rules, and returns an approve/reject decision with reasoning.

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
| `models.py` | defines all data shapes — what a claim looks like, what extracted data looks like, what a decision looks like |
| `ocr.py` | takes an image or pdf, runs tesseract ocr, returns raw text |
| `ai_extractor.py` | takes raw ocr text, sends it to groq with a structured prompt, parses the response into clean json |
| `rule_engine.py` | the core logic — runs 6 checks in order and returns approve/reject with detailed reasoning |
| `routes/claims.py` | api endpoints — POST to submit a claim, GET to list or view claims |
| `policy_terms.json` | the insurance policy config — limits, exclusions, waiting periods, network hospitals |

### Frontend

| File | What it does |
|------|-------------|
| `layout.tsx` | wraps every page with a nav bar |
| `page.tsx` | dashboard with stat cards and a list of all claims |
| `submit/page.tsx` | form for submitting claims — member info, amounts, drag-and-drop file upload |
| `claims/[id]/page.tsx` | detail view showing decision, amounts, deductions, and step-by-step verification timeline |
| `globals.css` | the design system — clean and minimal, neutral colors with semantic status colors |
| `api.ts` | all backend calls go through here |
| `types.ts` | typescript types shared across components |

## Running the Project

need 3 things running at the same time: mongodb, the backend, and the frontend.
here is everything step by step.

---

### Step 1: Install Prerequisites

**python** (3.10 or higher)
```bash
# check if you have it
python3 --version

# if not, install via homebrew
brew install python
```

**node.js** (18 or higher)
```bash
# check if you have it
node --version

# if not, install via homebrew
brew install node
```

**tesseract** (for reading documents)
```bash
# install via homebrew
brew install tesseract

# verify it works
tesseract --version
```

**mongodb** (pick one option)

option a — install locally:
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

option b — use mongodb atlas (free cloud):
1. go to https://cloud.mongodb.com
2. create a free cluster
3. get your connection string (looks like `mongodb+srv://user:pass@cluster.mongodb.net/plum_claims`)

**groq api key** (free)
1. go to https://console.groq.com
2. sign up / log in
3. go to api keys and create one
4. copy it — you'll need it in the next step

---

### Step 2: Set Up the Backend

open a terminal:

```bash
# go to the backend folder
cd backend

# create a virtual environment
python3 -m venv venv

# activate it (you need to do this every time you open a new terminal)
source venv/bin/activate

# create your .env file
cp .env.example .env
```

now open `backend/.env` in your editor and fill in your values:
```
GROQ_API_KEY=gsk_your_actual_key_here
MONGODB_URI=mongodb://localhost:27017
DB_NAME=plum_claims
UPLOAD_DIR=uploads
```
(if using atlas, replace the mongodb uri with your atlas connection string)

install python dependencies (inside the venv):
```bash
pip install -r requirements.txt
```

start the backend server:
```bash
uvicorn main:app --reload --port 8000
```

you should see:
```
connected to mongodb: plum_claims
INFO:     Uvicorn running on http://127.0.0.1:8000
```

leave this terminal running.

---

### Step 3: Set Up the Frontend

open a **second terminal**:

```bash
# go to the frontend folder
cd frontend

# install dependencies
npm install

# start the dev server
npm run dev
```

you should see:
```
▲ Next.js 15.x
- Local: http://localhost:3000
```

leave this terminal running too.

---

### Step 4: Open the App

open http://localhost:3000 in your browser. that's it.

- **dashboard** is at `/` — shows all claims
- **submit a claim** at `/submit` — fill the form, upload documents, get a decision
- **claim details** at `/claims/{id}` — see full breakdown of any claim

the backend api docs are at http://localhost:8000/docs if you want to test endpoints directly.

---

### Quick Reference (all 3 commands)

terminal 1 (mongodb — skip if using atlas):
```bash
brew services start mongodb-community
```

terminal 2 (backend):
```bash
cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000
```

terminal 3 (frontend):
```bash
cd frontend && npm run dev
```

## API Endpoints

| Method | Endpoint | What it does |
|--------|----------|-------------|
| `GET` | `/` | health check |
| `POST` | `/api/claims` | submit a claim with file uploads (multipart form) |
| `POST` | `/api/claims/test` | submit a claim with structured json (for test cases) |
| `GET` | `/api/claims` | list all claims |
| `GET` | `/api/claims/{claim_id}` | get a single claim with full details |

## Test Cases

10 test cases in `test_cases.json`:

| Case | Scenario | Expected |
|------|----------|----------|
| TC001 | simple consultation, all valid | approved |
| TC002 | root canal + teeth whitening | partial (whitening excluded) |
| TC003 | claim exceeds per-claim limit | rejected |
| TC004 | no prescription submitted | rejected |
| TC005 | diabetes during waiting period | rejected |
| TC006 | ayurvedic treatment | approved |
| TC007 | mri without pre-authorization | rejected |
| TC008 | 3 claims on the same day | manual review |
| TC009 | weight loss treatment | rejected |
| TC010 | network hospital, cashless | approved with discount |

## Decision Logic

the rule engine checks 6 things in order. if any check fails, it stops:

1. **eligibility** — policy active? waiting period passed?
2. **documents** — prescription present? doctor reg valid? dates match?
3. **coverage** — treatment covered? not excluded? pre-auth needed?
4. **limits** — under per-claim cap (5000)? under annual cap (50000)?
5. **medical necessity** — diagnosis justifies treatment?
6. **fraud** — multiple claims same day? high amounts?

co-pay (10% on consultations) and network discounts (20%) are applied during the limits step.

## Assumptions

- doctor registration numbers follow format: `XX/NNNNN/YYYY`
- name matching is fuzzy — checks if any word overlaps
- fraud detection is basic — checks frequency and amount thresholds
- medical necessity check verifies a diagnosis exists
- groq model: `llama-3.1-8b-instant`
- all amounts in inr
