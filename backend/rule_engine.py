"""
rule_engine.py — the heart of the adjudication system

runs 6 checks in order against the policy terms.
each check is a simple function that returns pass/fail with a reason.
if any check fails hard, we reject. if partially, we partially approve.
"""

import json
import re
import os
from datetime import datetime, timedelta
from models import (
    ExtractedDocument, ClaimSubmission, AdjudicationResult,
    StepResult, Decision
)

# load policy terms once at import time
policy_path = os.path.join(os.path.dirname(__file__), "..", "policy_terms.json")
if not os.path.exists(policy_path):
    policy_path = os.path.join(os.path.dirname(__file__), "policy_terms.json")

with open(policy_path, "r") as f:
    POLICY = json.load(f)


# -- step 1: eligibility check --

def check_eligibility(submission: ClaimSubmission, documents: list[ExtractedDocument]) -> StepResult:
    """
    checks if the member is eligible:
    - policy must be active on treatment date
    - waiting periods must be satisfied
    """
    treatment_date = _parse_date(submission.treatment_date)
    policy_start = _parse_date(POLICY["effective_date"])

    # is the policy active?
    if treatment_date < policy_start:
        return StepResult(
            step_name="eligibility",
            passed=False,
            reason_code="POLICY_INACTIVE",
            details="policy was not active on the treatment date"
        )

    # check initial waiting period (30 days)
    if submission.member_join_date:
        join_date = _parse_date(submission.member_join_date)
        initial_waiting = POLICY["waiting_periods"]["initial_waiting"]
        if treatment_date < join_date + timedelta(days=initial_waiting):
            return StepResult(
                step_name="eligibility",
                passed=False,
                reason_code="WAITING_PERIOD",
                details=f"initial {initial_waiting}-day waiting period not completed"
            )
            
        # check specific ailment waiting periods
        for doc in documents:
            diagnosis = (doc.diagnosis or "").lower()
            specific = POLICY["waiting_periods"].get("specific_ailments", {})
            for condition, days in specific.items():
                if condition.replace("_", " ") in diagnosis:
                    if treatment_date < join_date + timedelta(days=days):
                        return StepResult(
                            step_name="eligibility",
                            passed=False,
                            reason_code="WAITING_PERIOD",
                            details=f"{condition} has {days}-day waiting period not completed"
                        )

    return StepResult(
        step_name="eligibility",
        passed=True,
        details="member is eligible, policy active, waiting period satisfied"
    )


# -- step 2: document validation --

def check_documents(documents: list[ExtractedDocument], submission: ClaimSubmission) -> StepResult:
    """
    checks if all required documents are present and valid:
    - prescription must exist
    - doctor registration must be valid format
    - patient name should match
    """
    # must have at least one document
    if not documents:
        return StepResult(
            step_name="documents",
            passed=False,
            reason_code="MISSING_DOCUMENTS",
            details="no documents were submitted"
        )

    # look for a prescription
    has_prescription = any(
        d.doctor_name or d.diagnosis or d.document_type == "prescription"
        for d in documents
    )
    if not has_prescription:
        return StepResult(
            step_name="documents",
            passed=False,
            reason_code="MISSING_DOCUMENTS",
            details="prescription from a registered doctor is required"
        )

    # validate doctor registration number format: XX/NNNNN/YYYY or similar
    for doc in documents:
        if doc.doctor_registration:
            if not _is_valid_doctor_reg(doc.doctor_registration):
                return StepResult(
                    step_name="documents",
                    passed=False,
                    reason_code="DOCTOR_REG_INVALID",
                    details=f"invalid doctor registration format: {doc.doctor_registration}"
                )

    # check patient name matches (fuzzy — just check if names overlap)
    for doc in documents:
        if doc.patient_name and submission.member_name:
            if not _names_match(doc.patient_name, submission.member_name):
                return StepResult(
                    step_name="documents",
                    passed=False,
                    reason_code="PATIENT_MISMATCH",
                    details=f"patient name '{doc.patient_name}' doesn't match member '{submission.member_name}'"
                )

    return StepResult(
        step_name="documents",
        passed=True,
        details="all documents present and valid"
    )


# -- step 3: coverage check --

