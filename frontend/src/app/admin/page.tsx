"use client";

import { useState } from "react";
import { getPolicy, updatePolicy } from "@/lib/api";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [policyText, setPolicyText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const policy = await getPolicy(password);
      setPolicyText(JSON.stringify(policy, null, 2));
      setIsAuthenticated(true);
    } catch (err) {
      setError("Invalid admin password or server error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      const newPolicy = JSON.parse(policyText);
      await updatePolicy(password, newPolicy);
      setSuccess("Policy successfully updated!");
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("Invalid JSON format. Please fix any syntax errors.");
      } else {
        setError("Failed to update policy on server.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Enter password to configure policy terms</p>
        </div>
        
        <div className="detail-card" style={{ maxWidth: 400, margin: "40px auto" }}>
          {error && <div style={{ color: "var(--error)", marginBottom: 16 }}>{error}</div>}
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Admin Password</label>
              <input
                id="password"
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="plum2026"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Authenticating..." : "Login"}
            </button>
          </form>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Policy Configuration</h1>
        <p className="page-subtitle">Edit the JSON below to dynamically change policy limits and rules.</p>
      </div>
      
      <div className="detail-card" style={{ marginBottom: 40 }}>
        {error && <div style={{ color: "var(--error)", marginBottom: 16, padding: "12px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px" }}>{error}</div>}
        {success && <div style={{ color: "var(--success)", marginBottom: 16, padding: "12px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "8px" }}>{success}</div>}
        
        <div className="form-group">
          <textarea 
            className="form-input" 
            style={{ height: 600, fontFamily: "monospace", fontSize: 13, lineHeight: 1.5, resize: "vertical" }}
            value={policyText}
            onChange={(e) => setPolicyText(e.target.value)}
          />
        </div>
        
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={() => setIsAuthenticated(false)}>Logout</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Policy Rules"}
          </button>
        </div>
      </div>
    </>
  );
}
