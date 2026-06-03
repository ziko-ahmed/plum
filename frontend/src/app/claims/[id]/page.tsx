"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getClaim } from "@/lib/api";
import type { ClaimRecord } from "@/lib/types";

export default function ClaimDetailPage() {
  const params = useParams();
  const router = useRouter();
  const claimId = params.id as string;

  const [claim, setClaim] = useState<ClaimRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!claimId) return;
    getClaim(claimId)
      .then(setClaim)
      .catch(() => setClaim(null))
      .finally(() => setLoading(false));
  }, [claimId]);

  if (loading) {
    return (
      <div className="processing">
        <div className="processing-spinner" />
        <p className="processing-text">Loading claim...</p>
      </div>
    );
  }

  if (!claim || !claim.result) {
    return (
      <div className="empty-state">
        <h3>Claim not found</h3>
        <p>The claim you are looking for does not exist.</p>
        <button className="btn btn-primary" onClick={() => router.push("/")} style={{ marginTop: 20 }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const result = claim.result;
  const sub = claim.submission;
  const decisionColor: Record<string, string> = {
    APPROVED: "approved",
    REJECTED: "rejected",
    PARTIAL: "partial",
    MANUAL_REVIEW: "manual_review",
  };

  return (
    <>
      <div className="page-header">
        <button
          className="btn btn-secondary"
          onClick={() => router.push("/")}
          style={{ marginBottom: 16 }}
        >
          Back
        </button>
        <h1 className="page-title">{claim.claim_id}</h1>
        <p className="page-subtitle">
          Submitted {new Date(claim.created_at).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* decision banner */}
      <div className={`decision-banner ${decisionColor[result.decision]}`}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="decision-title">{result.decision.replace("_", " ")}</div>
            <div className="decision-subtitle">{result.notes}</div>
          </div>
          {result.approved_amount > 0 && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, opacity: 0.7 }}>Approved</div>
              <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-1px" }}>
                {"\u20B9"}{result.approved_amount.toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="detail-grid">
        {/* member info */}
        <div className="detail-card">
          <div className="detail-card-title">Member</div>
          <div className="detail-row">
            <span className="detail-label">Name</span>
            <span className="detail-value">{sub.member_name}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Member ID</span>
            <span className="detail-value">{sub.member_id}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Treatment Date</span>
            <span className="detail-value">{sub.treatment_date}</span>
          </div>
          {sub.hospital_name && (
            <div className="detail-row">
              <span className="detail-label">Hospital</span>
              <span className="detail-value">{sub.hospital_name}</span>
            </div>
          )}
        </div>

        {/* claim info */}
        <div className="detail-card">
          <div className="detail-card-title">Claim</div>
          <div className="detail-row">
            <span className="detail-label">Claimed Amount</span>
            <span className="detail-value">{"\u20B9"}{sub.claim_amount.toLocaleString()}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Approved Amount</span>
            <span className="detail-value">{"\u20B9"}{result.approved_amount.toLocaleString()}</span>
          </div>
          {Object.entries(result.deductions).map(([key, val]) => (
            <div className="detail-row" key={key}>
              <span className="detail-label">{key.replace(/_/g, " ")}</span>
              <span className="detail-value">- {"\u20B9"}{(val as number).toLocaleString()}</span>
            </div>
          ))}
          <div className="detail-row">
            <span className="detail-label">Cashless</span>
            <span className="detail-value">{sub.cashless_request ? "Yes" : "No"}</span>
          </div>
        </div>

        {/* rejection reasons */}
        {result.rejection_reasons.length > 0 && (
          <div className="detail-card">
            <div className="detail-card-title">Rejection Reasons</div>
            {result.rejection_reasons.map((r) => (
              <div className="detail-row" key={r}>
                <span className="detail-value" style={{ color: "var(--red)" }}>
                  {r.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* rejected items */}
        {result.rejected_items.length > 0 && (
          <div className="detail-card">
            <div className="detail-card-title">Items Not Covered</div>
            {result.rejected_items.map((item, i) => (
              <div className="detail-row" key={i}>
                <span className="detail-value">{item}</span>
              </div>
            ))}
          </div>
        )}

        {/* verification steps */}
        <div className="detail-card full-width">
          <div className="detail-card-title">Verification Steps</div>
          <div className="timeline">
            {result.steps.map((step, i) => (
              <div className="timeline-step" key={i}>
                <div className="timeline-marker">
                  <div className={`timeline-dot ${step.passed ? "passed" : "failed"}`}>
                    {step.passed ? "\u2713" : "\u2717"}
                  </div>
                  {i < result.steps.length - 1 && <div className="timeline-line" />}
                </div>
                <div className="timeline-content">
                  <div className="timeline-title">
                    {step.step_name.replace(/_/g, " ")}
                  </div>
                  <div className="timeline-detail">{step.details}</div>
                  {step.reason_code && (
                    <div className="timeline-detail" style={{ color: "var(--red)", marginTop: 2 }}>
                      {step.reason_code.replace(/_/g, " ")}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* confidence + next steps */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 60 }}>
        <div className="confidence">
          <span>Confidence:</span>
          <div className="confidence-bar">
            <div
              className="confidence-fill"
              style={{ width: `${result.confidence_score * 100}%` }}
            />
          </div>
          <span>{Math.round(result.confidence_score * 100)}%</span>
        </div>
        {result.next_steps && (
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            {result.next_steps}
          </p>
        )}
      </div>
    </>
  );
}
