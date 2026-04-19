<div align="center">
  <h1>🛡️ SatyaRakshak v2.0</h1>
  <p>
    <strong>Unified Multi-Modal Forensic Command Center for Crisis Misinformation</strong>
    <br>
    <em>"We don't guess. We verify."</em>
  </p>
  <p>
    <img src="https://img.shields.io/badge/Tracks-5_Parallel-00f0ff?style=for-the-badge" alt="5 Tracks">
    <img src="https://img.shields.io/badge/AI-Agentic_CogPlanner-a855f7?style=for-the-badge" alt="Agentic AI">
    <img src="https://img.shields.io/badge/Engine-Forensic_Grade-ff3b4e?style=for-the-badge" alt="Forensic Grade">
  </p>
</div>

---

## 📖 About The Project

SatyaRakshak is a highly advanced, forensic-grade crisis misinformation detection engine designed to counter next-generation fake news. 

Going beyond standard AI wrappers, SatyaRakshak **v2.0** introduces a **Unified Multi-Modal Engine** powered by an **Agentic AI Orchestrator** (the "Forensic Chief"). It allows users to upload images (like altered WhatsApp memes) and text together, extracting multi-lingual claims via Vision OCR, checking cryptographic provenance via C2PA, grounding claims in 15-minute global geographic data via G-RAG, and scoring mathematical source credibility instantaneously.

The system runs **5 parallel forensic verification tracks** entirely simultaneously, governed by an autonomous **CogPlanner** reasoning agent that synthesizes cross-track evidence to produce a comprehensive forensic verdict.

---

## 🧠 Agentic AI: The "Forensic Chief" CogPlanner

Unlike traditional linear pipelines, SatyaRakshak v2.0 uses an **Agentic AI** architecture. The LLM doesn't just summarize — it **reasons autonomously** across all 5 tracks using an observe-think-act-synthesize loop:

```
┌─────────────────────────────────────────────────────┐
│               FORENSIC CHIEF (CogPlanner)           │
│                                                     │
│  OBSERVE → Is the claim location-specific?          │
│            Author-based? Media-heavy?               │
│                                                     │
│  THINK   → Plan parallel execution strategy         │
│            across all 5 tracks                      │
│                                                     │
│  ACT     → Fire G-RAG, Credibility, Sentiment,     │
│            Image Forensics, Digital Fingerprinting  │
│            simultaneously via Promise.all()         │
│                                                     │
│  SYNTH   → Cross-reference all track outputs        │
│            Detect source discrepancies              │
│            Force overrides when contradicted         │
│            Output structured 6-point verdict        │
└─────────────────────────────────────────────────────┘
```

**Key Agentic Behaviors:**
- **Source Discrepancy Detection**: If a claim was first seen on WhatsApp but claims official authority, the Chief triggers a "Source Discrepancy" warning
- **Cross-Track Reasoning**: Platform origin (Track 5) is checked against linguistic style (Stylometry) — if they don't match, it flags coordinated misinformation
- **Failover Intelligence**: If GDELT rate-limits, the Chief silently shifts weight to Tavily evidence without pipeline failure

---

## ✨ Vanguard Features (v2.0 Upgrades)

### 📸 1. Multi-Modal Verification & Gemini Vision OCR
Upload an image with or without text. If the image contains a viral meme or news screenshot, the engine utilizes **Gemini 2.5 Flash Vision OCR** to automatically extract and translate the textual claim from **Hindi, Marathi, or English** into the verification pipeline, seamlessly bridging the gap between visual misinformation and text verification.

### 🧠 2. Intelligent G-RAG Override Engine
The Geographic Grounding (G-RAG) layer no longer relies on naive keyword match-counting. Instead, it utilizes an extremely fast Groq LLM (Llama-3.1-8B) to actively read snippets from live GDELT/Tavily search results. If the AI detects that fact-checkers (e.g., Reuters, Lighthouse) are debunking the claim, it forces a **`CONTRADICTED`** override, triggering a "Critical Failure" double penalty that instantly labels the claim as `HIGH_RISK`.

### 🕵️ 3. Digital Fingerprinting (Track 5) — NEW
A three-pronged forensic system to trace the **origin** of any claim:

| Sub-Track | Technology | What It Does |
|:---|:---|:---|
| **Vision-UI Fingerprinting** | Gemini 2.5 Flash Vision | Pixel-level audit of screenshots for platform-specific UI artifacts (WhatsApp green hex codes, Twitter/X blue checkmarks, Instagram story bars) |
| **Linguistic Stylometry** | Groq (Llama-3.1-8B) | Detects "platform dialects" — hashtag patterns (Twitter/X), emoji density (WhatsApp), inverted pyramid structure (News) |
| **Temporal Sequence Search** | Tavily Advanced Search | Searches Twitter, Facebook, and Instagram to find the **"Patient Zero"** — the earliest public mention of the claim |

