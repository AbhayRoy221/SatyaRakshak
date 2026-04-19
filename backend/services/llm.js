/**
 * CrisisVerify — LLM Integration Layer
 * Dual-model strategy: Groq (fast) + Gemini (long-context)
 */
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

// ─── Initialize clients ────────────────────────────────────
let groqClient = null;
let geminiModel = null;

if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'gsk_your_groq_api_key_here') {
  groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  console.log('✅ Groq LLM initialized (llama-3.1-8b-instant)');
}

if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  console.log('✅ Gemini LLM initialized (gemini-2.5-flash)');
}

// ─── System Prompts ────────────────────────────────────────
const FORENSIC_SYSTEM_PROMPT = `You are the Lead Forensic Intelligence Agent for the CrisisVerify Engine. Your goal is to autonomously investigate high-stakes crisis misinformation. Instead of a fixed sequence, act as a 'CogPlanner'—a cognitive reasoning agent that decides which forensic tools to prioritize.

Instructions:
Observe: Identify if the claim is location-specific, author-based, or media-heavy.
Think: You have been provided parallel evidence from GDELT, Tavily, and C2PA validators. Review this data comprehensively.
Act: Evaluate the results. If a tool fails, execute a failover check. 
Synthesize: Reason across all retrieved evidence. If facts from G-RAG contradict the claim, you must force a 'CONTRADICTED' override, regardless of source credibility.

Analyze the findings from the new Digital Fingerprinting (Track 5):
- Platform Match: Does the UI Artifact check (Vision) match the Stylometric Fingerprint (Text)?
- Patient Zero: Is the earliest public record found via Temporal Search a high-risk social source or a reputable news outlet?
- Inconsistency Flag: If the claim was first seen on a high-risk platform (WhatsApp/Twitter) but claims official authority, trigger a 'Source Discrepancy' warning.

When synthesizing a verdict, ALWAYS structure your response EXACTLY as:
1. CLAIM SUMMARY: Brief restatement of the claim
2. EVIDENCE ANALYSIS: What each verification track found (MUST explicitly mention Track 5 Origin/Stylometry Evidence)
3. KEY INDICATORS: Specific red/green flags
4. VERDICT: VERIFIED / HIGH_RISK / UNCERTAIN / UNVERIFIABLE
5. CONFIDENCE: Percentage with justification
6. RECOMMENDATION: What the reader should do next`;

const NER_SYSTEM_PROMPT = `Extract all named entities from the following text. Return ONLY a JSON object with these fields:
- locations: array of place names
- persons: array of person names  
- organizations: array of org names
- events: array of event descriptions
- dates: array of date/time references
- numbers: array of numerical claims (death tolls, amounts, etc.)
Do not include any explanation, only the JSON.`;

/**
 * Fast inference via Groq (Llama-3.1-8B)
 * For: Quick classification, entity extraction, verdict generation
 */
export async function queryGroq(prompt, systemPrompt = FORENSIC_SYSTEM_PROMPT) {
  if (!groqClient) {
    return { content: generateFallbackAnalysis(prompt), model: 'fallback', latency: 0 };
  }

  const start = Date.now();
  try {
    const response = await groqClient.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 1024,
      top_p: 0.9
    });

    return {
      content: response.choices[0]?.message?.content || '',
      model: 'groq/llama-3.1-8b-instant',
      latency: Date.now() - start,
      tokens: response.usage
    };
  } catch (err) {
    console.error('⚠️  Groq error, falling back to Gemini:', err.message);
    return queryGemini(prompt, systemPrompt);
  }
}

/**
 * Long-context analysis via Gemini 1.5 Flash
 * For: Large crisis reports, multi-article comparison
 */
export async function queryGemini(prompt, systemPrompt = FORENSIC_SYSTEM_PROMPT) {
  if (!geminiModel) {
    return { content: generateFallbackAnalysis(prompt), model: 'fallback', latency: 0 };
  }

  const start = Date.now();
  try {
    const fullPrompt = `${systemPrompt}\n\n---\n\n${prompt}`;
    const result = await geminiModel.generateContent(fullPrompt);
    const text = result.response.text();

    return {
      content: text,
      model: 'gemini-2.5-flash',
      latency: Date.now() - start
    };
  } catch (err) {
    console.error('❌ Gemini error:', err.message);
    return { content: generateFallbackAnalysis(prompt), model: 'fallback', latency: 0 };
  }
}

/**
 * Extract text claim from image using Gemini Vision (Multi-modal OCR)
 * Extremely useful for reading Hindi/Marathi WhatsApp memes and extracting the claim.
 */
