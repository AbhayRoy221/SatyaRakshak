/**
 * CrisisVerify — YAKE Keyword Extraction
 * Reduces noise by 90% before sending content to LLMs
 * Since there's no mature JS YAKE package, we implement a simplified
 * statistical keyword extraction based on TF-IDF principles.
 */

// Common English stop words to filter out
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'this', 'that', 'are', 'was',
  'were', 'be', 'been', 'has', 'have', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'not', 'no',
  'so', 'if', 'then', 'than', 'when', 'where', 'what', 'which', 'who',
  'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
  'some', 'such', 'only', 'own', 'same', 'just', 'very', 'also', 'about',
  'up', 'out', 'into', 'over', 'after', 'before', 'between', 'under',
  'above', 'below', 'during', 'through', 'while', 'because', 'since',
  'until', 'against', 'its', 'his', 'her', 'their', 'our', 'my', 'your',
  'he', 'she', 'they', 'we', 'you', 'i', 'me', 'him', 'us', 'them',
  'here', 'there', 'now', 'says', 'said', 'like', 'get', 'got', 'going',
  'been', 'being', 'make', 'made', 'take', 'taken', 'come', 'came',
  'know', 'known', 'see', 'seen', 'think', 'thought', 'go', 'went',
  'say', 'tell', 'told', 'find', 'found', 'give', 'given', 'use', 'used',
  'new', 'old', 'one', 'two', 'three', 'first', 'last', 'next', 'still',
  'even', 'well', 'way', 'back', 'many', 'much', 'those', 'these', 'any',
  'per', 'via', 'etc', 'amp', 'nbsp', 'quot', 'http', 'https', 'www', 'com'
]);

/**
 * Extract top keywords from text using YAKE-inspired statistical approach
 * @param {string} text - Input text
 * @param {number} topN - Number of keywords to return (default: 10)
 * @returns {{ keywords: string[], keyPhrases: string[], summary: string }}
 */
export function extractKeywords(text, topN = 10) {
  if (!text || text.trim().length === 0) {
    return { keywords: [], keyPhrases: [], summary: '' };
  }

  // Tokenize and clean
  const words = text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));

  // Calculate term frequency
  const tf = {};
  for (const word of words) {
    tf[word] = (tf[word] || 0) + 1;
  }

  // Score by frequency and position (words appearing early get a boost)
  const wordPositions = {};
  words.forEach((word, idx) => {
    if (!wordPositions[word]) wordPositions[word] = idx;
  });

  const scored = Object.entries(tf).map(([word, freq]) => {
    const positionScore = 1 / (1 + wordPositions[word] / words.length);
    const lengthBonus = Math.min(word.length / 8, 1); // Longer words often more meaningful
    const capitalBonus = text.includes(word.charAt(0).toUpperCase() + word.slice(1)) ? 1.5 : 1.0;
    const score = freq * positionScore * lengthBonus * capitalBonus;
    return { word, score, freq };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  const keywords = scored.slice(0, topN).map(s => s.word);

  // Extract bigrams (2-word phrases)
  const bigrams = {};
  for (let i = 0; i < words.length - 1; i++) {
    const phrase = `${words[i]} ${words[i + 1]}`;
    if (!STOP_WORDS.has(words[i]) && !STOP_WORDS.has(words[i + 1])) {
      bigrams[phrase] = (bigrams[phrase] || 0) + 1;
    }
  }

  const keyPhrases = Object.entries(bigrams)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([phrase]) => phrase);

  // Generate compressed summary for LLM
  const summary = `Keywords: ${keywords.join(', ')}. Key phrases: ${keyPhrases.join(', ')}.`;

  return { keywords, keyPhrases, summary };
}

/**
 * Compress long text for LLM input (reduce token usage)
 * Keeps first 2 sentences + keywords + last sentence
 */
export function compressForLLM(text, maxChars = 1500) {
  if (!text || text.length <= maxChars) return text;

  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const { summary } = extractKeywords(text);

  const intro = sentences.slice(0, 2).join(' ');
  const outro = sentences[sentences.length - 1] || '';

  return `${intro}\n\n[EXTRACTED] ${summary}\n\n${outro}`.substring(0, maxChars);
}