def check_coverage(documents: list[ExtractedDocument], submission: ClaimSubmission) -> StepResult:
    """
    checks if the treatment/service is covered under the policy:
    - not in the exclusions list
    - pre-authorization obtained if needed
    """
    exclusions = [e.lower() for e in POLICY["exclusions"]]

    for doc in documents:
        diagnosis = (doc.diagnosis or "").lower()
        procedures = [p.lower() for p in doc.procedures]
        all_items = [diagnosis] + procedures

        for item in all_items:
            if not item:
                continue

            # check against each exclusion
            for exclusion in exclusions:
                if _text_matches(item, exclusion):
                    return StepResult(
                        step_name="coverage",
                        passed=False,
                        reason_code="SERVICE_NOT_COVERED",
                        details=f"'{item}' is excluded from coverage ({exclusion})"
                    )

        # check if mri/ct scan needs pre-auth
        for test in doc.tests:
            test_lower = test.lower()
            if ("mri" in test_lower or "ct scan" in test_lower):
                if submission.claim_amount > 10000:
                    return StepResult(
                        step_name="coverage",
                        passed=False,
                        reason_code="PRE_AUTH_MISSING",
                        details=f"{test} requires pre-authorization for claims above 10000"
                    )

    return StepResult(
        step_name="coverage",
        passed=True,
        details="treatment is covered under the policy"
    )


# -- step 4: limit check --

def check_limits(submission: ClaimSubmission, documents: list[ExtractedDocument], effective_amount: float = None) -> tuple[StepResult, dict]:
    """
    checks claim amount against policy limits:
    - per-claim limit (5000)
    - annual limit (50000)
    - sub-limits per category
    also calculates co-pay and network discounts.
    returns (step_result, deductions_dict).
    """
    coverage = POLICY["coverage_details"]
    per_claim_limit = coverage["per_claim_limit"]
    annual_limit = coverage["annual_limit"]
    deductions = {}

    claim_amount = effective_amount if effective_amount is not None else submission.claim_amount

    # category sub-limits
    applicable_limit = per_claim_limit
    is_alt_med = False
    for doc in documents:
        diagnosis = (doc.diagnosis or "").lower()
        procedures = " ".join([p.lower() for p in doc.procedures])
        if "dental" in diagnosis or "tooth" in diagnosis or "root canal" in diagnosis:
            applicable_limit = coverage.get("dental", {}).get("sub_limit", applicable_limit)
        if "ayurved" in diagnosis or "homeopath" in diagnosis or "ayurved" in procedures or "homeopath" in procedures or "panchakarma" in diagnosis or "panchakarma" in procedures or "unani" in diagnosis or "unani" in procedures:
            applicable_limit = coverage.get("alternative_medicine", {}).get("sub_limit", applicable_limit)
            is_alt_med = True

    # per-claim limit
    if claim_amount > applicable_limit:
        return StepResult(
            step_name="limits",
            passed=False,
            reason_code="PER_CLAIM_EXCEEDED",
            details=f"claim amount {claim_amount} exceeds limit of {applicable_limit}"
        ), deductions

    # annual limit
    total_ytd = submission.previous_claims_ytd + claim_amount
    if total_ytd > annual_limit:
        return StepResult(
            step_name="limits",
            passed=False,
            reason_code="ANNUAL_LIMIT_EXCEEDED",
            details=f"total claims ({total_ytd}) would exceed annual limit of {annual_limit}"
        ), deductions

    # calculate co-pay on consultation fees (skip for alt med and cashless network)
    copay_amount = 0
    is_cashless_network = submission.cashless_request and submission.hospital_name in POLICY.get("network_hospitals", [])
    
    if not is_alt_med and not is_cashless_network:
        has_consultation = any(
            "consultation" in item.get("item", "").lower()
            for doc in documents for item in doc.line_items
        )
        if has_consultation:
            consultation_copay = coverage["consultation_fees"]["copay_percentage"] / 100
            copay_amount = claim_amount * consultation_copay

    if copay_amount > 0:
        deductions["copay"] = round(copay_amount)

    # network discount
    network_discount = 0
    if submission.hospital_name and submission.hospital_name in POLICY["network_hospitals"]:
        discount_pct = coverage["consultation_fees"]["network_discount"] / 100
        network_discount = round(claim_amount * discount_pct)
        deductions["network_discount"] = network_discount

    return StepResult(
        step_name="limits",
        passed=True,
        details="claim amount is within all limits"
    ), deductions


# -- step 5: medical necessity --