**Forensic Output:**
- ✓ Probable origin platform with icon (𝕏 Twitter/X, 🟢 WhatsApp, 📸 Instagram)
- ✓ Clickable proof links to the actual social media posts found
- ✓ Forensic artifact audit checklist (e.g., "Blue checkmark detected", "Forwarded label found")

### 📊 4. Dynamic Credibility Scoring — UPGRADED
The `Cs` score is no longer a static fallback. **Every domain gets a unique, dynamically calculated score:**

| Domain Type | Estimation Method |
|:---|:---|
| **Known (BFNK Dataset)** | Direct lookup from 60-domain research dataset |
| **Unknown Domain** | Real-time Tavily search + Groq LLM estimation (max 40% confidence) |
| **Government (.gov)** | Heuristic: High baseline (0.85–0.94) |
| **Blog/Personal** | Heuristic: Low baseline (0.30–0.49) |
| **No Domain (Anonymous)** | Randomized low-base score for social media posts |

### 🛡️ 5. Battle-Tested Infrastructure (Failover RAG)
The system is built to survive external API failures. If the GDELT Doc 2.0 API rate-limits the connection (429) or crashes due to malformed regex from OCR extraction, the engine safely swallows the error, prevents pipeline failure, and silently relies entirely on the Tavily secondary RAG engine to complete the operation.

### 🎨 6. "Deep Space" Forensic Grid Dashboard
A premium, highly interactive frontend displaying beautiful active canvas renders:
- **Credibility Radial Gauge**: Live rendering of the source's `Cs` formula score with color-coded values (🟢 green ≥0.7, 🟡 amber 0.4–0.7, 🔴 red <0.4)
- **Sentiment Timeline**: A dynamic line-chart mapping emotional manipulation and negative sentiment flags from VADER
- **Forensic Artifact Checklist**: Green-checkmark audit list showing detected UI markers
- **Patient Zero Proof Cards**: Clickable evidence links to the original social media sources

### 📝 7. Strict 6-Point LLM Synthesis (Agentic Chief)
The post-analysis LLM no longer provides a generic paragraph. The **Agentic Forensic Chief** outputs a rigidly structured forensics breakdown:
1. **CLAIM SUMMARY**
2. **EVIDENCE ANALYSIS** (must explicitly mention Track 5 Origin Evidence)
3. **KEY INDICATORS**
4. **VERDICT**
5. **CONFIDENCE SCORE (%)**
6. **RECOMMENDATION**

---

## 🛠️ The Core 5-Track Forensic Pipeline

| Track | Name | Tech / Concept |
|-------|------|----------------|
| **T1** | **G-RAG Grounding** | Queries Tavily APIs + GDELT for breaking news within a 15 min-window. Automatically extracts locations using NER. |
| **T2** | **Source Credibility** | Dynamic Cs Formula against the 60-domain BFNK Dataset + Tavily/Groq AI estimation for unknown domains. |
| **T3** | **Sentiment Analysis** | VADER sentiment checks for severe emotional manipulation (`compound < -0.5`). |
| **T4** | **Image Provenance** | Queries OpenSSL and the `c2patool` CLI to detect cryptographically signed images and verify tampering. |
| **T5** | **Digital Fingerprinting** | Vision-UI audit + Linguistic Stylometry + Temporal "Patient Zero" search across social platforms. |

#### The Mathematical Credibility Formula (T2)
```text
Cs = (0.5 × H) + (0.3 × min(N/1.97, 1.0)) + (0.2 × R)
```
- **`H` (History)**: % of true articles from the domain in BFNK. For unknown domains: estimated via Tavily + Groq AI.
- **`N` (Author Density)**: Normalized against the 1.97 benchmark (Fake news averages 0.66 authors).
- **`R` (Reputation)**: Tiered scores — 1.0 IFCN, 0.7 Independent, 0.6 Mainstream, 0.5 Regional, 0.3 Partisan, 0.0 Flagged.

---

## 🏗️ Architecture: Agentic Orchestration Flow

```
User Input (Text + Image)
        │
        ▼
┌───────────────────┐
│   VERIFY ROUTE    │  ← Multer image upload + text extraction
│   (Express.js)    │  ← Gemini Vision OCR + UI Fingerprinting
└───────┬───────────┘
        │
        ▼
┌───────────────────────────────────────────────────┐
│           PARALLEL ORCHESTRATOR                    │
│           (Promise.all — all 5 tracks)             │
│                                                    │
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────────┐│
│  │ T1  │  │ T2  │  │ T3  │  │ T4  │  │   T5    ││
│  │G-RAG│  │ Cs  │  │VADER│  │C2PA │  │Fingerpr.││
│  └──┬──┘  └──┬──┘  └──┬──┘  └──┬──┘  └────┬────┘│
│     └────────┴────────┴────────┴───────────┘     │
│                      │                            │
│                      ▼                            │
│         ┌──────────────────────┐                  │
│         │  UNIFIED RISK ENGINE │                  │
│         │  (Signal Aggregation)│                  │
│         └──────────┬───────────┘                  │
└────────────────────┼──────────────────────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │  AGENTIC FORENSIC    │
          │  CHIEF (CogPlanner)  │  ← Groq LLM with Forensic System Prompt
          │  Observe → Think →   │
          │  Act → Synthesize    │
          └──────────┬───────────┘
                     │
                     ▼
           ┌─────────────────┐
           │  6-POINT VERDICT│  → Frontend Dashboard
           │  + Origin Proof │
           └─────────────────┘
```

