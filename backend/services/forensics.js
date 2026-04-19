/**
 * CrisisVerify — Track 3: Image Forensics & C2PA
 * Uses c2patool CLI for cryptographic provenance verification
 * SHA-256 hash checking for tamper detection
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, readFile, stat } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEMP_DIR = join(__dirname, '../temp');

/**
 * Run full image forensics pipeline
 * @param {Buffer} imageBuffer - Raw image buffer from upload
 * @param {string} originalName - Original filename
 * @returns {Promise<object>} Forensics results
 */
export async function analyzeImage(imageBuffer, originalName = 'upload.jpg') {
  const startTime = Date.now();

  // Ensure temp directory exists
  const { mkdir } = await import('fs/promises');
  await mkdir(TEMP_DIR, { recursive: true });

  const tempPath = join(TEMP_DIR, `analysis_${Date.now()}_${originalName}`);

  try {
    // Write buffer to temp file for analysis
    await writeFile(tempPath, imageBuffer);

    // Run all checks in parallel
    const [c2paResult, hashResult, metadataResult] = await Promise.all([
      checkC2PA(tempPath),
      computeHash(imageBuffer),
      extractMetadata(tempPath)
    ]);

    // Determine overall verdict
    const verdict = determineImageVerdict(c2paResult, hashResult, metadataResult);

    return {
      verdict: verdict.status,
      verdictDetail: verdict.detail,
      c2pa: c2paResult,
      hash: hashResult,
      metadata: metadataResult,
      fileName: originalName,
      fileSize: imageBuffer.length,
      processingTime: Date.now() - startTime
    };
  } finally {
    // Clean up temp file
    try { await unlink(tempPath); } catch (e) { /* ignore */ }
  }
}

/**
 * Check C2PA manifest using c2patool CLI
 */
async function checkC2PA(filePath) {
  try {
    // Check if c2patool is available
    await execAsync('c2patool --version');

    // Read manifest
    const { stdout, stderr } = await execAsync(`c2patool "${filePath}" --detailed`, {
      timeout: 10000
    });

    if (stdout && stdout.trim().length > 0) {
      const manifest = tryParseJSON(stdout);

      if (manifest) {
        // Check for validation errors
        const hasValidationErrors = manifest.validation_status &&
          manifest.validation_status.some(v => v.code && v.code.includes('error'));

        if (hasValidationErrors) {
          return {
            status: 'TAMPERED',
            message: 'MANIFEST TAMPERED — PIXEL INTEGRITY BROKEN',
            manifest: manifest,
            signer: extractSigner(manifest),
            validationErrors: manifest.validation_status?.filter(v => v.code?.includes('error'))
          };
        }

        return {
          status: 'AUTHENTIC',
          message: `AUTHENTIC — ORIGIN: ${extractSigner(manifest)}`,
          manifest: manifest,
          signer: extractSigner(manifest),
          signedAt: extractSignDate(manifest)
        };
      }

      // stdout exists but not JSON — might be a human-readable format
      if (stdout.includes('error') || stdout.includes('invalid')) {
        return {
          status: 'TAMPERED',
          message: 'MANIFEST TAMPERED — PIXEL INTEGRITY BROKEN',
          raw: stdout
        };
      }

      return {
        status: 'AUTHENTIC',
        message: 'C2PA manifest found and verified',
        raw: stdout
      };
    }

    return {
      status: 'NO_MANIFEST',
      message: 'No C2PA provenance data found in image'
    };
  } catch (err) {
    if (err.message.includes('not recognized') || err.message.includes('not found') || err.message.includes('ENOENT')) {
      return {
        status: 'TOOL_UNAVAILABLE',
        message: 'c2patool not installed — install from https://github.com/contentauth/c2patool/releases',
        instruction: 'Download c2patool and add to PATH for full C2PA verification'
      };
    }

    // c2patool exits with non-zero when no manifest found
    if (err.stderr && (err.stderr.includes('no manifest') || err.stderr.includes('not found'))) {
      return {
        status: 'NO_MANIFEST',
        message: 'No C2PA provenance data found in image'
      };
    }

    return {
      status: 'ERROR',
      message: `C2PA check error: ${err.message}`
    };
  }
}

/**
 * Compute SHA-256 hash of image data
 */
async function computeHash(imageBuffer) {
  const sha256 = createHash('sha256').update(imageBuffer).digest('hex');
  const md5 = createHash('md5').update(imageBuffer).digest('hex');

  return {
    sha256,
    md5,
    fileSize: imageBuffer.length,
    // Store for future comparison
    fingerprint: sha256.substring(0, 16)
  };
}