def check_medical_necessity(documents: list[ExtractedDocument]) -> StepResult:
    """
    basic check: does the diagnosis exist and does it seem to justify treatment?
    for a real system this would be much more sophisticated.
    """
    has_diagnosis = any(d.diagnosis for d in documents)

    if not has_diagnosis:
        return StepResult(
            step_name="medical_necessity",
            passed=False,
            reason_code="NOT_MEDICALLY_NECESSARY",
            details="no diagnosis found to justify the treatment"
        )

    return StepResult(
        step_name="medical_necessity",
        passed=True,
        details="diagnosis present, treatment appears justified"
    )


# -- step 6: fraud detection --

def check_fraud(submission: ClaimSubmission) -> StepResult:
    """
    looks for obvious red flags:
    - multiple claims on the same day
    - unusually high claim amounts
    """
    flags = []

    if submission.previous_claims_same_day >= 3:
        flags.append("multiple claims on the same day")

    if submission.claim_amount > 25000:
        flags.append("high-value claim")

    if flags:
        return StepResult(
            step_name="fraud_check",
            passed=False,
            reason_code="FRAUD_SUSPECTED",
            details=f"flagged for review: {', '.join(flags)}"
        )

    return StepResult(
        step_name="fraud_check",
        passed=True,
        details="no fraud indicators detected"
    )


# -- main adjudication function --

def adjudicate(submission: ClaimSubmission, documents: list[ExtractedDocument]) -> AdjudicationResult:
    """
    runs all 6 steps in order and produces a final decision.
    this is the main function that ties everything together.
    """
    steps = []
    rejection_reasons = []
    rejected_items = []
    deductions = {}

    # step 1: eligibility
    eligibility = check_eligibility(submission, documents)
    steps.append(eligibility)
    if not eligibility.passed:
        return AdjudicationResult(
            claim_id="",
            decision=Decision.REJECTED,
            rejection_reasons=[eligibility.reason_code],
            confidence_score=0.96,
            notes=eligibility.details,
            steps=steps,
            next_steps="check your policy status and eligibility dates"
        )

    # step 2: documents
    doc_check = check_documents(documents, submission)
    steps.append(doc_check)
    if not doc_check.passed:
        return AdjudicationResult(
            claim_id="",
            decision=Decision.REJECTED,
            rejection_reasons=[doc_check.reason_code],
            confidence_score=1.0,
            notes=doc_check.details,
            steps=steps,
            next_steps="resubmit with all required documents"
        )

    # step 3: coverage
    coverage = check_coverage(documents, submission)
    steps.append(coverage)

    # check for partial coverage (some items covered, some not)
    partial_items = _check_partial_coverage(documents)
    if partial_items["rejected"]:
        rejected_items = partial_items["rejected"]
        if partial_items["approved_amount"] > 0:
            # partial approval
            steps.append(StepResult(
                step_name="coverage",
                passed=True,
                details=f"partially covered. rejected items: {', '.join(rejected_items)}"
            ))
        elif not coverage.passed:
            return AdjudicationResult(
                claim_id="",
                decision=Decision.REJECTED,
                rejection_reasons=[coverage.reason_code],
                rejected_items=rejected_items,
                confidence_score=0.97,
                notes=coverage.details,
                steps=steps,
                next_steps="this treatment is not covered under your policy"
            )

    if not coverage.passed and not partial_items["rejected"]:
        return AdjudicationResult(
            claim_id="",
            decision=Decision.REJECTED,
            rejection_reasons=[coverage.reason_code],
            confidence_score=0.94,
            notes=coverage.details,
            steps=steps,
            next_steps="check your policy coverage or get pre-authorization"
        )

    # step 4: limits
    effective_amount = submission.claim_amount
    if rejected_items:
        effective_amount = partial_items["approved_amount"]
    limits, deductions = check_limits(submission, documents, effective_amount)
    steps.append(limits)
    if not limits.passed:
        return AdjudicationResult(
            claim_id="",
            decision=Decision.REJECTED,
            rejection_reasons=[limits.reason_code],
            confidence_score=0.98,
            notes=limits.details,
            steps=steps,
            next_steps="your claim exceeds policy limits"
        )

    # step 5: medical necessity
    medical = check_medical_necessity(documents)
    steps.append(medical)
    if not medical.passed:
        return AdjudicationResult(
            claim_id="",
            decision=Decision.REJECTED,
            rejection_reasons=[medical.reason_code],
            confidence_score=0.85,
            notes=medical.details,
            steps=steps,
            next_steps="include a clear diagnosis from your doctor"
        )

    # step 6: fraud check
    fraud = check_fraud(submission)
    steps.append(fraud)
    if not fraud.passed:
        return AdjudicationResult(
            claim_id="",
            decision=Decision.MANUAL_REVIEW,
            confidence_score=0.65,
            notes=fraud.details,
            steps=steps,
            next_steps="your claim has been sent for manual review"
        )

    # all checks passed — calculate final amount
    approved_amount = submission.claim_amount
    total_deductions = sum(deductions.values())
    approved_amount -= total_deductions

    # handle partial approval
    if rejected_items:
        approved_amount = partial_items["approved_amount"]
        # apply deductions to the approved portion
        copay = deductions.get("copay", 0)
        approved_amount -= copay

        return AdjudicationResult(
            claim_id="",
            decision=Decision.PARTIAL,
            approved_amount=round(approved_amount),
            rejected_items=rejected_items,
            confidence_score=0.92,
            notes=f"partially approved. rejected: {', '.join(rejected_items)}",
            steps=steps,
            deductions=deductions,
            next_steps="covered portion has been approved"
        )

    # check for cashless
    cashless_note = ""
    if submission.cashless_request and submission.hospital_name in POLICY.get("network_hospitals", []):
        cashless_note = ". cashless approved at network hospital"

    return AdjudicationResult(
        claim_id="",
        decision=Decision.APPROVED,
        approved_amount=round(approved_amount),
        confidence_score=0.95 if not deductions else 0.93,
        notes=f"claim approved{cashless_note}",
        steps=steps,
        deductions=deductions,
        next_steps="amount will be processed for reimbursement"
    )


