"""
models.py — pydantic models for claims, extracted data, and decisions

keeps everything typed so we don't pass around random dicts
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


# -- enums --

class Decision(str, Enum):
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    PARTIAL = "PARTIAL"
    MANUAL_REVIEW = "MANUAL_REVIEW"


# -- what the AI extracts from documents --

class ExtractedDocument(BaseModel):
    """structured data pulled from a single document by the AI"""
    document_type: Optional[str] = None        # "prescription", "bill", "report", "pharmacy_bill"
    doctor_name: Optional[str] = None
    doctor_registration: Optional[str] = None
    clinic_or_hospital: Optional[str] = None
    patient_name: Optional[str] = None
    patient_age: Optional[str] = None
    treatment_date: Optional[str] = None
    diagnosis: Optional[str] = None
    medicines: list[str] = Field(default_factory=list)
    tests: list[str] = Field(default_factory=list)
    procedures: list[str] = Field(default_factory=list)
    line_items: list[dict] = Field(default_factory=list)  # [{"item": "CBC", "amount": 500}, ...]
    total_amount: Optional[float] = None
    raw_text: str = ""                         # the original OCR text, kept for reference


# -- what the user submits --

class ClaimSubmission(BaseModel):
    """info the user fills in when submitting a claim"""
    member_id: str
    member_name: str
    treatment_date: str                        # "2024-11-01"
    claim_amount: float
    hospital_name: Optional[str] = None
    cashless_request: bool = False
    member_join_date: Optional[str] = None     # for waiting period checks
    previous_claims_ytd: float = 0             # total claims so far this year
    previous_claims_same_day: int = 0          # for fraud detection


# -- adjudication step result --

class StepResult(BaseModel):
    """result of one adjudication step"""
    step_name: str                             # "eligibility", "documents", etc.
    passed: bool
    reason_code: Optional[str] = None          # "WAITING_PERIOD", "MISSING_DOCUMENTS", etc.
    details: str = ""                          # human-readable explanation


# -- the final decision --

class AdjudicationResult(BaseModel):
    """the complete output of the adjudication process"""
    claim_id: str
    decision: Decision
    approved_amount: float = 0
    rejection_reasons: list[str] = Field(default_factory=list)
    rejected_items: list[str] = Field(default_factory=list)
    confidence_score: float = 0.0
    notes: str = ""
    next_steps: str = ""
    steps: list[StepResult] = Field(default_factory=list)  # detailed breakdown
    deductions: dict = Field(default_factory=dict)          # {"copay": 150, "network_discount": 200}


# -- what we store in mongodb --

class ClaimRecord(BaseModel):
    """the full claim record that lives in the database"""
    claim_id: str
    submission: ClaimSubmission
    documents: list[ExtractedDocument] = Field(default_factory=list)
    uploaded_files: list[str] = Field(default_factory=list)  # file paths
    result: Optional[AdjudicationResult] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "processing"                 # "processing", "completed", "error"
