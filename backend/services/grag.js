/**
 * CrisisVerify — Track 1: G-RAG (Geographical Grounding)
 * Anchors claims in real-world geographic data from GDELT + Tavily
 * Prevents AI hallucinations by grounding in 15-minute real-world updates
 */
import { extractLocations } from '../utils/helpers.js';
import { queryGroq } from './llm.js';
import dotenv from 'dotenv';
dotenv.config();

const GDELT_BASE = 'https://api.gdeltproject.org/api/v2/doc/doc';
const TAVILY_BASE = 'https://api.tavily.com/search';

/**
 * Execute G-RAG grounding for a claim
 * @param {string} claim - The claim text (in English)
 * @param {string[]} locations - Pre-extracted locations (optional)
 * @returns {Promise<object>} G-RAG results with evidence
 */
export async function executeGRAG(claim, locations = null) {
  const startTime = Date.now();
  const detectedLocations = locations || extractLocations(claim);

  // Build search query from claim + locations
  const searchQuery = buildSearchQuery(claim, detectedLocations);

  // Execute GDELT and Tavily in parallel
  const [gdeltResults, tavilyResults] = await Promise.all([
    queryGDELT(searchQuery, detectedLocations),
    queryTavily(searchQuery)
  ]);

  // Base calculation by match count
  const totalMatches = gdeltResults.articles.length + tavilyResults.results.length;
  let corroborationLevel = calculateCorroboration(totalMatches, gdeltResults, tavilyResults);

  // Intelligent Context Assessment
  if (totalMatches > 0) {
    const evidenceSnippets = [
      ...tavilyResults.results.map(r => r.snippet || r.title),
      ...gdeltResults.articles.map(a => a.title)
    ].filter(Boolean).join('\n---\n').substring(0, 3000); // Send top 3k chars to groq

    try {
      const assessment = await queryGroq(
        `Compare this claim against the following evidence snippets derived from live search. 
        Determine if the evidence SUPPORTS the claim, CONTRADICTS the claim (i.e. fact checkers debunking it), or is UNRELATED to the claim. 
        Respond strictly with exactly one word: SUPPORTED, CONTRADICTED, or UNRELATED.\n\nCLAIM: "${claim}"\n\nEVIDENCE:\n${evidenceSnippets}`,
        'You are an evidence matching engine. Return ONLY one single word.'
      );
      
      const resVal = assessment.content.trim().toUpperCase();
      if (resVal.includes('CONTRADICTED')) {
        corroborationLevel = 'CONTRADICTED';
      } else if (resVal.includes('UNRELATED')) {
        corroborationLevel = 'NONE';
      } else if (resVal.includes('SUPPORTED')) {
        // If the LLM validates the matches as supportive, safely bump it to STRONG/SUPPORTED
        // even if GDELT failed and we only have a few matches from Tavily
        corroborationLevel = 'SUPPORTED';
      }
    } catch(e) {
      // Fallback stays as basic match count
    }
  }

  return {
    locations: detectedLocations,
    searchQuery,
    gdelt: {
      matchCount: gdeltResults.articles.length,
      articles: gdeltResults.articles.slice(0, 10), // Top 10
      error: gdeltResults.error || null
    },
    tavily: {
      matchCount: tavilyResults.results.length,
      results: tavilyResults.results.slice(0, 5), // Top 5
      error: tavilyResults.error || null
    },
    totalCorroboratingMatches: totalMatches,
    corroborationLevel,
    processingTime: Date.now() - startTime
  };
}

/**
 * Query GDELT DOC 2.0 API for recent news matching the claim
 */
async function queryGDELT(query, locations) {
  try {
    // Build GDELT query URL
    const locationQuery = locations.length > 0
      ? locations.map(l => `"${l.replace(/[()"]/g, '')}"`).join(' OR ')
      : '';
    const fullQuery = locationQuery ? `${query} (${locationQuery})` : query;

    const params = new URLSearchParams({
      query: fullQuery,
      mode: 'artlist',
      maxrecords: '25',
      format: 'json',
      timespan: '1h',
      sort: 'datedesc'
    });

    const url = `${GDELT_BASE}?${params.toString()}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000) // 8s timeout
    });

    if (!response.ok) {
      throw new Error(`GDELT returned ${response.status}`);
    }

    const textPayload = await response.text();
    let data;
    try {
      data = JSON.parse(textPayload);
    } catch (e) {
      throw new Error(`GDELT returned non-JSON response error`);
    }
    
    const articles = (data.articles || []).map(art => ({
      title: art.title || '',
      url: art.url || '',
      source: art.domain || art.source || '',
      publishedAt: art.seendate || '',
      language: art.language || 'English',
      socialImage: art.socialimage || null
    }));

    return { articles, raw: data };
  } catch (err) {
    console.warn('⚠️  GDELT query failed:', err.message);
    return { articles: [], error: err.message };
  }
}

/**
 * Query Tavily Search API for AI-optimized search results
 */
async function queryTavily(query) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || apiKey === 'tvly-your_tavily_api_key_here') {
    return { results: [], error: 'Tavily API key not configured' };
  }

  try {
    const response = await fetch(TAVILY_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: `fact check: ${query}`,
        search_depth: 'basic',
        include_answer: true,
        max_results: 5
      }),
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      throw new Error(`Tavily returned ${response.status}`);
    }

    const data = await response.json();
    const results = (data.results || []).map(r => ({
      title: r.title || '',
      url: r.url || '',
      snippet: r.content || '',
      score: r.score || 0
    }));

    return {
      results,
      answer: data.answer || null,
      raw: data
    };
  } catch (err) {
    console.warn('⚠️  Tavily query failed:', err.message);
    return { results: [], error: err.message };
  }
}

/**
 * Build optimized search query from claim text
 */
function buildSearchQuery(claim, locations) {
  // Extract key action words and remove noise
  const keywords = claim
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 8)
    .join(' ');

  return keywords || claim.substring(0, 100);
}

/**
 * Calculate corroboration level based on matches
 */
function calculateCorroboration(totalMatches, gdeltResults, tavilyResults) {
  if (totalMatches === 0) return 'NONE';
  if (totalMatches >= 10) return 'STRONG';
  if (totalMatches >= 5) return 'MODERATE';
  if (totalMatches >= 2) return 'WEAK';
  return 'MINIMAL';
}

/**
 * Temporal Sequence Search to find "Patient Zero" on social platforms
 */
export async function executeTemporalSearch(claim) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || apiKey === 'tvly-your_tavily_api_key_here') {
    return { topRecords: [], error: 'Tavily API key not configured' };
  }

  try {
    // Search specific high-risk social platforms for earliest mentions
    const socialQuery = `site:twitter.com OR site:instagram.com OR site:facebook.com "${claim.substring(0, 100)}"`;
    
    const response = await fetch(TAVILY_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: socialQuery,
        search_depth: 'advanced',
        max_results: 3
      }),
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) throw new Error(`Tavily Temporal returned ${response.status}`);

    const data = await response.json();
    return {
      topRecords: (data.results || []).map(r => ({
        url: r.url,
        title: r.title,
        platform: r.url.includes('twitter.com') ? 'Twitter/X' : 
                  r.url.includes('instagram.com') ? 'Instagram' : 
                  r.url.includes('facebook.com') ? 'Facebook' : 'Social Media'
      }))
    };
  } catch (err) {
    console.warn('⚠️ Temporal search failed:', err.message);
    return { topRecords: [], error: err.message };
  }
}