# -- helper functions --

def _parse_date(date_str: str) -> datetime:
    """try a few common date formats"""
    for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"]:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    # fallback: return a very old date so checks fail safely
    return datetime(2000, 1, 1)


def _is_valid_doctor_reg(reg: str) -> bool:
    """
    check if doctor registration matches expected format.
    valid formats: KA/12345/2015, AYUR/KL/2345/2019, MH/67890/2018
    """
    pattern = r'^[A-Z]{2,4}/[A-Z]{0,2}/?[\d]{3,6}/\d{4}$'
    return bool(re.match(pattern, reg))


def _names_match(name1: str, name2: str) -> bool:
    """
    fuzzy name matching — checks if the names share at least one word.
    good enough for our purposes.
    """
    words1 = set(name1.lower().split())
    words2 = set(name2.lower().split())
    return bool(words1 & words2)


def _text_matches(text: str, exclusion: str) -> bool:
    """check if a piece of text matches an exclusion rule"""
    text = text.lower()
    exclusion = exclusion.lower()

    # direct substring match
    if exclusion in text or text in exclusion:
        return True

    # keyword matching for common exclusions
    keywords = {
        "cosmetic": ["cosmetic", "whitening", "aesthetic", "beauty"],
        "weight loss": ["weight loss", "obesity", "bariatric", "diet plan"],
        "infertility": ["infertility", "ivf", "fertility"],
        "experimental": ["experimental", "unproven", "trial"],
    }

    for category, words in keywords.items():
        if category in exclusion:
            if any(w in text for w in words):
                return True

    return False


def _check_partial_coverage(documents: list[ExtractedDocument]) -> dict:
    """
    check if some items are covered and some aren't.
    returns {"approved_amount": X, "rejected": ["item1", "item2"]}
    """
    approved_amount = 0
    rejected = []
    exclusions = [e.lower() for e in POLICY["exclusions"]]

    for doc in documents:
        diagnosis = (doc.diagnosis or "").lower()
        for exclusion in exclusions:
            if _text_matches(diagnosis, exclusion):
                return {"approved_amount": 0, "rejected": [f"Diagnosis: {diagnosis} - {exclusion}"]}


    for doc in documents:
        for item in doc.line_items:
            item_name = (item.get("item") or "").lower()
            amount = item.get("amount") or 0
            is_excluded = False

            for exclusion in exclusions:
                if _text_matches(item_name, exclusion):
                    rejected.append(f"{item.get('item') or 'unknown'} - {exclusion}")
                    is_excluded = True
                    break

            # also check procedures
            for proc in doc.procedures:
                if _text_matches(proc.lower(), item_name) or _text_matches(item_name, proc.lower()):
                    for exclusion in exclusions:
                        if _text_matches(proc.lower(), exclusion):
                            if (item.get("item") or "unknown") not in [r.split(" - ")[0] for r in rejected]:
                                rejected.append(f"{proc} - {exclusion}")
                            is_excluded = True
                            break

            if not is_excluded:
                approved_amount += amount

    return {"approved_amount": approved_amount, "rejected": rejected}
