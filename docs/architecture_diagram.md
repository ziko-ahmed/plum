# System Architecture

```mermaid
graph TB
    subgraph "Frontend — Next.js"
        UI["🖥️ Web Interface"]
        DASH["Dashboard\n(all claims + stats)"]
        FORM["Claim Submission\n(upload + member info)"]
        DETAIL["Claim Detail\n(decision + timeline)"]
    end

    subgraph "Backend — FastAPI"
        API["🔌 REST API"]
        OCR["📄 Tesseract OCR\n(image → text)"]
        AI["🤖 Groq AI\n(text → structured data)"]
        RULES["⚙️ Rule Engine\n(6-step adjudication)"]
    end

    subgraph "Data — MongoDB"
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

## API Endpoints

| Method | Endpoint | What it does |
|--------|----------|-------------|
| `POST` | `/api/upload` | upload a document file |
| `POST` | `/api/claims` | submit a new claim (triggers full pipeline) |
| `GET` | `/api/claims` | list all claims |
| `GET` | `/api/claims/{id}` | get one claim with full details |

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
