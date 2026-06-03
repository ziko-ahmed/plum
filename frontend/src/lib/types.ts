/**
 * types.ts — shared types used across the frontend
 */

export type Decision = "APPROVED" | "REJECTED" | "PARTIAL" | "MANUAL_REVIEW";

export interface StepResult {
  step_name: string;
  passed: boolean;
  reason_code: string | null;
  details: string;
}

export interface ClaimResult {
  claim_id: string;
  decision: Decision;
  approved_amount: number;
  rejection_reasons: string[];
  rejected_items: string[];
  confidence_score: number;
  notes: string;
  next_steps: string;
  steps: StepResult[];
  deductions: Record<string, number>;
}

export interface ClaimSubmission {
  member_id: string;
  member_name: string;
  treatment_date: string;
  claim_amount: number;
  hospital_name?: string;
  cashless_request: boolean;
  member_join_date?: string;
  previous_claims_ytd: number;
  previous_claims_same_day: number;
}

export interface ClaimRecord {
  claim_id: string;
  submission: ClaimSubmission;
  result: ClaimResult | null;
  created_at: string;
  status: string;
  uploaded_files: string[];
}