---

## ⚙️ Tech Stack & API Limits

| Layer | Technology |
|-------|-----------|
| **Agentic AI / Synthesis** | Groq (Llama-3.1-8B) — CogPlanner Prompt |
| **Vision & Edge Case LLM** | Gemini 2.5 Flash |
| **RAG Search Engines** | Tavily Search API + GDELT Project |
| **Stylometry Analysis** | Groq (Llama-3.1-8B) — Platform Dialect Detection |
| **Temporal Search** | Tavily Advanced — Social Platform Indexing |
| **Cryptography** | c2patool CLI |
| **Database** | Supabase (PostgreSQL + pgvector) |
| **Sentiment Analysis** | VADER Sentiment (Node.js port) |
| **Frontend/Backend** | Custom Vanilla HTML/CSS/JS + Express.js |

---

## 🚀 Quick Start Guide

### 1. Installation
```bash
git clone https://github.com/YOUR_USERNAME/SatyaRakshak.git
cd SatyaRakshak/backend
npm install
```

### 2. Environment Configuration
Create a `.env` file in the `backend/` folder (see `.env.example`):
```text
GROQ_API_KEY=your_groq_key
GEMINI_API_KEY=your_gemini_key
TAVILY_API_KEY=your_tavily_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
FRONTEND_ORIGIN=http://localhost:5500
PORT=3001
```

### 3. Database Initialization
Run the provided SQL initialization scripts inside the Supabase SQL Editor:
- `backend/data/supabase-schema.sql`

### 4. Cryptographic Setup (Optional, for T4 Image Forensics)
Download `c2patool` from the official GitHub Release and ensure it is accessible in the system path.
Generate a testing certificate:
```bash
cd backend/certs
openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-256 -keyout private.key -out cert.pem -days 365 -nodes -subj "/CN=SatyaRakshak_Engine"
```

### 5. Launch
Start the backend:
```bash
cd backend
npm run dev
```
Start your frontend using Live Server or any static host at `http://localhost:5500`.

---

## 🧪 Demonstration Use Cases

**1. Multi-Modal Viral Meme Test**  
- Upload an image containing Hindi text about an unverified event.  
- *Result:* Gemini OCR translates the claim, G-RAG detects 0 matches, Track 5 identifies WhatsApp UI artifacts, and the Agentic Chief flags as `HIGH_RISK` with a Source Discrepancy warning.  

**2. Fact-Check Override Test**  
- Paste the claim: *"Two Indian jets downed, pilot captured by Pakistani forces."*  
- *Result:* Tavily fetches 5 articles. The Forensic Chief actively reads the articles and detects Reuters Fact-Checkers debunking the claim. It overrides to `CONTRADICTED ❌`.  

**3. The Validated Post Test**  
- Paste the claim: *"Prime Minister to address the nation tonight."* with `timesofindia.indiatimes.com` as the Source Domain.  
- *Result:* G-RAG confirms via live search, Credibility resolves to **0.825** using the BFNK dataset, Stylometry identifies Mainstream News dialect, outputting `VERIFIED — CLAIM CORROBORATED ✅`.

**4. Cross-Platform Migration Detection (NEW)**  
- Paste a claim with Twitter-style hashtags (e.g., `#NoidaProtest #GodiMedia`) but no source domain.  
- *Result:* Stylometry identifies "Twitter/X Dialect" but Patient Zero finds the earliest record on Facebook. The Forensic Chief flags this as **coordinated cross-platform misinformation**.

**5. Dynamic Credibility Test (NEW)**  
- Submit the same claim with different source domains:
  - `altnews.in` → Cs Score: **~0.94** (IFCN certified)
  - `ndtv.com` → Cs Score: **~0.83** (Mainstream)
  - `randomsite.xyz` → Cs Score: **~0.35** (AI-estimated via Tavily + Groq)
  - No domain → Cs Score: **~0.22** (Anonymous post baseline)

---

## 📄 License

This project is built for academic and research purposes.

---

<div align="center">
  <strong>SatyaRakshak</strong> · Digital Forensic Command Center
  <br>
  <sub>Built with BFNK Dataset · G-RAG · C2PA · Gemini Vision · VADER · Groq LLM · Agentic AI</sub>
</div>
