-- ============================================================
-- CrisisVerify — Supabase Database Schema
-- Run this in Supabase SQL Editor after creating your project
-- ============================================================

-- Enable pgvector extension for claim similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Source Reputation Table ────────────────────────────────
-- Stores pre-computed reputation data for news domains
CREATE TABLE IF NOT EXISTS source_reputation (
  id SERIAL PRIMARY KEY,
  domain TEXT UNIQUE NOT NULL,
  source_name TEXT,
  total_articles INTEGER DEFAULT 0,
  true_count INTEGER DEFAULT 0,
  fake_count INTEGER DEFAULT 0,
  h_score FLOAT DEFAULT 0.5,
  tier TEXT CHECK (tier IN ('ifcn', 'mainstream', 'independent', 'regional', 'partisan', 'flagged')) DEFAULT 'mainstream',
  reputation_score FLOAT DEFAULT 0.5,
  avg_authors FLOAT DEFAULT 1.0,
  languages TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Author History Table ───────────────────────────────────
-- Tracks individual author veracity over time (84% consistency rule)
CREATE TABLE IF NOT EXISTS author_history (
  id SERIAL PRIMARY KEY,
  author_name TEXT NOT NULL,
  source_domain TEXT REFERENCES source_reputation(domain),
  total_claims INTEGER DEFAULT 0,
  verified_true INTEGER DEFAULT 0,
  verified_false INTEGER DEFAULT 0,
  consistency_score FLOAT DEFAULT 0.5,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_author_name ON author_history(author_name);

-- ─── Verification Log Table ────────────────────────────────
-- Stores every verification request and result
CREATE TABLE IF NOT EXISTS verification_log (
  id SERIAL PRIMARY KEY,
  claim_text TEXT,
  claim_language TEXT DEFAULT 'English',
  translated_text TEXT,
  verdict TEXT CHECK (verdict IN ('VERIFIED', 'HIGH_RISK', 'UNCERTAIN', 'UNVERIFIABLE')),
  confidence FLOAT DEFAULT 0.0,
  cs_score FLOAT,
  grag_matches INTEGER DEFAULT 0,
  manipulation_markers TEXT[] DEFAULT '{}',
  source_domain TEXT,
  processing_time_ms INTEGER,
  tracks JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Claim Embeddings Table (pgvector) ─────────────────────
-- For similarity search: "Have we seen this claim before?"
CREATE TABLE IF NOT EXISTS claim_embeddings (
  id SERIAL PRIMARY KEY,
  claim_text TEXT NOT NULL,
  embedding VECTOR(768),
  verdict TEXT,
  confidence FLOAT,
  source_domain TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cosine similarity index for fast nearest-neighbor search
CREATE INDEX IF NOT EXISTS idx_claim_embedding ON claim_embeddings
  USING hnsw (embedding vector_cosine_ops);

-- ─── Similarity Search Function ────────────────────────────
CREATE OR REPLACE FUNCTION match_claims(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.75,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id BIGINT,
  claim_text TEXT,
  verdict TEXT,
  confidence FLOAT,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    claim_embeddings.id,
    claim_embeddings.claim_text,
    claim_embeddings.verdict,
    claim_embeddings.confidence,
    1 - (claim_embeddings.embedding <=> query_embedding) AS similarity
  FROM claim_embeddings
  WHERE 1 - (claim_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY claim_embeddings.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ─── Row Level Security ────────────────────────────────────
ALTER TABLE source_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE author_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_embeddings ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access (for the demo)
CREATE POLICY "Allow anonymous read" ON source_reputation FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read" ON author_history FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON verification_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous read" ON verification_log FOR SELECT USING (true);
CREATE POLICY "Allow anonymous all" ON claim_embeddings FOR ALL USING (true);