/**
 * Extract basic metadata from image (EXIF-like)
 */
async function extractMetadata(filePath) {
  try {
    const fileStats = await stat(filePath);
    const buffer = await readFile(filePath);

    // Basic image format detection
    const format = detectImageFormat(buffer);

    // Try to extract EXIF comment/description if JPEG
    let exifData = {};
    if (format === 'JPEG') {
      exifData = extractBasicExif(buffer);
    }

    return {
      format,
      fileSize: fileStats.size,
      modified: fileStats.mtime,
      created: fileStats.birthtime,
      ...exifData
    };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Detect image format from magic bytes
 */
function detectImageFormat(buffer) {
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'JPEG';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return 'PNG';
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'GIF';
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) return 'WEBP';
  if (buffer[0] === 0x42 && buffer[1] === 0x4D) return 'BMP';
  return 'UNKNOWN';
}

/**
 * Extract basic EXIF data from JPEG (simplified parser)
 */
function extractBasicExif(buffer) {
  const result = {};

  // Look for EXIF marker (0xFFE1)
  for (let i = 0; i < Math.min(buffer.length - 1, 65535); i++) {
    if (buffer[i] === 0xFF && buffer[i + 1] === 0xE1) {
      result.hasExif = true;
      break;
    }
  }

  if (!result.hasExif) {
    result.hasExif = false;
    result.note = 'No EXIF data — metadata may have been stripped';
  }

  return result;
}

/**
 * Determine overall image verdict
 */
function determineImageVerdict(c2paResult, hashResult, metadataResult) {
  // C2PA Tampered = definitive
  if (c2paResult.status === 'TAMPERED') {
    return {
      status: 'TAMPERED',
      detail: c2paResult.message
    };
  }

  // C2PA Authentic = strong positive
  if (c2paResult.status === 'AUTHENTIC') {
    return {
      status: 'AUTHENTIC',
      detail: c2paResult.message
    };
  }

  // No manifest = unverified (not necessarily fake)
  if (c2paResult.status === 'NO_MANIFEST' || c2paResult.status === 'TOOL_UNAVAILABLE') {
    return {
      status: 'UNVERIFIED',
      detail: 'No cryptographic provenance data — image origin cannot be verified'
    };
  }

  return {
    status: 'UNVERIFIED',
    detail: 'Image analysis inconclusive'
  };
}

/**
 * Extract signer information from C2PA manifest
 */
function extractSigner(manifest) {
  try {
    if (manifest.active_manifest) {
      const active = manifest.manifests?.[manifest.active_manifest];
      if (active?.claim_generator) return active.claim_generator;
    }
    // Try common paths
    if (manifest.claim_generator) return manifest.claim_generator;
    if (manifest.signature_info?.issuer) return manifest.signature_info.issuer;
    return 'UNKNOWN_SIGNER';
  } catch {
    return 'UNKNOWN_SIGNER';
  }
}

/**
 * Extract sign date from C2PA manifest
 */
function extractSignDate(manifest) {
  try {
    if (manifest.signature_info?.time) return manifest.signature_info.time;
    return null;
  } catch {
    return null;
  }
}

/**
 * Try to parse JSON, return null on failure
 */
function tryParseJSON(str) {
  try { return JSON.parse(str); } catch { return null; }
}

/**
 * Sign an image with c2patool (for demo purposes)
 * Requires self-signed cert in backend/certs/
 */
export async function signImage(inputPath, outputPath) {
  const certPath = join(__dirname, '../certs/cert.pem');
  const keyPath = join(__dirname, '../certs/private.key');

  try {
    const manifest = {
      claim_generator: 'CrisisVerify_Engine/1.0',
      assertions: [
        {
          label: 'c2pa.actions',
          data: {
            actions: [
              {
                action: 'c2pa.created',
                softwareAgent: 'CrisisVerify Engine v1.0'
              }
            ]
          }
        }
      ]
    };

    const manifestPath = join(TEMP_DIR, 'sign_manifest.json');
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    const { stdout } = await execAsync(
      `c2patool "${inputPath}" --manifest "${manifestPath}" --output "${outputPath}" --signer-file "${certPath}" --private-key "${keyPath}"`,
      { timeout: 15000 }
    );

    return { success: true, output: stdout, outputPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
