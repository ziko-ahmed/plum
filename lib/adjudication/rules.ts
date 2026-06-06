import { POLICY, DOCTOR_REG_PATTERNS } from '../../constants/policy';
import type { AdjudicationInput } from '@/types';
import type { RuleCheckResult } from '@/types';


// checking eligibility
export function checkEligibility(input: AdjudicationInput): RuleCheckResult{
    const reasons: string[] = [];
    const treatmentDate = new Date(input.treatmentDate);
    const joinDate = input.memberJoinDate ? new Date(input.memberJoinDate) : null;

    // initial wait is 30 days
    if(joinDate){
        const daysSinceJoining = Math.floor(
            (treatmentDate.getTime() - joinDate.getTime()) / (1000*60*60*24)
        )
        if(daysSinceJoining < POLICY.waiting_periods.initial_days){
            reasons.push(
                `WAITING_PERIOD: Treatment within initial ${POLICY.waiting_periods.initial_days}-day waiting period. ` +
                `Eligible from ${new Date(joinDate.getTime() + POLICY.waiting_periods.initial_days * 86400000).toDateString()}`
            );
        }
    }
    if(input.claimAmount < POLICY.minimum_claim_amount){
        reasons.push(`BELOW_MIN_AMOUNT: Claim ₹${input.claimAmount} is below minimum ₹${POLICY.minimum_claim_amount}`);
    }

    // Late submission check (must submit within 30 days of treatment)
    const daysSinceTreatment = Math.floor(
        (Date.now() - treatmentDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if(daysSinceTreatment > POLICY.submission_deadline_days){
        reasons.push(
            `LATE_SUBMISSION: Claim submitted ${daysSinceTreatment} days after treatment. Deadline is ${POLICY.submission_deadline_days} days.`
        );
    }

    return {
        passed: reasons.length === 0, // if no reasons to reject then pass
        reasons,
        notes: reasons.length === 0 ? "Basic eligibility confirmed" : reasons.join("; ")
    }
}

// waiting period for specific conditions that takes months to develop like - join replacements, cataracts, stones, diabetes
export function checkConditionWaitingPeriod(
    diagnosis: string | null | undefined,
    treatmentDate: Date,
    memberJoinDate: Date | null | undefined,
): { hasWaitingPeriod: boolean; reason?: string; eligibleFrom?: string}{
    if(!diagnosis || !memberJoinDate){
        return {
            hasWaitingPeriod: false
        }
    }
    const diagnosisLower = diagnosis.toLowerCase();
    const joinDate = new Date(memberJoinDate);

    for(const [condition,days] of Object.entries(POLICY.waiting_periods.specific)){
        if(diagnosisLower.includes(condition.toLowerCase())){
            const eligibleDate = new Date(joinDate.getTime() + days * 86400000);
            if(treatmentDate < eligibleDate){
                return{
                    hasWaitingPeriod: true,
                    reason: `WAITING_PERIOD: ${condition} has a ${days}-day waiting period.`,
                    eligibleFrom: eligibleDate.toDateString()
                }
            }
        }
    }
    return {hasWaitingPeriod: false};
}

// validate the documents
export function validateDocuments(input: AdjudicationInput): RuleCheckResult{
    const reasons: string[]  = [];
    const docTypes = input.documents.map((d) => d.type.toUpperCase())

    // Some documents might be classified as OTHER but contain a doctor registration number
    const prescription = input.documents.find((d) => d.type.toUpperCase() === "PRESCRIPTION" || d.doctorReg);

    if(!prescription){
        reasons.push("MISSING_DOCUMENTS: Prescription from a registered doctor is required");
        return { passed: false, reasons, notes: reasons.join("; ") };
    }
    
    if(!prescription?.doctorReg){
        reasons.push("DOCTOR_REG_INVALID: Doctor registration number is missing from prescription");
    } else{
        const reg = DOCTOR_REG_PATTERNS.some((pattern) => pattern.test(prescription.doctorReg!));
        if(!reg){
            reasons.push(`DOCTOR_REG_INVALID: Registration number '${prescription.doctorReg}' format is invalid`);
        }
    }
    
    // docs with low confidence scores
    const lowConfidenceDocs = input.documents.filter((d) => (d.confidence ?? 1) < 0.4);
    if(lowConfidenceDocs.length > 0){
        reasons.push("ILLEGIBLE_DOCUMENTS: One or more documents could not be read clearly");
    }

    //bill is necessary for claims
    if(!docTypes.includes("BILL") && !docTypes.includes("PHARMACY_BILL")){
        reasons.push("MISSING_DOCUMENTS: At least one bill/receipt is required");
    }

    return{
        passed: reasons.length === 0,
        reasons,
        notes: reasons.length === 0 ? "All documents validated successfully" : reasons.join(": ")
    }
}


// what is covered in the claim vs what is excluded
export function checkCoverage(input: AdjudicationInput):{passed: boolean; reasons: string[]; rejectedItems:string[]; approvedItems:string[]}{
    const reasons: string[] = [];
    const rejectedItems: string[] = [];
    const approvedItems: string[] = [];

    const allProcedures = input.documents.flatMap((d) => d.procedures || []);
    const allTests = input.documents.flatMap((d) => d.tests || []);
    const diagnosis = input.documents.find((d) => d.diagnosis)?.diagnosis || "";
    
    // checking the diagnosis against waiting periods
    const waitingCheck = checkConditionWaitingPeriod(
        diagnosis,
        new Date(input.treatmentDate),
        input.memberJoinDate ? new Date(input.memberJoinDate) : null
    )
    if(waitingCheck.hasWaitingPeriod){
        reasons.push(`${waitingCheck.reason} Eligible from: ${waitingCheck.eligibleFrom}`);
    }
    const diagnosisLower = diagnosis.toLowerCase()
    for(const exclusion of POLICY.exclusions){
        if(diagnosisLower.includes(exclusion.toLowerCase())){
            reasons.push(`SERVICE_NOT_COVERED: '${diagnosis}' falls under exclusion: ${exclusion}`);
            break;
        }
    }
    // checking for procedures - partial approvals for dental, cosmetics, etc
    for(const procedure of allProcedures){
        const procedureLower = procedure.toLowerCase()
        if(POLICY.dental.excluded_procedures.some((ep) => procedureLower.includes(ep))){
            rejectedItems.push(`${procedure} — cosmetic dental procedure not covered`);
            reasons.push("COSMETIC_PROCEDURE");
            } else {
            approvedItems.push(procedure);
        }

        // vision and lasik check
        if(POLICY.vision.excluded.some((ep) => procedure.includes(ep))) {
            rejectedItems.push(`${procedure} — LASIK surgery not covered`);
            reasons.push("SERVICE_NOT_COVERED");
        }
    }

    // pre-auth for MRI and CT
    for(const test of allTests){
        const testLower = test.toLowerCase();
        if(POLICY.diagnostic.tests_needing_preauth.some((t) => testLower.includes(t.toLowerCase()))){
            const bill = input.documents.find((d) => d.type.toUpperCase() === "BILL");
            const testAmount = bill?.lineItems?.find((li) => 
                li.description.toLowerCase().includes(testLower.split(" ")[0])
            )?. amount || 0;
            if((bill?.totalAmount || input.claimAmount) > POLICY.pre_auth_threshold){
                reasons.push(`PRE_AUTH_MISSING: ${test} requires pre-authorization for claims above ₹${POLICY.pre_auth_threshold}`)
            }
        }
    }
    return {
        passed: reasons.length === 0,
        reasons,
        rejectedItems,
        approvedItems,
    }
}


// finacnce limits and copay 
export function calculateLimitsAndCopay( input: AdjudicationInput, rejectedItems: string[]): {approvedAmount: number; reasons: string[]; deduction: {copay: number; networkDiscount: number;}; limitExceeded: boolean; } {
    const reasons: string[] = [];
    let approvedAmount = input.claimAmount;
    let deductionForRejected = 0;
    let copay = 0;
    let networkDiscount = 0;

    // remove the rejected items amount
    const bill = input.documents.find((d) => 
        ["BILL", "PHARMACY_BILL"].includes(d.type.toUpperCase())
    )
    if(bill?.lineItems){
        for(const rejItem of rejectedItems){
            const matchingLine = bill.lineItems.find((li) => 
                rejItem.toLowerCase().includes(li.description.toLocaleLowerCase())
            )
            if(matchingLine){
                deductionForRejected+= matchingLine.amount;
            }
        }
        approvedAmount -= deductionForRejected;
    }

    // Determine effective per-claim limit based on claim category
    // Category sub-limits override the general ₹5K per-claim limit when higher
    const diagnosis = input.documents.find(d => d.diagnosis)?.diagnosis?.toLowerCase() || '';
    const allProcs = input.documents.flatMap(d => d.procedures || []).map(p => p.toLowerCase());
    let effectivePerClaimLimit: number = POLICY.per_claim_limit;

    // Dental claims use dental sub-limit
    const isDental = allProcs.some(p =>
        [...POLICY.dental.covered_procedures, ...POLICY.dental.excluded_procedures].some(dp => p.includes(dp))
    ) || diagnosis.includes('tooth') || diagnosis.includes('dental') || diagnosis.includes('root canal');
    if(isDental) effectivePerClaimLimit = Math.max(effectivePerClaimLimit, POLICY.dental.sub_limit);

    // Diagnostic-heavy claims use diagnostic sub-limit
    const allTests = input.documents.flatMap(d => d.tests || []);
    if(allTests.length > 0) effectivePerClaimLimit = Math.max(effectivePerClaimLimit, POLICY.diagnostic.sub_limit);

    // Vision claims use vision sub-limit
    if(diagnosis.includes('eye') || diagnosis.includes('vision'))
        effectivePerClaimLimit = Math.max(effectivePerClaimLimit, POLICY.vision.sub_limit);

    // Alternative medicine claims use alt-med sub-limit
    if(POLICY.alternative_medicine.covered_systems.some(s => diagnosis.includes(s)))
        effectivePerClaimLimit = Math.max(effectivePerClaimLimit, POLICY.alternative_medicine.sub_limit);

    if(approvedAmount > effectivePerClaimLimit){
        reasons.push(
            `PER_CLAIM_EXCEEDED: Approved amount ₹${approvedAmount} exceeds limit of ₹${effectivePerClaimLimit}`
        );
        approvedAmount = effectivePerClaimLimit;
    } 

    //network discount
    const isNetwork = POLICY.network_hospitals.some((h) => 
    (input.hospital || "").toLowerCase().includes(h.toLowerCase()))
    if(isNetwork && input.cashlessRequest){
        networkDiscount = Math.floor(approvedAmount * (POLICY.consultation.network_discount_percentage/100))
        approvedAmount -= networkDiscount;
    }

    // copay
    const prescriptionDoc = input.documents.find((d) => d.type.toUpperCase() === "PRESCRIPTION" || d.doctorReg)
    if(prescriptionDoc){
        copay = Math.floor(approvedAmount * (POLICY.consultation.copay_percentage/100))
        approvedAmount -= copay;
    }

    // Annual limit check — cap to remaining annual limit
    const ytdTotal = input.annualClaimsTotal || 0;
    if(ytdTotal + approvedAmount > POLICY.annual_limit){
        const remaining = Math.max(0, POLICY.annual_limit - ytdTotal);
        if(remaining === 0){
            reasons.push(`ANNUAL_LIMIT_EXCEEDED: Annual limit of ₹${POLICY.annual_limit} already exhausted`);
            approvedAmount = 0;
        } else {
            reasons.push(`ANNUAL_LIMIT_EXCEEDED: Capped to remaining annual limit of ₹${remaining}`);
            approvedAmount = remaining;
        }
    }

    return {
        approvedAmount: Math.max(0,Math.round(approvedAmount)),
        reasons,
        deduction:{copay,networkDiscount},
        limitExceeded: reasons.length > 0,
    }
}

// fraud detection 
export function detectFraud(input: AdjudicationInput):{flags: string[]; requiresManualReview:boolean}{
    const flags: string[] = [];
    if((input.previousClaimsSameDay || 0) >= POLICY.fraud_flags.max_claims_same_day){
        flags.push("Multiple claims submitted on the same day — unusual pattern detected");
    }
    if(input.claimAmount > POLICY.fraud_flags.high_value_manual_review_threshold){
        flags.push(`High-value claim (₹${input.claimAmount}) flagged for manual review`);
    }

    const avgConfidence = input.documents.reduce((sum,d) => sum + (d.confidence ?? 1),0) / Math.max(input.documents.length,1);
    if(avgConfidence < 0.5){
        flags.push("Low document quality — possible illegibility or tampering");
    }
    return {
        flags,
        requiresManualReview: flags.length > 0 || avgConfidence < POLICY.fraud_flags.low_confidence_threshold
    }
}