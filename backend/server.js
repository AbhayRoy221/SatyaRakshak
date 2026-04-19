import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/supabase.js';
import healthRouter from './routes/health.js';
import verifyRouter from './routes/verify.js';
import imageRouter from './routes/image.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '10mb' }));

// ── Routes ─────────────────────────────────────────────────
app.use('/api/health', healthRouter);
app.use('/api/verify', verifyRouter);
app.use('/api/verify/image', imageRouter);

// ── Global Error Handler ───────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('🔴 Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// ── Startup ────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║            🛡️  CrisisVerify Engine v1.0              ║
║         Digital Forensic Command Center              ║
╠══════════════════════════════════════════════════════╣
║  Server  : http://localhost:${PORT}                    ║
║  Health  : http://localhost:${PORT}/api/health         ║
║  Verify  : POST http://localhost:${PORT}/api/verify    ║
║  Image   : POST http://localhost:${PORT}/api/verify/image ║
╚══════════════════════════════════════════════════════╝
  `);

  // Test Supabase connection
  const dbOk = await testConnection();
  if (dbOk) {
    console.log('✅ Database: Supabase tables verified');
  }
});
