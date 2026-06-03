"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { submitClaim } from "@/lib/api";
import type { ClaimResult } from "@/lib/types";

export default function SubmitPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // form state
  const [memberId, setMemberId] = useState("");
  const [memberName, setMemberName] = useState("");
  const [treatmentDate, setTreatmentDate] = useState("");
  const [claimAmount, setClaimAmount] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [cashless, setCashless] = useState(false);
  const [memberJoinDate, setMemberJoinDate] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  // ui state
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ClaimResult | null>(null);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  // handle file drop or selection
  function handleFiles(newFiles: FileList | null) {
    if (!newFiles) return;
    const added = Array.from(newFiles);
    setFiles((prev) => [...prev, ...added]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("member_id", memberId);
      formData.append("member_name", memberName);
      formData.append("treatment_date", treatmentDate);
      formData.append("claim_amount", claimAmount);
      if (hospitalName) formData.append("hospital_name", hospitalName);
      formData.append("cashless_request", cashless.toString());
      if (memberJoinDate) formData.append("member_join_date", memberJoinDate);

      for (const file of files) {
        formData.append("files", file);
      }

      const data = await submitClaim(formData);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  // show result page after submission
  if (result) {
    const decisionColor: Record<string, string> = {
      APPROVED: "approved",
      REJECTED: "rejected",
      PARTIAL: "partial",
      MANUAL_REVIEW: "manual_review",
    };

    return (
      <div className="result-page">
        <div className={`decision-banner ${decisionColor[result.decision]}`}>
          <div className="decision-title">{result.decision.replace("_", " ")}</div>
          <div className="decision-subtitle">{result.notes}</div>
        </div>

        {result.approved_amount > 0 && (
          <div style={{ margin: "24px 0" }}>
            <div className="stat-label">Approved Amount</div>
            <div className="result-amount">{"\u20B9"}{result.approved_amount.toLocaleString()}</div>
          </div>
        )}

        {/* deductions */}
        {Object.keys(result.deductions).length > 0 && (
          <div className="detail-card" style={{ marginBottom: 16 }}>
            <div className="detail-card-title">Deductions</div>
            {Object.entries(result.deductions).map(([key, val]) => (
              <div className="detail-row" key={key}>
                <span className="detail-label">{key.replace("_", " ")}</span>
                <span className="detail-value">{"\u20B9"}{val}</span>
              </div>
            ))}
          </div>
        )}

        {/* rejection reasons */}
        {result.rejection_reasons.length > 0 && (
          <div className="detail-card" style={{ marginBottom: 16 }}>
            <div className="detail-card-title">Reasons</div>
            {result.rejection_reasons.map((r) => (
              <div className="detail-row" key={r}>
                <span className="detail-value">{r.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>
        )}

        {/* rejected items */}
        {result.rejected_items.length > 0 && (
          <div className="detail-card" style={{ marginBottom: 16 }}>
            <div className="detail-card-title">Not Covered</div>
            {result.rejected_items.map((item, i) => (
              <div className="detail-row" key={i}>
                <span className="detail-value">{item}</span>
              </div>
            ))}
          </div>
        )}

        {/* step-by-step timeline */}
        {result.steps.length > 0 && (
          <div className="detail-card" style={{ marginBottom: 16 }}>
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* confidence */}
        <div className="confidence" style={{ margin: "16px 0" }}>
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
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>
            {result.next_steps}
          </p>
        )}

        <div className="result-actions">
          <button className="btn btn-primary" onClick={() => router.push("/")}>
            Back to Dashboard
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setResult(null);
              setFiles([]);
            }}
          >
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  // show processing state
  if (submitting) {
    return (
      <div className="processing">
        <div className="processing-spinner" />
        <p className="processing-text">Processing your claim...</p>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>
          Reading documents and checking against policy
        </p>
      </div>
    );
  }

  // main form
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Submit a Claim</h1>
        <p className="page-subtitle">
          Fill in the details and upload your documents
        </p>
      </div>

      {error && (
        <div className="decision-banner rejected" style={{ marginBottom: 20 }}>
          <div className="decision-subtitle">{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* member info */}
        <div className="form-section">
          <div className="form-section-title">Member Details</div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="member-id">Member ID</label>
              <input
                id="member-id"
                className="form-input"
                placeholder="EMP001"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="member-name">Full Name</label>
              <input
                id="member-name"
                className="form-input"
                placeholder="Rajesh Kumar"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="join-date">Join Date (optional)</label>
              <input
                id="join-date"
                className="form-input"
                type="date"
                value={memberJoinDate}
                onChange={(e) => setMemberJoinDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="treatment-date">Treatment Date</label>
              <input
                id="treatment-date"
                className="form-input"
                type="date"
                value={treatmentDate}
                onChange={(e) => setTreatmentDate(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* claim info */}
        <div className="form-section">
          <div className="form-section-title">Claim Details</div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="claim-amount">Claim Amount (INR)</label>
              <input
                id="claim-amount"
                className="form-input"
                type="number"
                placeholder="1500"
                value={claimAmount}
                onChange={(e) => setClaimAmount(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="hospital">Hospital / Clinic (optional)</label>
              <input
                id="hospital"
                className="form-input"
                placeholder="Apollo Hospitals"
                value={hospitalName}
                onChange={(e) => setHospitalName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <div className="checkbox-group">
                <input
                  id="cashless"
                  type="checkbox"
                  checked={cashless}
                  onChange={(e) => setCashless(e.target.checked)}
                />
                <label htmlFor="cashless">Cashless claim</label>
              </div>
            </div>
          </div>
        </div>

        {/* file upload */}
        <div className="form-section">
          <div className="form-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Documents</span>
            <div style={{ fontSize: "14px", fontWeight: "normal", display: "flex", gap: "16px" }}>
              <span style={{ color: "var(--text-muted)" }}>Need test files?</span>
              <a href="/samples/sample_approved.pdf" download style={{ color: "var(--primary)", textDecoration: "underline" }}>Approved Claim</a>
              <a href="/samples/sample_rejected.pdf" download style={{ color: "var(--primary)", textDecoration: "underline" }}>Rejected Claim</a>
            </div>
          </div>
          <div
            className={`upload-zone ${dragActive ? "active" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              handleFiles(e.dataTransfer.files);
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 500 }}>
              Drop files here or click to browse
            </div>
            <div className="upload-zone-hint">
              Prescriptions, bills, test reports — JPG, PNG, or PDF
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.pdf,.bmp,.tiff,.webp"
              style={{ display: "none" }}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {files.length > 0 && (
            <div className="file-list">
              {files.map((file, i) => (
                <div className="file-item" key={i}>
                  <span>{file.name}</span>
                  <button
                    type="button"
                    className="file-remove"
                    onClick={() => removeFile(i)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* submit */}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginBottom: 60 }}>
          <button type="button" className="btn btn-secondary" onClick={() => router.push("/")}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!memberId || !memberName || !treatmentDate || !claimAmount}>
            Submit Claim
          </button>
        </div>
      </form>
    </>
  );
}