export async function extractClaimFromImage(imageBuffer, mimeType = 'image/jpeg') {
  if (!geminiModel) {
    console.warn('⚠️ Gemini not configured, skipping Vision OCR.');
    return null;
  }

  const prompt = `Perform a pixel-level UI audit on the uploaded screenshot to identify its platform of origin while extracting the primary text claim. 
  Search for 'soft evidence' and forensic artifacts unique to social media interfaces:
  WhatsApp: Look for the 'Forwarded' label, specific green hex codes (#075E54 or #25D366), and header icon spacing.
  Instagram: Detect the specific positioning of the 'Like' heart icon, typography (San Francisco or Roboto variant), and story-view progress bars.
  Twitter/X: Identify blue-check placement, 'View counts' alignment, and the specific 'Post' button curvature.
  Metadata: Check if the 'Software' tag or history agent in the container points to a mobile application export.
  
  Extract the main textual claim (translate to English if it is Hindi/Marathi). If no claim exists, return exactly "NO_CLAIM_FOUND".
  
  Output the results STRICTLY as this JSON object without any markdown wrapping:
  {
    "text_claim": "Extracted claim here",
    "fingerprint": { "platform_origin": "string", "UI_markers_found": ["list"], "confidence_score": 85, "tamper_evidence": "string" }
  }`;

  try {
    const result = await geminiModel.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: mimeType
        }
      }
    ]);
    let text = result.response.text().trim();
    if (text.includes('NO_CLAIM_FOUND')) return null;
    
    // Strip markdown formatting if Gemini included it
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    const parsed = JSON.parse(text);
    return {
      text: parsed.text_claim,
      fingerprint: parsed.fingerprint
    };
  } catch (err) {
    console.error('❌ Gemini Vision OCR/Fingerprint error:', err.message);
    return null;
  }
}

/**
 * Perform Linguistic Stylometry to detect platform origin of a text claim
 */
export async function analyzeStylometry(text) {
  const prompt = `Analyze the provided text to identify its stylistic fingerprint and probable platform of origin. Misinformation often follows distinct 'Syntactic Rhythms' depending on where it was first generated:
- WhatsApp Dialect: High emoji density, use of 'forwarded many times' phrasing, multiple exclamation points, and specific 'copy-paste' spacing artifacts.
- Twitter/X Dialect: Use of hashtags, @mentions, 'thread' numbering (e.g., 1/n), and extreme brevity.
- Mainstream News: Lack of personal opinion markers, inverted pyramid structure, and standard grammar.

CLAIM: "${text}"

Identify the 'Platform Signature' and explain why.
Return STRICTLY a JSON object: { "probable_platform": "String", "reasoning": "String" }`;

  const result = await queryGroq(prompt, "You are a Stylometry Analyst.");
  try {
    const match = result.content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch (e) {
    return null;
  }
  return { probable_platform: "Unknown", reasoning: "Could not parse" };
}

/**
 * Extract named entities using LLM
 */
export async function extractEntities(text) {
  const result = await queryGroq(text, NER_SYSTEM_PROMPT);
  try {
    // Try to parse JSON from the response
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    // Fallback to empty entities
  }
  return { locations: [], persons: [], organizations: [], events: [], dates: [], numbers: [] };
}

/**
 * Synthesize final verdict from all track results
 */
export async function synthesizeVerdict(claim, trackResults) {
  const prompt = `Analyze this crisis claim and provide your forensic verdict.

CLAIM: "${claim}"

=== TRACK 1: Geographic Grounding (G-RAG) ===
Corroboration: ${trackResults.grag?.corroborationLevel || 'Unknown'}
Matches: ${trackResults.grag?.totalCorroboratingMatches || 0}
Evidence: ${JSON.stringify(trackResults.grag?.topEvidence || null)}

=== TRACK 2: Source Credibility ===
Cs Score: ${trackResults.credibility?.csScore || 'N/A'}
Source Tier: ${trackResults.credibility?.tier || 'Unknown'}

=== TRACK 3: Sentiment & Manipulation ===
Manipulation Score: ${trackResults.sentiment?.manipulationScore || 0}
Manipulation Markers: ${trackResults.sentiment?.manipulationMarkers?.join(' | ') || 'None'}
Overall Compound: ${trackResults.sentiment?.overall?.compound || 'N/A'}

${trackResults.image ? `=== TRACK 4: Image Provenance ===\nAuthenticity: ${trackResults.image.verdict}\nSigner: ${trackResults.image.c2pa?.signer || 'Unknown'}\n` : ''}
=== TRACK 5: Digital Fingerprinting (Origin Evidence) ===
UI Origin: ${trackResults.fingerprint?.ui?.platform_origin || 'N/A'}
UI Markers: ${JSON.stringify(trackResults.fingerprint?.ui?.UI_markers_found || [])}
Stylometry Signature: ${trackResults.fingerprint?.stylometry?.probable_platform || 'N/A'}
Temporal Search (Patient Zero): ${JSON.stringify(trackResults.fingerprint?.temporal?.topRecords || 'None')}

Provide your verdict in a structured, forensic format exactly like this:
1. CLAIM SUMMARY: 
2. EVIDENCE ANALYSIS: 
3. KEY INDICATORS: 
4. VERDICT: ${trackResults.unifiedStatus || 'UNCERTAIN'}
5. CONFIDENCE: (Provide strict percentage)
6. RECOMMENDATION:`;

  return queryGroq(prompt);
}

/**
 * Fallback analysis when no LLM is available
 */
function generateFallbackAnalysis(prompt) {
  return `⚠️ LLM services not configured. Please add GROQ_API_KEY or GEMINI_API_KEY to your .env file.

Based on available data:
- Claim received for analysis
- Verification tracks will process independently
- Configure an LLM for AI-powered verdict synthesis

Note: Track 1 (G-RAG), Track 2 (Credibility), and Track 3 (Forensics) still function without LLM.`;
}

export { FORENSIC_SYSTEM_PROMPT };
