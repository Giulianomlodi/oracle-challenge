import config from '../config';

interface ScoringResult {
  baseReward: number;
  confidenceMultiplier: number;
  streakBonus: number;
  totalReward: number;
  newStreak: number;
}

/**
 * Calculate reward for a correct prediction
 */
export function calculateReward(
  confidence: number,
  currentStreak: number
): ScoringResult {
  const { baseReward, maxStreakBonus } = config.game;
  
  // Validate confidence (1-10)
  const validConfidence = Math.max(1, Math.min(10, confidence));
  
  // Confidence multiplier: confidence / 5
  // So confidence 10 = 2x, confidence 5 = 1x, confidence 1 = 0.2x
  const confidenceMultiplier = validConfidence / 5;
  
  // Streak bonus: 1 + (streak * 0.1), capped at 2x
  const newStreak = currentStreak + 1;
  const streakBonus = Math.min(maxStreakBonus, 1 + (newStreak * 0.1));
  
  // Total reward
  const totalReward = baseReward * confidenceMultiplier * streakBonus;
  
  return {
    baseReward,
    confidenceMultiplier,
    streakBonus,
    totalReward: Math.round(totalReward * 100) / 100, // Round to 2 decimals
    newStreak,
  };
}

/**
 * Calculate penalty for wrong prediction (reputation loss, not tokens)
 * Higher confidence = higher reputation loss
 */
export function calculatePenalty(confidence: number): { reputationLoss: number } {
  // Reputation loss scales with confidence
  // High confidence wrong = bigger reputation hit
  const reputationLoss = Math.floor(confidence * 5);
  
  return { reputationLoss };
}

/**
 * Calculate agent's accuracy percentage
 */
export function calculateAccuracy(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 1000) / 10; // 1 decimal place
}

/**
 * Get rank title based on accuracy and predictions
 */
export function getAgentRank(accuracy: number, totalPredictions: number): string {
  if (totalPredictions < 5) return '🔰 Novice';
  if (totalPredictions < 20) {
    if (accuracy >= 70) return '⭐ Rising Star';
    return '📊 Apprentice';
  }
  if (totalPredictions < 50) {
    if (accuracy >= 80) return '🌟 Expert Oracle';
    if (accuracy >= 60) return '🔮 Seer';
    return '📈 Analyst';
  }
  // 50+ predictions
  if (accuracy >= 85) return '👑 Grand Oracle';
  if (accuracy >= 75) return '💫 Master Seer';
  if (accuracy >= 65) return '🎯 Veteran';
  return '📉 Experienced';
}

/**
 * Format leaderboard entry for display
 */
export function formatLeaderboardEntry(
  rank: number,
  name: string,
  accuracy: number,
  correct: number,
  total: number,
  streak: number,
  reward: number
): string {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
  const streakDisplay = streak >= 3 ? `🔥${streak}` : streak > 0 ? `${streak}` : '-';
  
  return `${medal} **${name}** | ${accuracy}% (${correct}/${total}) | Streak: ${streakDisplay} | ${reward.toLocaleString()} ORT`;
}

/**
 * Generate full leaderboard text
 */
export function generateLeaderboardText(entries: Array<{
  moltbook_name: string;
  accuracy: number;
  correct_predictions: number;
  total_predictions: number;
  current_streak: number;
  total_ort_earned: number;
}>): string {
  if (entries.length === 0) {
    return '🔮 **Oracle Challenge Leaderboard**\n\n*No predictions yet! Be the first to participate.*';
  }
  
  const header = '🔮 **Oracle Challenge Leaderboard**\n\n';
  const divider = '---\n';
  
  const lines = entries.map((entry, index) => 
    formatLeaderboardEntry(
      index + 1,
      entry.moltbook_name,
      entry.accuracy,
      entry.correct_predictions,
      entry.total_predictions,
      entry.current_streak,
      entry.total_ort_earned
    )
  );
  
  const footer = `\n${divider}\n*Updated: ${new Date().toLocaleString()}*\n*Rewards in ORT tokens on BASE*`;
  
  return header + lines.join('\n') + footer;
}

export default {
  calculateReward,
  calculatePenalty,
  calculateAccuracy,
  getAgentRank,
  formatLeaderboardEntry,
  generateLeaderboardText,
};
