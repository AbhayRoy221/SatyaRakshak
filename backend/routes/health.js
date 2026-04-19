/**
 * CrisisVerify — Health Check Route
 */
import { Router } from 'express';
import { isConnected } from '../config/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

const router = Router();

router.get('/', (_req, res) => {
  const status = {
    status: 'operational',
    engine: 'CrisisVerify v1.0',
    timestamp: new Date().toISOString(),
    services: {
      groq: !!process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'gsk_your_groq_api_key_here',
      gemini: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here',
      tavily: !!process.env.TAVILY_API_KEY && process.env.TAVILY_API_KEY !== 'tvly-your_tavily_api_key_here',
      supabase: isConnected,
      gdelt: true // Always available (no API key needed)
    },
    capabilities: {
      textVerification: true,
      imageForensics: true,
      multilingualSupport: true,
      sentimentAnalysis: true,
      geographicGrounding: true
    }
  };

  res.json(status);
});

export default router;
