/**
 * CrisisVerify — Backend API Client (Unified Multi-Modal)
 */

const API_BASE = 'http://localhost:3001/api';

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Health check failed:', err);
    return null;
  }
}

/**
 * Unified verification endpoint sending multipart/form-data
 */
export async function verifyUnified(file, textClaim, options = {}) {
  const formData = new FormData();
  
  if (file) {
    formData.append('image', file);
  }
  
  if (textClaim && textClaim.trim().length > 0) {
    formData.append('claim', textClaim);
  }
  
  if (options.sourceDomain) formData.append('sourceDomain', options.sourceDomain);
  if (options.authorName) formData.append('authorName', options.authorName);
  if (options.authorCount) formData.append('authorCount', options.authorCount);

  const res = await fetch(`${API_BASE}/verify`, {
    method: 'POST',
    body: formData
    // Note: Do not set Content-Type header when using FormData, 
    // the browser automatically sets it to multipart/form-data with boundaries.
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Server error: ${res.status}`);
  }

  return res.json();
}
