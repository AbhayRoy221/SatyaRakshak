/**
 * CrisisVerify — Multilingual Translation Pipeline
 * Supports all 9 BFNK languages → English translation
 */
import translate from '@vitalets/google-translate-api';
import { detectLanguage } from '../utils/helpers.js';

// Language code mapping for BFNK languages
const LANG_CODES = {
  'Hindi': 'hi',
  'Marathi': 'mr',
  'Telugu': 'te',
  'Tamil': 'ta',
  'Bengali': 'bn',
  'Gujarati': 'gu',
  'Kannada': 'kn',
  'Malayalam': 'ml',
  'Punjabi': 'pa',
  'English': 'en'
};

/**
 * Translate text to English if it's in a non-English language
 * @param {string} text - Input text (possibly non-English)
 * @returns {Promise<{ original: string, translated: string, detectedLang: string, wasTranslated: boolean }>}
 */
export async function translateToEnglish(text) {
  if (!text || text.trim().length === 0) {
    return { original: text, translated: text, detectedLang: 'English', wasTranslated: false };
  }

  const detectedLang = detectLanguage(text);

  // Already English — skip translation
  if (detectedLang === 'English') {
    return { original: text, translated: text, detectedLang: 'English', wasTranslated: false };
  }

  try {
    const result = await translate(text, { to: 'en' });
    return {
      original: text,
      translated: result.text,
      detectedLang,
      wasTranslated: true
    };
  } catch (err) {
    console.error(`⚠️  Translation failed (${detectedLang}):`, err.message);
    // Fallback: return original text
    return {
      original: text,
      translated: text,
      detectedLang,
      wasTranslated: false,
      translationError: err.message
    };
  }
}

/**
 * Detect language and return metadata without translating
 */
export function getLanguageInfo(text) {
  const detectedLang = detectLanguage(text);
  return {
    language: detectedLang,
    code: LANG_CODES[detectedLang] || 'en',
    isIndic: detectedLang !== 'English',
    script: getScript(detectedLang)
  };
}

function getScript(lang) {
  const scripts = {
    'Hindi': 'Devanagari', 'Marathi': 'Devanagari',
    'Bengali': 'Bengali', 'Telugu': 'Telugu',
    'Tamil': 'Tamil', 'Kannada': 'Kannada',
    'Malayalam': 'Malayalam', 'Gujarati': 'Gujarati',
    'Punjabi': 'Gurmukhi', 'English': 'Latin'
  };
  return scripts[lang] || 'Unknown';
}
