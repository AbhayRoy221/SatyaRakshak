/**
 * CrisisVerify — Unified Verification Route
 * POST /api/verify
 */
import { Router } from 'express';
import multer from 'multer';
import { verifyClaim } from '../services/orchestrator.js';
import { analyzeImage } from '../services/forensics.js';
import { extractClaimFromImage } from '../services/llm.js';
import { computeAllBaselineScores } from '../services/credibility.js';

const router = Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // Max 20 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`Unsupported file type. Supported: JPEG, PNG, WebP, GIF, BMP, TIFF`));
  }
});

/**
 * POST /api/verify (Unified Multi-Modal Endpoint)
 */
router.post('/', upload.single('image'), async (req, res) => {
  const startTime = Date.now();

  try {
    let claimText = req.body.claim || '';
    let imageResult = null;
    let imageMimeType = null;
    
    // 1. If image is provided, analyze image & extract text
    if (req.file) {
      console.log(`🔬 Analyzing image: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)}KB)`);
      imageResult = await analyzeImage(req.file.buffer, req.file.originalname);
      imageMimeType = req.file.mimetype;
      
      // Extract text and UI fingerprint
      const extracted = await extractClaimFromImage(req.file.buffer, imageMimeType);
      
      if (extracted) {
        req.fingerprintUI = extracted.fingerprint;
        if (!claimText || claimText.trim() === '') {
          claimText = extracted.text;
          console.log(`📄 Extracted claim: "${claimText.substring(0, 60)}..."`);
        }
      } else {
        console.log(`📄 No text claim found in image.`);
      }
    }
    
    // 2. If we have a claim (either from body or extracted via OCR), run full verification
    if (claimText && claimText.trim().length > 0) {
      if (claimText.length > 10000) {
        return res.status(400).json({ success: false, error: 'Claim text too long. Maximum 10,000 characters.' });
      }
      
      const { sourceDomain, authorName, authorCount } = req.body;
      
      const result = await verifyClaim(claimText.trim(), {
        sourceDomain, 
        authorName, 
        authorCount: parseInt(authorCount) || 1, 
        imageResult,
        fingerprintUI: req.fingerprintUI // Pass the UI fingerprint
      });
      
      return res.json(result);
    } 
    
    // 3. Fallback: If only an image was submitted and NO text claim exists in it or the body
    if (imageResult) {
      // Just return the image result directly without G-RAG/Credibility
      const unifiedStatus = imageResult.verdict === 'TAMPERED' ? 'HIGH_RISK' : 'UNCERTAIN';
      
      return res.json({
        success: true,
        claim: { original: 'NO CLEAR CLAIM FOUND IN IMAGE.', translated: '', wasTranslated: false, language: null },
        unifiedFlags: {
          image: imageResult.verdict === 'TAMPERED' ? 'Tampered 🚨' : imageResult.verdict === 'AUTHENTIC' ? 'Authentic ✅' : 'No Proof ⚠️',
          claim: 'Skipped ⏭️',
          source: 'Skipped ⏭️',
          evidence: 'Skipped ⏭️'
        },
        verdict: {
          status: unifiedStatus,
          riskLevel: unifiedStatus.replace('_', ' '),
          aiAnalysis: `### 🚨 FINAL VERDICT: ${unifiedStatus.replace('_', ' ')}\n\n### 🔹 Why flagged?\n- Image supplied does not contain extractable textual claims.\n- Image Authenticity check: ${imageResult.verdict}.\n\n### 🔹 What should user do?\n- If the image contains a meme, ensure it is legible.\n- Provide a manual claim text if the image relies heavily on visual context.`,
          model: 'c2pa-engine / gemini-2.5-flash vision'
        },
        tracks: {
          image: imageResult,
          grag: null,
          credibility: null,
          sentiment: null
        },
        performance: { totalTime: Date.now() - startTime, breakdown: { grag: 0, credibility: 0, llm: 0 } }
      });
    }

    // 4. Nothing provided at all
    return res.status(400).json({
      success: false,
      error: 'Provide either a text claim or an image to analyze.'
    });

  } catch (err) {
    console.error('❌ Verification failed:', err);
    res.status(500).json({
      success: false,
      error: 'Verification pipeline error',
      message: err.message,
      processingTime: Date.now() - startTime
    });
  }
});

// Multer error handler
router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, error: 'File too large. Maximum size is 20MB. Keeps system fast and stable.' });
  }
  res.status(400).json({ success: false, error: err.message });
});

/**
 * GET /api/verify/baseline
 * Returns pre-computed Cs scores for all 60 BFNK domains
 */
router.get('/baseline', async (_req, res) => {
  try {
    const scores = await computeAllBaselineScores();
    res.json({ success: true, totalDomains: scores.length, scores });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
