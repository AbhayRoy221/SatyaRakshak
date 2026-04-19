/**
 * CrisisVerify — Parallel Orchestrator
 * Dispatches all tracks simultaneously, including unified Multi-Modal Risk Scoring
 */
import { executeGRAG, executeTemporalSearch } from './grag.js';
import { calculateCredibility } from './credibility.js';
import { analyzeSentiment } from './sentiment.js';
import { extractKeywords, compressForLLM } from './keywords.js';
import { synthesizeVerdict, extractEntities, analyzeStylometry } from './llm.js';
import { translateToEnglish } from './translator.js';
import { extractLocations, extractDomain } from '../utils/helpers.js';
import { supabase, isConnected } from '../config/supabase.js';

export async function verifyClaim(rawClaim, options = {}) {
  const startTime = Date.now();

  const { sourceDomain, authorName, authorCount, imageResult } = options;

  // ── Step 1: Translation ──────────────────────────────────
  const translation = await translateToEnglish(rawClaim);
  const claim = translation.translated;

  // ── Step 2: Pre-processing ───────────────────────────────
  const { keywords, keyPhrases } = extractKeywords(claim);
  const locations = extractLocations(claim);
  const domainToUse = sourceDomain || extractDomain(rawClaim);

  // ── Step 3: Parallel Track Execution ─────────────────────
  const [gragResult, credibilityResult, sentimentResult, entityResult, stylometryResult, temporalResult] = await Promise.all([
    executeGRAG(claim, locations).catch(err => ({ error: err.message, totalCorroboratingMatches: 0, corroborationLevel: 'ERROR' })),
    calculateCredibility(domainToUse, authorCount || 1, authorName || null).catch(err => ({ error: err.message, csScore: 0.5, credibilityLevel: 'UNCERTAIN' })),
    Promise.resolve(analyzeSentiment(claim)),
    extractEntities(claim).catch(() => ({ locations: [], persons: [], organizations: [], events: [], dates: [], numbers: [] })),
    analyzeStylometry(claim).catch(() => null),
    executeTemporalSearch(claim).catch(() => ({ topRecords: [] }))
  ]);

  const fingerprintResult = {
    ui: options.fingerprintUI || null,
    stylometry: stylometryResult,
    temporal: temporalResult
  };

  // ── Step 4: Unified Final Decision Engine ────────────────
  // Combine all 3 signals: Image Authenticity, Claim Verification, Source Credibility
  
  // Define signal rules
  let fails = 0;
  let warnings = 0;
  let passes = 0;

  // Signal 1: Image
  let imageAuthVerdict = 'No Image Provided';
  if (imageResult) {
    if (imageResult.verdict === 'TAMPERED') { fails++; imageAuthVerdict = 'Tampered 🚨'; }
    else if (imageResult.verdict === 'AUTHENTIC') { passes++; imageAuthVerdict = 'Authentic ✅'; }
    else { warnings++; imageAuthVerdict = 'No Proof ⚠️'; }
  }

  // Signal 2: Source Credibility
  let sourceVerdict = 'Unknown';
  if (credibilityResult.credibilityLevel === 'LOW_CREDIBILITY') { fails++; sourceVerdict = 'Risky ❌'; }
  else if (credibilityResult.credibilityLevel === 'CREDIBLE') { passes++; sourceVerdict = 'Trusted ✅'; }
  else { warnings++; sourceVerdict = 'Unknown ⚠️'; }

  // Signal 3: Claim / G-RAG / Sentiment
  let claimVerdict = 'Unverifiable';
  if (gragResult.corroborationLevel === 'CONTRADICTED') {
    fails += 2; // Contradiction is a critical failure, forces HIGH RISK
    claimVerdict = 'Contradicted ❌';
  } else if (gragResult.corroborationLevel === 'NONE' || sentimentResult.manipulationScore > 0.4) { 
    fails++; 
    claimVerdict = 'Misleading ❌'; 
  } else if (gragResult.corroborationLevel === 'STRONG' || gragResult.corroborationLevel === 'MODERATE' || gragResult.corroborationLevel === 'SUPPORTED') { 
    passes++; 
    claimVerdict = 'Supported ✅'; 
  } else { 
    warnings++; 
    claimVerdict = 'Unverifiable ⚠️'; 
  }

  // Unified Output Logic
  let unifiedStatus = 'UNCERTAIN';
  if (fails >= 2 || (fails === 1 && imageResult?.verdict === 'TAMPERED')) {
    unifiedStatus = 'HIGH_RISK';
  } else if (fails === 1 || warnings >= 2) {
    unifiedStatus = 'MEDIUM_RISK';
  } else if (passes >= 2 && fails === 0) {
    unifiedStatus = 'VERIFIED';
  }

  // ── Step 5: LLM Verdict Synthesis (Unified Output) ───────
  const compressedClaim = compressForLLM(claim);
  const llmVerdict = await synthesizeVerdict(compressedClaim, {
    grag: gragResult,
    credibility: credibilityResult,
    sentiment: sentimentResult,
    image: imageResult,
    fingerprint: fingerprintResult,
    unifiedStatus
  });

  const totalTime = Date.now() - startTime;

  const result = {
    success: true,
    claim: {
      original: rawClaim,
      translated: claim,
      language: translation.detectedLang,
      wasTranslated: translation.wasTranslated
    },
    unifiedFlags: {
      image: imageAuthVerdict,
      claim: claimVerdict,
      source: sourceVerdict,
      evidence: gragResult.corroborationLevel === 'CONTRADICTED' ? 'Fact-checks pulled' : (gragResult.totalCorroboratingMatches > 0 ? 'Found Evidence' : 'Weak/None')
    },
    verdict: {
      status: unifiedStatus,
      riskLevel: unifiedStatus.replace('_', ' '),
      aiAnalysis: llmVerdict.content,
      model: llmVerdict.model
    },
    tracks: {
      image: imageResult,
      grag: {
        locations,
        corroborationLevel: gragResult.corroborationLevel,
        totalMatches: gragResult.totalCorroboratingMatches,
        topEvidence: [...(gragResult.gdelt?.articles?.slice(0, 3) || []), ...(gragResult.tavily?.results?.slice(0, 2) || [])],
        processingTime: gragResult.processingTime
      },
      credibility: { ...credibilityResult },
      sentiment: { ...sentimentResult },
      fingerprint: fingerprintResult
    },
    performance: {
      totalTime,
      breakdown: { grag: gragResult.processingTime || 0, credibility: credibilityResult.processingTime || 0, llm: llmVerdict.latency || 0 }
    }
  };

  return result;
}
