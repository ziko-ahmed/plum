/**
 * api.ts — simple fetch wrapper for talking to the backend
 *
 * all api calls go through here so we have one place to change
 * the base url or add headers later
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// generic fetch helper with error handling
async function request(path: string, options?: RequestInit) {
  const url = `${API_BASE}${path}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || `request failed: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error(`api error [${path}]:`, err);
    throw err;
  }
}

// submit a new claim with file uploads
export async function submitClaim(formData: FormData) {
  return request("/api/claims", {
    method: "POST",
    body: formData,
  });
}

// submit a test claim (structured json, no files)
export async function submitTestClaim(data: Record<string, unknown>) {
  return request("/api/claims/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// get all claims
export async function getClaims() {
  return request("/api/claims");
}

// get a single claim by id
export async function getClaim(claimId: string) {
  return request(`/api/claims/${claimId}`);
}
