/**
 * CrisisVerify — Image Forensics Route
 * POST /api/verify/image
 */
import { Router } from 'express';
import multer from 'multer';
import { analyzeImage, signImage } from '../services/forensics.js';

const router = Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Supported: JPEG, PNG, WebP, GIF, BMP, TIFF`));
    }
  }
});

/**
 * POST /api/verify/image
 * Upload an image for forensic analysis + C2PA verification
 */
router.post('/', upload.single('image'), async (req, res) => {
  const startTime = Date.now();

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file uploaded. Send a file with field name "image".'
      });
    }

    console.log(`🔬 Analyzing image: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)}KB)`);

    const result = await analyzeImage(req.file.buffer, req.file.originalname);

    console.log(`✅ Image verdict: ${result.verdict} (${result.processingTime}ms)`);

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('❌ Image analysis failed:', err);
    res.status(500).json({
      success: false,
      error: 'Image analysis pipeline error',
      message: err.message,
      processingTime: Date.now() - startTime
    });
  }
});

// Multer error handler
router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 20MB.'
      });
    }
  }
  res.status(400).json({ success: false, error: err.message });
});

export default router;
