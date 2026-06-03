"""
routes/claims.py — api endpoints for creating and viewing claims

POST /api/claims  — submit a new claim, triggers the full pipeline
GET  /api/claims  — list all claims
GET  /api/claims/{id} — get a single claim with all details
"""

import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional
import json
import os

from config import get_db, UPLOAD_DIR
from models import (
    ClaimSubmission, ClaimRecord, ExtractedDocument,
    AdjudicationResult, Decision
)
from ocr import extract_text
from ai_extractor import extract_from_text, extract_from_claim_data
from rule_engine import adjudicate

router = APIRouter(prefix="/api/claims", tags=["claims"])


@router.post("")
async def submit_claim(
    member_id: str = Form(...),
    member_name: str = Form(...),
    treatment_date: str = Form(...),
    claim_amount: float = Form(...),
    hospital_name: Optional[str] = Form(None),
    cashless_request: bool = Form(False),
    member_join_date: Optional[str] = Form(None),
    previous_claims_ytd: float = Form(0),
    previous_claims_same_day: int = Form(0),
    files: list[UploadFile] = File(default=[]),
):
    """
    submit a new claim. accepts member info as form fields and documents as file uploads.
    runs the full pipeline: upload -> ocr -> extract -> adjudicate -> store.
    """
    db = get_db()
    claim_id = f"CLM_{uuid.uuid4().hex[:8].upper()}"

    # build submission model
    submission = ClaimSubmission(
        member_id=member_id,
        member_name=member_name,
        treatment_date=treatment_date,
        claim_amount=claim_amount,
        hospital_name=hospital_name,
        cashless_request=cashless_request,
        member_join_date=member_join_date,
        previous_claims_ytd=previous_claims_ytd,
        previous_claims_same_day=previous_claims_same_day,
    )

    # save uploaded files and run ocr + extraction on each
    uploaded_files = []
    extracted_docs = []

    for file in files:
        # save file to disk
        file_path = os.path.join(UPLOAD_DIR, f"{claim_id}_{file.filename}")
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        uploaded_files.append(file_path)

        # run ocr to get raw text
        raw_text = extract_text(file_path)

        # send to groq for structured extraction
        extracted = extract_from_text(raw_text)
        extracted_docs.append(extracted)

    # if no files uploaded, create a minimal doc from claim data
    # (this happens in test mode or when data is submitted directly)
    if not extracted_docs:
        extracted_docs.append(ExtractedDocument(
            document_type="submission",
            patient_name=member_name,
            treatment_date=treatment_date,
        ))

    # run the rule engine
    result = adjudicate(submission, extracted_docs)
    result.claim_id = claim_id

    # store in mongodb
    record = ClaimRecord(
        claim_id=claim_id,
        submission=submission,
        documents=extracted_docs,
        uploaded_files=uploaded_files,
        result=result,
        created_at=datetime.utcnow(),
        status="completed",
    )

    await db.claims.insert_one(record.model_dump())

    return {
        "claim_id": claim_id,
        "decision": result.decision.value,
        "approved_amount": result.approved_amount,
        "rejection_reasons": result.rejection_reasons,
        "rejected_items": result.rejected_items,
        "confidence_score": result.confidence_score,
        "notes": result.notes,
        "next_steps": result.next_steps,
        "steps": [s.model_dump() for s in result.steps],
        "deductions": result.deductions,
    }


@router.post("/test")
async def submit_test_claim(data: dict):
    """
    submit a claim using test case data (structured json, no file upload).
    useful for running the test_cases.json scenarios.
    """
    db = get_db()
    claim_id = f"CLM_{uuid.uuid4().hex[:8].upper()}"

    input_data = data.get("input_data", data)

    submission = ClaimSubmission(
        member_id=input_data.get("member_id", "TEST"),
        member_name=input_data.get("member_name", "Test User"),
        treatment_date=input_data.get("treatment_date", "2024-11-01"),
        claim_amount=input_data.get("claim_amount", 0),
        hospital_name=input_data.get("hospital"),
        cashless_request=input_data.get("cashless_request", False),
        member_join_date=input_data.get("member_join_date"),
        previous_claims_ytd=input_data.get("previous_claims_ytd", 0),
        previous_claims_same_day=input_data.get("previous_claims_same_day", 0),
    )

    # extract from structured test data
    extracted = extract_from_claim_data(input_data)

    # run rule engine
    result = adjudicate(submission, [extracted])
    result.claim_id = claim_id

    # store in mongodb
    record = ClaimRecord(
        claim_id=claim_id,
        submission=submission,
        documents=[extracted],
        uploaded_files=[],
        result=result,
        created_at=datetime.utcnow(),
        status="completed",
    )

    await db.claims.insert_one(record.model_dump())

    return {
        "claim_id": claim_id,
        "decision": result.decision.value,
        "approved_amount": result.approved_amount,
        "rejection_reasons": result.rejection_reasons,
        "rejected_items": result.rejected_items,
        "confidence_score": result.confidence_score,
        "notes": result.notes,
        "next_steps": result.next_steps,
        "steps": [s.model_dump() for s in result.steps],
        "deductions": result.deductions,
    }


@router.get("")
async def list_claims():
    """get all claims, most recent first"""
    db = get_db()
    claims = await db.claims.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    return {"claims": claims}


@router.get("/{claim_id}")
async def get_claim(claim_id: str):
    """get a single claim by its id"""
    db = get_db()
    claim = await db.claims.find_one(
        {"claim_id": claim_id},
        {"_id": 0}
    )

    if not claim:
        raise HTTPException(status_code=404, detail="claim not found")

    return claim
