/**
 * CrisisVerify — VADER Sentiment Analysis
 * Detects emotional manipulation markers in crisis claims
 * Phrases with compound score < -0.5 are flagged as "Manipulation Markers"
 */
import vader from 'vader-sentiment';

const { SentimentIntensityAnalyzer } = vader;

/**
 * Analyze sentiment of text and detect manipulation markers
 * @param {string} text - Input text to analyze
 * @returns {{ overall: object, sentences: object[], manipulationMarkers: string[], emotionalIntensityTimeline: number[] }}
 */
export function analyzeSentiment(text) {
  if (!text || text.trim().length === 0) {
    return {
      overall: { neg: 0, neu: 1, pos: 0, compound: 0 },
      sentences: [],
      manipulationMarkers: [],
      emotionalIntensityTimeline: [],
      manipulationScore: 0
    };
  }

  // Overall sentiment
  const overall = SentimentIntensityAnalyzer.polarity_scores(text);

  // Split into sentences and analyze each
  const sentenceTexts = text.match(/[^.!?]+[.!?]+/g) || [text];
  const sentences = sentenceTexts.map((sentence, index) => {
    const trimmed = sentence.trim();
    const scores = SentimentIntensityAnalyzer.polarity_scores(trimmed);
    return {
      index,
      text: trimmed,
      scores,
      isManipulative: scores.compound < -0.5
    };
  });

  // Extract manipulation markers (compound < -0.5)
  const manipulationMarkers = sentences
    .filter(s => s.isManipulative)
    .map(s => s.text);

  // Build emotional intensity timeline (for chart visualization)
  const emotionalIntensityTimeline = sentences.map(s => s.scores.compound);

  // Calculate overall manipulation score (0-1)
  // Higher = more manipulative language detected
  const manipulationScore = manipulationMarkers.length > 0
    ? Math.min(manipulationMarkers.length / sentences.length + Math.abs(overall.compound < 0 ? overall.compound : 0), 1.0)
    : Math.max(0, -overall.compound);

  return {
    overall,
    sentences,
    manipulationMarkers,
    emotionalIntensityTimeline,
    manipulationScore: Math.round(manipulationScore * 100) / 100
  };
}

/**
 * Quick check: is this text emotionally manipulative?
 */
export function isManipulative(text) {
  const { manipulationScore } = analyzeSentiment(text);
  return manipulationScore > 0.4;
}

/**
 * Get sentiment label from compound score
 */
export function getSentimentLabel(compound) {
  if (compound >= 0.05) return 'POSITIVE';
  if (compound <= -0.05) return 'NEGATIVE';
  return 'NEUTRAL';
}
