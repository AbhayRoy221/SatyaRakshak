<div align="center">
  <h1>🛡️ CrisisVerify v2.0</h1>
  <p>
    <strong>Unified Multi-Modal Forensic Command Center for Crisis Misinformation</strong>
    <br>
    <em>"We don't guess. We verify."</em>
  </p>
</div>

---

## 📖 About The Project

CrisisVerify is a highly advanced, forensic-grade crisis misinformation detection engine designed to counter next-generation fake news. 

Going beyond standard AI wrappers, CrisisVerify **v2.0** introduces a **Unified Multi-Modal Engine**. It allows users to upload images (like altered WhatsApp memes) and text together, extracting multi-lingual claims via Vision OCR, checking cryptographic provenance via C2PA, grounding claims in 15-minute global geographic data via G-RAG, and scoring mathematical source credibility instantaneously.

The system runs **4 parallel forensic verification tracks** entirely simultaneously, returning a comprehensive 6-point AI synthesis in sub-5-second response times.

---

## ✨ Vanguard Features (v2.0 Upgrades)

### 📸 1. Multi-Modal Verification & Gemini Vision OCR
Upload an image with or without text. If the image contains a viral meme or news screenshot, the engine utilizes **Gemini 2.5 Flash Vision OCR** to automatically extract and translate the textual claim from **Hindi, Marathi, or English** into the verification pipeline, seamlessly bridging the gap between visual misinformation and text verification.

### 🧠 2. Intelligent G-RAG Override Engine
The Geographic Grounding (G-RAG) layer no longer relies on naive keyword match-counting. Instead, it utilizes an extremely fast Groq LLM (Llama-3.1-8B) to actively read snippets from live GDELT/Tavily search results. If the AI detects that fact-checkers (e.g., Reuters, Lighthouse) are debunking the claim, it forces a **`CONTRADICTED`** override, triggering a "Critical Failure" double penalty that instantly labels the claim as `HIGH_RISK`.

### 🛡️ 3. Battle-Tested Infrastructure (Failover RAG)
The system is built to survive external API failures. If the GDELT Doc 2.0 API rate-limits the connection (429) or crashes due to malformed regex from OCR extraction, the engine safely swallows the error, prevents pipeline failure, and silently relies entirely on the Tavily secondary RAG engine to complete the operation.

### 🎨 4. "Deep Space" Forensic Grid Dashboard
A premium, highly interactive frontend displaying beautiful active canvas renders:
- **Credibility Radial Gauge**: Live rendering of the source's `Cs` formula score.
- **Sentiment Timeline**: A dynamic line-chart mapping emotional manipulation and negative sentiment flags from VADER.

### 📝 5. Strict 6-Point LLM Synthesis
The post-analysis LLM no longer provides a generic paragraph. It is rigidly prompted to output a professional forensics breakdown:
1. **CLAIM SUMMARY**
2. **EVIDENCE ANALYSIS**
3. **KEY INDICATORS**
4. **VERDICT**
5. **CONFIDENCE SCORE (%)**
6. **RECOMMENDATION**

---

## 🛠️ The Core 4-Track Forensic Pipeline

| Track | Name | Tech / Concept |
|-------|------|----------------|
| **T1** | **G-RAG Grounding** | Queries Tavily APIs + GDELT for breaking news within a 15 min-window. Automatically extracts locations using NER. |
| **T2** | **Source Credibility** | Evaluates trust using the research-backed Cs Formula against the 60-domain BFNK Dataset. |
| **T3** | **Sentiment Analysis** | VADER sentiment checks for severe emotional manipulation (`compound < -0.5`). |
| **T4** | **Image Provenance** | Queries OpenSSL and the `c2patool` CLI to detect cryptographically signed images and verify tampering. |

#### The Mathematical Credibility Formula (T2)
```text
Cs = (0.5 × H) + (0.3 × min(N/1.97, 1.0)) + (0.2 × R)
```
- **`H` (History)**: % of true articles from the domain in BFNK.
- **`N` (Author Density)**: Normalized against the 1.97 benchmark (Fake news averages 0.66 authors).
- **`R` (Reputation)**: Hard-coded tiers (1.0 IFCN, 0.6 Mainstream, 0.0 Flagged).

---

## ⚙️ Tech Stack & API Limits

| Layer | Technology |
|-------|-----------|
| **Vision & Edge Case LLM** | Gemini 2.5 Flash |
| **Fast Inference LLM** | Groq (Llama-3.1-8B) |
| **RAG Search Engines** | Tavily Search API + GDELT Project |
| **Cryptography** | c2patool CLI |
| **Database** | Supabase (PostgreSQL + pgvector) |
| **Vibe/Syntax Analysis** | VADER Sentiment (Node.js port) |
| **Frontend/Backend** | Custom Vanilla HTML/CSS/JS + Express.js |

---

## 🚀 Quick Start Guide

### 1. Installation
```bash
git clone <repository>
cd backend
npm install
```

### 2. Environment Configuration
Create a `.env` file in the `backend/` folder:
```text
GROQ_API_KEY=your_groq_key
GEMINI_API_KEY=your_gemini_key
TAVILY_API_KEY=your_tavily_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
FRONTEND_ORIGIN=http://localhost:5500
PORT=3001
```

### 3. Database initialization
Run the provided SQL initialization scripts inside the Supabase SQL Editor:
- `backend/data/supabase-schema.sql`

### 4. Cryptographic Setup (Optional, for T4 Image Forensics)
Download `c2patool` from the official GitHub Release and ensure it is accessible in the system path.
Generate a testing certificate:
```bash
cd backend/certs
openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-256 -keyout private.key -out cert.pem -days 365 -nodes -subj "/CN=CrisisVerify_Engine"
```

### 5. Launch
Start the required node backend handling Multer multipart/file payloads:
```bash
cd backend
npm run dev
```
Start your frontend index using Live Server or any static host at `http://localhost:5500`.

---

## 🧪 Demonstration Use Cases

**1. Multi-Modal Viral Meme Test**  
- Upload an image containing Hindi text about an unverified event.  
- *Result:* Gemini OCR translates the claim, G-RAG detects 0 matches, and Orchestrator flags as `HIGH_RISK`.  

**2. Fact-Check Override Test**  
- Paste the claim: *"Two Indian jets downed, pilot captured by Pakistani forces."*  
- *Result:* Tavily fetches 5 articles. The intelligent Groq LLM actively reads the articles and establishes that they are Reuters Fact-Checkers debunking the claim. It overrides the hit counter to output `CONTRADICTED ❌`.  

**3. The Validated Post Test**  
- Paste the claim: *"Prime Minister to address the nation tonight."* with `timesofindia.indiatimes.com` as the Source Domain.  
- *Result:* G-RAG confirms via live search, Credibility resolves high using the Cs formula, outputting `VERIFIED — CLAIM CORROBORATED ✅`.
