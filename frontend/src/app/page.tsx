"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getClaims } from "@/lib/api";
import type { ClaimRecord, Decision } from "@/lib/types";

// maps decision to badge class
function badgeClass(decision: Decision) {
  return `badge badge-${decision.toLowerCase()}`;
}

// friendly label for decisions
function decisionLabel(decision: Decision) {
  const labels: Record<Decision, string> = {
    APPROVED: "Approved",
    REJECTED: "Rejected",
    PARTIAL: "Partial",
    MANUAL_REVIEW: "Review",
  };
  return labels[decision] || decision;
}

export default function DashboardPage() {
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClaims()
      .then((data) => setClaims(data.claims || []))
      .catch(() => setClaims([]))
      .finally(() => setLoading(false));
  }, []);

  // count stats
  const total = claims.length;
  const approved = claims.filter((c) => c.result?.decision === "APPROVED").length;
  const rejected = claims.filter((c) => c.result?.decision === "REJECTED").length;
  const pending = claims.filter(
    (c) => c.result?.decision === "PARTIAL" || c.result?.decision === "MANUAL_REVIEW"
  ).length;

  if (loading) {
    return (
      <div className="processing">
        <div className="processing-spinner" />
        <p className="processing-text">Loading claims...</p>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Claims</h1>
        <p className="page-subtitle">
          All submitted OPD claims and their decisions
        </p>
      </div>

      {/* stats */}
      <div className="stats">
        <div className="stat-card">
          <div className="stat-label">Total</div>
          <div className="stat-value">{total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Approved</div>
          <div className="stat-value green">{approved}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Rejected</div>
          <div className="stat-value red">{rejected}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending</div>
          <div className="stat-value amber">{pending}</div>
        </div>
      </div>

      {/* claims list */}
      {claims.length === 0 ? (
        <div className="empty-state">
          <h3>No claims yet</h3>
          <p>Submit your first claim to get started.</p>
          <Link href="/submit" className="btn btn-primary" style={{ marginTop: 20 }}>
            New Claim
          </Link>
        </div>
      ) : (
        <div className="claims-list">
          {claims.map((claim) => (
            <Link
              key={claim.claim_id}
              href={`/claims/${claim.claim_id}`}
              className="claim-row"
            >
              <span className="claim-id">{claim.claim_id}</span>
              <span className="claim-name">{claim.submission.member_name}</span>
              <span>
                {claim.result && (
                  <span className={badgeClass(claim.result.decision)}>
                    {decisionLabel(claim.result.decision)}
                  </span>
                )}
              </span>
              <span className="claim-amount">
                {"\u20B9"}{claim.submission.claim_amount.toLocaleString()}
              </span>
              <span className="claim-date">
                {new Date(claim.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
