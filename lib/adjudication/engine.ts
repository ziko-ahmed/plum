import { assessMedicalNecessity, generateAdjudicationReasoning } from "../gemini";
import { checkEligibility, validateDocuments, checkCoverage, detectFraud, calculateLimitsAndCopay } from './rules';
import type { AdjudicationInput } from "@/types";
import type { AdjudicationResult } from "@/types";

export async function runAdjudication(input: AdjudicationInput): Promise<AdjudicationResult>{
    const allRejectionReasons: string[] = [];
    const allFlags: string[] = [];
    let confidenceScore = 0.95 // reduce as issues come

    // now apply all the rules we created 
    // check eligibilty
    const eligibility = checkEligibility(input);
    if(!eligibility.passed){
        const reasoning = await generateAdjudicationReasoning(
            `${input.memberName} — ₹${input.claimAmount} claim`,
            "REJECTED",
            eligibility.reasons
        )
        return {
            decision: "REJECTED",
            approvedAmount: 0,
            rejectionReasons: eligibility.reasons,
            rejectedItems: [],
            deduction: {
                copay:0,
                networkDiscount:0
            },
            confidenceScore:0.90,
            flags:[],
            notes: eligibility.notes,
            nextSteps: "Please review you policy eligibility dates or Claim amount before resubmitting.",
            aiReasoning: reasoning,
        }
    }

    // document valtion now
    const docValidation = validateDocuments(input);
    if(!docValidation.passed){
        if (docValidation.reasons.some((r) => r.includes("MISSING_DOCUMENTS: Prescription"))){
            return {
                decision: "REJECTED",
                approvedAmount: 0,
                rejectionReasons: docValidation.reasons,
                rejectedItems: [],
                deduction: { copay: 0, networkDiscount: 0 },
                confidenceScore: 1.0,
                flags: [],
                notes: "Prescription is a mandatory document.",
                nextSteps: "Please resubmit with a valid prescription from a registered doctor.",
                aiReasoning: "A prescription from a registered doctor is required to process any OPD claim.",
            }
        }
        allRejectionReasons.push(...docValidation.reasons);
        confidenceScore -= 0.1;
    }
    // not using ai based reasoning here as its a static decision, we dont have to calculate anythgin here or do any math


    // coverage check
    const coverage = checkCoverage(input);
    if(!coverage.passed){
        const hardExclusions = coverage.reasons.filter((r) => r.includes("SERVICE_NOT_COVERED") && !r.includes("PRE_AUTH"));
        if(hardExclusions.length> 0){
            return {
                decision: "REJECTED",
                approvedAmount: 0,
                rejectionReasons: coverage.reasons,
                rejectedItems: coverage.rejectedItems,
                deduction: { copay: 0, networkDiscount: 0 },
                confidenceScore: 0.97,
                flags: [],
                notes: "Treatment/service is not covered under this policy.",
                nextSteps: "Please refer to your policy document for the list of covered treatments.",
                aiReasoning: await generateAdjudicationReasoning(
                    `${input.memberName} — ${input.documents.find((d) => d.diagnosis)?.diagnosis}`,
                    "REJECTED",
                    coverage.reasons
                ),
            }
        }
        allRejectionReasons.push(...coverage.reasons);
    }

    // limits and copay
    const limits = calculateLimitsAndCopay(input,coverage.rejectedItems);
    allRejectionReasons.push(...limits.reasons);

    // medical necessity
    const diagDoc = input.documents.find((d) => d.diagnosis);
    let medicalNecessityResult = { isNecessary: true, confidence: 0.9, reasoning: "" };

    if(diagDoc?.diagnosis){
        medicalNecessityResult = await assessMedicalNecessity(
            diagDoc.diagnosis,
            input.documents.flatMap((d) => d.medicines || []),
            input.documents.flatMap((d) => d.procedures || []),
            input.documents.flatMap((d) => d.tests || [])
        )

        confidenceScore = Math.min(confidenceScore, medicalNecessityResult.confidence + 0.05);
        if (!medicalNecessityResult.isNecessary) {
            allRejectionReasons.push("NOT_MEDICALLY_NECESSARY: Treatment appears inconsistent with diagnosis");
        }
    }

    // fraud check
    const fraud = detectFraud(input);
    allFlags.push(...fraud.flags);
    if(fraud.flags.length > 0){
        confidenceScore -= 0.2;
    }
    const hasHardRejection = allRejectionReasons.some((r) =>
    [
        "WAITING_PERIOD", 
        "ANNUAL_LIMIT_EXCEEDED", 
        "PRE_AUTH_MISSING", 
        "DOCTOR_REG_INVALID", 
        "MISSING_DOCUMENTS",
        "ILLEGIBLE_DOCUMENTS",
        "LATE_SUBMISSION"
    ].some((code) => r.includes(code))
);
    const requiresManualReview = fraud.requiresManualReview || confidenceScore < 0.7;

    let decision: AdjudicationResult["decision"];

    if (allRejectionReasons.length > 0 && hasHardRejection) {
    decision = "REJECTED";
    } else if (requiresManualReview && allRejectionReasons.length === 0) {
    decision = "MANUAL_REVIEW";
    } else if (coverage.rejectedItems.length > 0 && limits.approvedAmount > 0) {
    decision = "PARTIAL";
    } else if (allRejectionReasons.length > 0 && limits.approvedAmount === 0) {
    decision = "REJECTED";
    } else {
    decision = "APPROVED";
    }

    // LLM based explanation of the decision and details
    const aiReasoning = await generateAdjudicationReasoning(
    `${input.memberName} — ₹${input.claimAmount} claim for ${diagDoc?.diagnosis || "treatment"}`,
    decision,
    allRejectionReasons.length > 0 ? allRejectionReasons : ["All checks passed"]
  );

  const nextStepsMap: Record<string, string> = {
    APPROVED: "Your claim has been approved. Reimbursement will be processed within 3-5 business days.",
    REJECTED: "Your claim has been rejected. Please review the reasons and contact support if you have questions.",
    PARTIAL: "Part of your claim has been approved. The approved amount will be reimbursed within 3-5 business days.",
    MANUAL_REVIEW: "Your claim has been flagged for manual review by our team. Expect a response within 2 business days.",
  };
    return {
    decision,
    approvedAmount: decision === "REJECTED" ? 0 : limits.approvedAmount,
    rejectionReasons: allRejectionReasons,
    rejectedItems: coverage.rejectedItems,
    deduction: limits.deduction,
    confidenceScore: Math.max(0.1, Math.min(1.0, confidenceScore)),
    flags: allFlags,
    notes: medicalNecessityResult.reasoning || "",
    nextSteps: nextStepsMap[decision],
    aiReasoning,
  };
}