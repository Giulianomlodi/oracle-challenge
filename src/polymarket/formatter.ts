/**
 * Format Polymarket markets as Oracle Challenge topics
 */

import { PolymarketMarket, Topic } from './types';

/**
 * Format deadline for display
 */
function formatDeadline(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Infer category from market data
 */
function inferCategory(market: PolymarketMarket): string {
  const question = market.question.toLowerCase();
  const category = (market.category || '').toLowerCase();
  
  if (category.includes('crypto') || question.includes('bitcoin') || 
      question.includes('ethereum') || question.includes('btc') || question.includes('eth')) {
    return 'crypto';
  }
  if (category.includes('tech') || question.includes('ai') || 
      question.includes('openai') || question.includes('google') || question.includes('apple')) {
    return 'tech';
  }
  if (category.includes('politic') || question.includes('election') || 
      question.includes('president') || question.includes('vote')) {
    return 'world';
  }
  if (category.includes('science') || question.includes('space') || 
      question.includes('nasa') || question.includes('research')) {
    return 'science';
  }
  if (question.includes('artificial intelligence') || question.includes('gpt') ||
      question.includes('machine learning')) {
    return 'ai';
  }
  
  return market.category || 'other';
}

/**
 * Format outcomes for display
 */
function formatOutcomes(market: PolymarketMarket): string {
  if (market.outcomes.length === 2 && 
      market.outcomes.includes('Yes') && market.outcomes.includes('No')) {
    return 'Yes / No';
  }
  return market.outcomes.join(' | ');
}

/**
 * Convert a Polymarket market to an Oracle Challenge Topic
 */
export function marketToTopic(market: PolymarketMarket): Topic {
  const category = inferCategory(market);
  const deadline = market.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days
  
  const description = `**🌐 From Polymarket**

${market.description || market.question}

**Possible Outcomes:** ${formatOutcomes(market)}

Make your prediction! Comment with the PREDICTION format.

**Deadline:** ${formatDeadline(deadline)}

\`\`\`
PREDICTION: [your prediction here]
CONFIDENCE: [1-10]
CATEGORY: ${category}
\`\`\`

---
*This topic is sourced from [Polymarket](https://polymarket.com/event/${market.slug}). Resolution will be based on actual market outcome.*`;

  return {
    title: market.question,
    description,
    category,
    deadline,
    polymarketId: market.id,
    polymarketData: market,
  };
}

/**
 * Convert multiple markets to topics
 */
export function marketsToTopics(markets: PolymarketMarket[], count: number = 3): Topic[] {
  return markets.slice(0, count).map(marketToTopic);
}

/**
 * Format topic for Moltbook post
 */
export function formatPolymarketTopicPost(topic: Topic): { title: string; content: string } {
  const categoryEmoji: Record<string, string> = {
    crypto: '₿',
    tech: '💻',
    ai: '🤖',
    world: '🌍',
    science: '🔬',
    other: '🔮',
  };

  const emoji = categoryEmoji[topic.category] || '🔮';

  return {
    title: `${emoji} PREDICTION: ${topic.title}`,
    content: `# Oracle Challenge\n\n${topic.description}\n\n---\n\n**Category:** ${topic.category.toUpperCase()}\n**Source:** Polymarket\n**Resolves:** ${formatDeadline(topic.deadline)}\n\n*Make your prediction below!*`,
  };
}

export default { marketToTopic, marketsToTopics, formatPolymarketTopicPost };
