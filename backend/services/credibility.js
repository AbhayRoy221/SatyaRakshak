/**
 * CrisisVerify — Track 2: Source Credibility (Cs Score)
 * Formula: Cs = (0.5 × H) + (0.3 × min(N/1.97, 1.0)) + (0.2 × R)
 *
 * H = History: Proportion of past articles from source verified as true in BFNK
 * N = Author Density: Number of unique authors (normalized against 1.97 benchmark)
 * R = Reputation: Tiered score (1.0 IFCN, 0.5 mainstream, 0.0 flagged)
 *
 * Key rules:
 * - "1.97 Rule": True news averages 1.97 authors; fake averages 0.66
 * - 84% author consistency: Authors tend to repeat veracity behavior
 */
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { supabase, isConnected } from '../config/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Constants from research ───────────────────────────────
const AUTHOR_DENSITY_BENCHMARK = 1.97; // True news avg
const FAKE_AUTHOR_DENSITY = 0.66;       // Fake news avg
const AUTHOR_CONSISTENCY_RATE = 0.84;    // 84% repeat behavior

// ─── Weights ───────────────────────────────────────────────
const W_HISTORY = 0.5;
const W_AUTHOR_DENSITY = 0.3;
const W_REPUTATION = 0.2;

// ─── Reputation Tiers ──────────────────────────────────────
const REPUTATION_SCORES = {
  'ifcn': 1.0,
  'mainstream': 0.6,
  'independent': 0.7,
  'regional': 0.5,
  'partisan': 0.3,
  'flagged': 0.0,
  'unknown': 0.4
};

// ─── Load local data ───────────────────────────────────────
let bfnkData = null;
let ifcnSources = null;
let flaggedSources = null;

async function loadLocalData() {
  if (bfnkData) return; // Already loaded

  try {
    const bfnkRaw = await readFile(join(__dirname, '../data/bfnk-seed.json'), 'utf8');
    bfnkData = JSON.parse(bfnkRaw);

    const ifcnRaw = await readFile(join(__dirname, '../data/ifcn-sources.json'), 'utf8');
    ifcnSources = JSON.parse(ifcnRaw);

    const flaggedRaw = await readFile(join(__dirname, '../data/flagged-sources.json'), 'utf8');
    flaggedSources = JSON.parse(flaggedRaw);

    console.log(`✅ BFNK data loaded: ${bfnkData.domains.length} domains`);
  } catch (err) {
    console.error('❌ Failed to load BFNK data:', err.message);
    bfnkData = { domains: [] };
    ifcnSources = { sources: [] };
    flaggedSources = { sources: [] };
  }
}

// Load on module init
loadLocalData();

/**
 * Calculate Cs (Credibility Score) for a claim
 * @param {string} sourceDomain - Domain of the source (e.g., "ndtv.com")
 * @param {number} authorCount - Number of unique authors associated with claim
 * @param {string} authorName - Specific author name (for consistency check)
 * @returns {Promise<object>} Credibility assessment
 */
