/**
 * CrisisVerify — Utility Helpers
 * Location extraction, text processing, and math utilities
 */

// ─── Curated list of major Indian cities & states ──────────
const INDIAN_LOCATIONS = [
  // Metro cities
  'Mumbai', 'Delhi', 'Bangalore', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata',
  'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Surat', 'Kanpur', 'Nagpur',
  'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Patna', 'Vadodara', 'Ghaziabad',
  'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Varanasi',
  'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar', 'Allahabad', 'Prayagraj',
  'Ranchi', 'Howrah', 'Coimbatore', 'Jabalpur', 'Gwalior', 'Vijayawada',
  'Jodhpur', 'Madurai', 'Raipur', 'Kochi', 'Chandigarh', 'Mysore', 'Mysuru',
  'Thiruvananthapuram', 'Guwahati', 'Noida', 'Gurgaon', 'Gurugram',
  // States & UTs
  'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh',
  'Rajasthan', 'Gujarat', 'West Bengal', 'Madhya Pradesh', 'Bihar',
  'Andhra Pradesh', 'Punjab', 'Haryana', 'Jharkhand', 'Chhattisgarh',
  'Odisha', 'Kerala', 'Assam', 'Uttarakhand', 'Himachal Pradesh',
  'Tripura', 'Meghalaya', 'Manipur', 'Nagaland', 'Mizoram', 'Arunachal Pradesh',
  'Sikkim', 'Goa', 'Jammu', 'Kashmir', 'Ladakh', 'Puducherry',
  // Commonly mentioned areas
  'India', 'Pakistan', 'Nepal', 'Bangladesh', 'Sri Lanka', 'China'
];

/**
 * Extract location entities from text using pattern matching
 * @param {string} text - Input text to extract locations from
 * @returns {string[]} - Array of detected location names
 */
export function extractLocations(text) {
  if (!text) return [];
  const found = [];
  const normalized = text.toLowerCase();

  for (const loc of INDIAN_LOCATIONS) {
    if (normalized.includes(loc.toLowerCase())) {
      found.push(loc);
    }
  }

  // Deduplicate (e.g., "Bengaluru" and "Bangalore" are same city)
  const aliases = {
    'Bengaluru': 'Bangalore',
    'Mysuru': 'Mysore',
    'Prayagraj': 'Allahabad',
    'Gurugram': 'Gurgaon'
  };

  const deduped = [];
  const seen = new Set();
  for (const loc of found) {
    const canonical = aliases[loc] || loc;
    if (!seen.has(canonical)) {
      seen.add(canonical);
      deduped.push(loc);
    }
  }

  return deduped;
}

/**
 * Extract potential source domain from text
 * @param {string} text
 * @returns {string|null}
 */
export function extractDomain(text) {
  if (!text) return null;
  const domainPattern = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)/gi;
  const matches = text.match(domainPattern);
  if (matches && matches.length > 0) {
    return matches[0].replace(/^(?:https?:\/\/)?(?:www\.)?/, '').toLowerCase();
  }
  return null;
}

/**
 * Simple language detection based on Unicode character ranges
 * @param {string} text
 * @returns {string} Detected language name
 */
export function detectLanguage(text) {
  if (!text) return 'English';

  const charSamples = text.substring(0, 200);

  // Devanagari (Hindi, Marathi)
  if (/[\u0900-\u097F]/.test(charSamples)) {
    // Check for Marathi-specific words
    if (/(?:आहे|नाही|होते|आणि|माझे)/.test(charSamples)) return 'Marathi';
    return 'Hindi';
  }
  // Bengali
  if (/[\u0980-\u09FF]/.test(charSamples)) return 'Bengali';
  // Telugu
  if (/[\u0C00-\u0C7F]/.test(charSamples)) return 'Telugu';
  // Tamil
  if (/[\u0B80-\u0BFF]/.test(charSamples)) return 'Tamil';
  // Kannada
  if (/[\u0C80-\u0CFF]/.test(charSamples)) return 'Kannada';
  // Malayalam
  if (/[\u0D00-\u0D7F]/.test(charSamples)) return 'Malayalam';
  // Gujarati
  if (/[\u0A80-\u0AFF]/.test(charSamples)) return 'Gujarati';
  // Gurmukhi (Punjabi)
  if (/[\u0A00-\u0A7F]/.test(charSamples)) return 'Punjabi';

  return 'English';
}

/**
 * Classify the overall verdict based on scores
 * @param {number} csScore - Credibility score (0-1)
 * @param {number} gragMatches - Number of corroborating sources
 * @param {boolean} imageAuthentic - Whether image passed C2PA check
 * @returns {{ verdict: string, confidence: number, riskLevel: string }}
 */
export function classifyVerdict(csScore, gragMatches, imageAuthentic = null) {
  let confidence = 0;
  let verdict = 'UNCERTAIN';
  let riskLevel = 'MEDIUM';

  // Calculate weighted confidence
  const gragScore = Math.min(gragMatches / 5, 1.0); // Normalize to 0-1

  if (imageAuthentic !== null) {
    confidence = (csScore * 0.4) + (gragScore * 0.4) + (imageAuthentic ? 0.2 : 0);
  } else {
    confidence = (csScore * 0.5) + (gragScore * 0.5);
  }

  // Classify
  if (confidence >= 0.7 && gragMatches >= 3) {
    verdict = 'VERIFIED';
    riskLevel = 'LOW';
  } else if (confidence < 0.4 || gragMatches === 0) {
    verdict = 'HIGH_RISK';
    riskLevel = 'HIGH';
  } else if (confidence >= 0.4 && confidence < 0.7) {
    verdict = 'UNCERTAIN';
    riskLevel = 'MEDIUM';
  }

  return { verdict, confidence: Math.round(confidence * 100) / 100, riskLevel };
}

/**
 * Format milliseconds to human-readable duration
 */
export function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Truncate text for display
 */
export function truncate(text, maxLen = 200) {
  if (!text || text.length <= maxLen) return text;
  return text.substring(0, maxLen) + '…';
}
