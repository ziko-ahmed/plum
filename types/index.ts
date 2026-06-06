// these defines what do we want want LLM to extract from the docs and how will the decicion look
export interface ExtractedDocumentData {
    documentType: "PRESCRIPTION" | "BILL" | "DIAGNOSTIC_REPORT" | "PHARMACY_BILL" | "OTHER";
    patientName?: string;
    treatmentDate?: string;
    doctorName?: string;
    doctorRegistrationNumber?: string;
    clinicName?: string;
    diagnosis?: string;
    medicines?: string[];
    procedures?: string[];
    testsOrdered?: string[];
    lineItems?: LineItem[]; // each row of the final bill
    totalAmount?: number;
    hasStamp?: boolean;
    hasSignature?: boolean;
    confidence?: number;
    rawText?: string;
} // we force the llm to spit this out

export interface LineItem {
    description: string;
    amount: number;
    category?: "consultation" | "medicine" | "diagnostic" | "procedure" | "others"
}

//data that the frontend will send to backend after user clicks submit claim
export interface ClaimInput {
    memberId: string;
    memberName: string;
    treatmentDate: string;
    claimAmount: number;
    hospital?: string;
    cashlessRequest?: boolean;
    memberJoinDate?: string;
    previousClaimsSameDay?: number;
    documents:{
        type:string;
        extractedData: ExtractedDocumentData;
    }[];
}

// final output given by the backend
export interface AdjudicationResult {
    decision: "APPROVED" | "REJECTED" | "PARTIAL" | "MANUAL_REVIEW";
    approvedAmount: number;
    rejectionReasons: string[];
    rejectedItems: string[];
    deduction: {
        copay?: number;
        networkDiscount?: number;
        subLimitExceeded?: number;
    }
    confidenceScore: number;
    flags: string[];
    notes: string;
    nextSteps: string;
    aiReasoning: string;
}

export interface RuleCheckResult {
    passed: boolean;
    reasons: string[];
    notes: string;
}

// The sanitized input our engine uses to do math
export interface AdjudicationInput {
  memberId: string;
  memberName: string;
  treatmentDate: Date;
  claimAmount: number;
  hospital?: string | null;
  cashlessRequest: boolean;
  memberJoinDate?: Date | null; 
  previousClaimsSameDay: number;
  annualClaimsTotal: number; // YTD approved amount from DB
  documents: DocumentSummary[];
}

// A flattened version of ExtractedDocumentData that is easier for the engine to read
export interface DocumentSummary {
  type: string;
  diagnosis?: string | null;
  doctorName?: string | null;
  doctorReg?: string | null;
  medicines?: string[];
  procedures?: string[];
  tests?: string[];
  lineItems?: { description: string; amount: number; category?: string }[];
  totalAmount?: number | null;
  confidence?: number;
  hasStamp?: boolean;
  hasSignature?: boolean;
}