export async function calculateCredibility(sourceDomain, authorCount = 1, authorName = null) {
  await loadLocalData();
  const startTime = Date.now();

  // ─── If no source domain provided, credibility is unverifiable ──
  if (!sourceDomain || sourceDomain.trim() === '') {
    const N = Math.min(authorCount / AUTHOR_DENSITY_BENCHMARK, 1.0);
    const authorDensityFlag = authorCount < FAKE_AUTHOR_DENSITY + 0.2
      ? 'LOW_DENSITY_WARNING' : 'NORMAL';

    return {
      csScore: null,
      credibilityLevel: 'UNKNOWN',
      tier: 'unknown',
      breakdown: {
        H: null,
        N: Math.round(N * 1000) / 1000,
        R: null,
        formula: 'Cs = N/A (no source domain provided)'
      },
      source: {
        domain: null,
        found: false,
        totalArticles: 0,
        trueCount: 0,
        fakeCount: 0
      },
      authorDensity: {
        count: authorCount,
        benchmark: AUTHOR_DENSITY_BENCHMARK,
        fakeBenchmark: FAKE_AUTHOR_DENSITY,
        flag: authorDensityFlag
      },
      authorConsistency: null,
      processingTime: Date.now() - startTime
    };
  }

  // ─── H: History Score ────────────────────────────────────
  const sourceData = findSource(sourceDomain);
  const H = sourceData ? sourceData.h_score : 0.5; // default unknown

  // ─── N: Author Density ───────────────────────────────────
  // Normalize against 1.97 benchmark
  const N = Math.min(authorCount / AUTHOR_DENSITY_BENCHMARK, 1.0);
  const authorDensityFlag = authorCount < FAKE_AUTHOR_DENSITY + 0.2
    ? 'LOW_DENSITY_WARNING' : 'NORMAL';

  // ─── R: Reputation Score ─────────────────────────────────
  const tier = sourceData?.tier || determineTier(sourceDomain);
  const R = REPUTATION_SCORES[tier] ?? 0.4;

  // ─── Calculate Cs ────────────────────────────────────────
  const csScore = (W_HISTORY * H) + (W_AUTHOR_DENSITY * N) + (W_REPUTATION * R);

  // ─── Author Consistency Check ────────────────────────────
  let authorConsistency = null;
  if (authorName && isConnected) {
    authorConsistency = await checkAuthorHistory(authorName);
  }

  // ─── Classify credibility level ──────────────────────────
  let credibilityLevel;
  if (csScore >= 0.7) credibilityLevel = 'CREDIBLE';
  else if (csScore >= 0.4) credibilityLevel = 'UNCERTAIN';
  else credibilityLevel = 'LOW_CREDIBILITY';

  return {
    csScore: Math.round(csScore * 1000) / 1000,
    credibilityLevel,
    tier,
    breakdown: {
      H: Math.round(H * 1000) / 1000,
      N: Math.round(N * 1000) / 1000,
      R,
      formula: `Cs = (${W_HISTORY} × ${H.toFixed(3)}) + (${W_AUTHOR_DENSITY} × ${N.toFixed(3)}) + (${W_REPUTATION} × ${R})`
    },
    source: {
      domain: sourceDomain,
      found: !!sourceData,
      totalArticles: sourceData?.total || 0,
      trueCount: sourceData?.true_count || 0,
      fakeCount: sourceData?.fake_count || 0
    },
    authorDensity: {
      count: authorCount,
      benchmark: AUTHOR_DENSITY_BENCHMARK,
      fakeBenchmark: FAKE_AUTHOR_DENSITY,
      flag: authorDensityFlag
    },
    authorConsistency,
    processingTime: Date.now() - startTime
  };
}

/**
 * Find source in BFNK data (local or Supabase)
 */
function findSource(domain) {
  if (!domain || !bfnkData) return null;
  const normalized = domain.toLowerCase().replace(/^www\./, '');
  return bfnkData.domains.find(d =>
    d.source.toLowerCase() === normalized ||
    normalized.includes(d.source.toLowerCase()) ||
    d.source.toLowerCase().includes(normalized)
  );
}

/**
 * Determine tier for unknown sources
 */
function determineTier(domain) {
  if (!domain) return 'unknown';

  // Check IFCN list
  if (ifcnSources?.sources?.some(s => domain.includes(s.domain))) return 'ifcn';

  // Check flagged list
  if (flaggedSources?.sources?.some(s => domain.includes(s.domain))) return 'flagged';

  return 'unknown';
}

/**
 * Check author's historical veracity (Supabase)
 */
async function checkAuthorHistory(authorName) {
  if (!isConnected || !supabase) return null;

  try {
    const { data, error } = await supabase
      .from('author_history')
      .select('*')
      .ilike('author_name', `%${authorName}%`)
      .limit(1);

    if (error || !data || data.length === 0) return null;

    const author = data[0];
    return {
      name: author.author_name,
      totalClaims: author.total_claims,
      verifiedTrue: author.verified_true,
      verifiedFalse: author.verified_false,
      consistencyScore: author.consistency_score,
      reliabilityNote: author.consistency_score >= 0.7
        ? 'Author has a history of accurate reporting'
        : 'Author has been associated with inaccurate claims'
    };
  } catch (err) {
    return null;
  }
}

/**
 * Bulk score computation for seeding
 */
export async function computeAllBaselineScores() {
  await loadLocalData();
  return bfnkData.domains.map(d => ({
    domain: d.source,
    csScore: (W_HISTORY * d.h_score) +
             (W_AUTHOR_DENSITY * Math.min(d.avg_authors / AUTHOR_DENSITY_BENCHMARK, 1.0)) +
             (W_REPUTATION * (REPUTATION_SCORES[d.tier] ?? 0.4)),
    tier: d.tier,
    h_score: d.h_score
  }));
}
