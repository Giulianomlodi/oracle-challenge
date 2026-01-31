import db from '../db/sqlite';
import { calculateReward } from './scorer';
import blockchain from '../blockchain/contracts';

export interface ResolutionResult {
  predictionId: string;
  agentName: string;
  correct: boolean;
  reward: number;
  newStreak: number;
  txHash?: string;
}

/**
 * Resolve a single prediction
 */
export async function resolvePrediction(
  predictionId: string,
  correct: boolean,
  useBlockchain: boolean = true
): Promise<ResolutionResult> {
  const prediction = db.getPrediction(predictionId);
  if (!prediction) {
    throw new Error(`Prediction not found: ${predictionId}`);
  }
  
  if (prediction.status !== 'pending') {
    throw new Error(`Prediction already resolved: ${predictionId}`);
  }
  
  const agent = db.getAgent(prediction.agent_id);
  let reward = 0;
  let newStreak = 0;
  let txHash: string | undefined;
  
  if (correct) {
    const scoring = calculateReward(prediction.confidence, agent.current_streak);
    reward = scoring.totalReward;
    newStreak = scoring.newStreak;
    
    // Submit to blockchain if enabled and agent has wallet
    if (useBlockchain && prediction.on_chain_id && agent.wallet_address) {
      try {
        txHash = await blockchain.resolvePredictionOnChain(prediction.on_chain_id, true);
      } catch (error) {
        console.error('Blockchain resolution failed:', error);
        // Continue with off-chain resolution
      }
    }
  } else {
    newStreak = 0;
    
    if (useBlockchain && prediction.on_chain_id) {
      try {
        txHash = await blockchain.resolvePredictionOnChain(prediction.on_chain_id, false);
      } catch (error) {
        console.error('Blockchain resolution failed:', error);
      }
    }
  }
  
  // Update local database
  db.resolvePrediction(predictionId, correct, txHash);
  
  // Update agent rewards
  if (correct && reward > 0) {
    const updateStmt = `
      UPDATE agents 
      SET total_ort_earned = total_ort_earned + ?
      WHERE id = ?
    `;
    // This would need to be added to the db module
  }
  
  return {
    predictionId,
    agentName: agent.moltbook_name,
    correct,
    reward,
    newStreak,
    txHash,
  };
}

/**
 * Resolve a topic and all its predictions
 */
export async function resolveTopic(
  topicId: string,
  actualOutcome: string,
  matchingOutcomes: string[] = []
): Promise<ResolutionResult[]> {
  const topic = db.getTopic(topicId);
  if (!topic) {
    throw new Error(`Topic not found: ${topicId}`);
  }
  
  if (topic.resolved) {
    throw new Error(`Topic already resolved: ${topicId}`);
  }
  
  // Mark topic as resolved
  db.resolveTopic(topicId, actualOutcome);
  
  // Get all predictions for this topic
  const predictions = db.getPendingPredictions().filter(
    (p: any) => p.topic_id === topicId
  );
  
  const results: ResolutionResult[] = [];
  
  for (const prediction of predictions) {
    // Determine if prediction was correct
    // Simple matching: check if outcome contains any of the matching keywords
    const predictionLower = (prediction.outcome_predicted || prediction.prediction_text).toLowerCase();
    const outcomeLower = actualOutcome.toLowerCase();
    
    let correct = false;
    
    // Check for explicit yes/no matching
    if (matchingOutcomes.length > 0) {
      correct = matchingOutcomes.some(m => predictionLower.includes(m.toLowerCase()));
    } else {
      // Simple heuristic: check for "yes", "will", "true" vs "no", "won't", "false"
      const positiveTerms = ['yes', 'will', 'true', 'happen', 'succeed'];
      const negativeTerms = ['no', 'won\'t', 'false', 'fail', 'not'];
      
      const predictionPositive = positiveTerms.some(t => predictionLower.includes(t));
      const predictionNegative = negativeTerms.some(t => predictionLower.includes(t));
      const outcomePositive = outcomeLower.includes('yes') || outcomeLower.includes('happened') || outcomeLower.includes('true');
      
      if (predictionPositive && !predictionNegative) {
        correct = outcomePositive;
      } else if (predictionNegative && !predictionPositive) {
        correct = !outcomePositive;
      }
      // If ambiguous, default to incorrect (admin should use matchingOutcomes for clarity)
    }
    
    try {
      const result = await resolvePrediction(prediction.id, correct);
      results.push(result);
    } catch (error) {
      console.error(`Error resolving prediction ${prediction.id}:`, error);
    }
  }
  
  return results;
}

/**
 * Check for topics that have passed their deadline and need resolution
 */
export function getExpiredTopics(): any[] {
  const pending = db.getPendingTopics();
  const now = new Date();
  
  return pending.filter((topic: any) => {
    if (!topic.deadline) return false;
    const deadline = new Date(topic.deadline);
    return deadline < now;
  });
}

/**
 * Format resolution announcement for Moltbook
 */
export function formatResolutionAnnouncement(
  topicTitle: string,
  outcome: string,
  results: ResolutionResult[]
): string {
  const correctCount = results.filter(r => r.correct).length;
  const totalCount = results.length;
  
  let text = `# 🏆 Prediction Resolved!\n\n`;
  text += `**Topic:** ${topicTitle}\n`;
  text += `**Outcome:** ${outcome}\n`;
  text += `**Results:** ${correctCount}/${totalCount} correct predictions\n\n`;
  text += `---\n\n`;
  
  // Top winners
  const winners = results
    .filter(r => r.correct)
    .sort((a, b) => b.reward - a.reward)
    .slice(0, 5);
  
  if (winners.length > 0) {
    text += `**🎉 Top Predictions:**\n`;
    winners.forEach((w, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '•';
      text += `${medal} ${w.agentName}: +${w.reward} ORT`;
      if (w.newStreak >= 3) text += ` 🔥${w.newStreak}`;
      text += '\n';
    });
  } else {
    text += `*No correct predictions this time!*\n`;
  }
  
  text += `\n---\n*Rewards distributed on BASE*`;
  
  return text;
}

export default {
  resolvePrediction,
  resolveTopic,
  getExpiredTopics,
  formatResolutionAnnouncement,
};
