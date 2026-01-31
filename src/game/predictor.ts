import config from '../config';
import { PolymarketClient } from '../polymarket/client';
import { marketToTopic } from '../polymarket/formatter';

interface Topic {
  title: string;
  description: string;
  category: string;
  deadline: Date;
  polymarketId?: string;
  polymarketData?: any;
}

// Topic templates by category
const topicTemplates: Record<string, string[]> = {
  tech: [
    "Will {company} announce a major product before {deadline}?",
    "Will {technology} reach mainstream adoption by {deadline}?",
    "Will there be a major data breach affecting over 1M users before {deadline}?",
    "Will {company} acquire another company before {deadline}?",
    "Will a new programming language enter the TIOBE top 10 by {deadline}?",
  ],
  crypto: [
    "Will Bitcoin exceed ${price} by {deadline}?",
    "Will Ethereum complete its next major upgrade before {deadline}?",
    "Will a new stablecoin enter the top 5 by market cap by {deadline}?",
    "Will BASE network TVL exceed ${amount}B by {deadline}?",
    "Will there be a major DeFi exploit (>$10M) before {deadline}?",
  ],
  ai: [
    "Will {company} release a new foundational AI model before {deadline}?",
    "Will AI-generated content be officially regulated in {region} by {deadline}?",
    "Will an AI system pass a new benchmark at human level before {deadline}?",
    "Will autonomous AI agents become mainstream by {deadline}?",
    "Will a major AI safety incident occur before {deadline}?",
  ],
  world: [
    "Will {country} announce new technology regulations before {deadline}?",
    "Will there be a major space exploration milestone before {deadline}?",
    "Will renewable energy exceed {percentage}% of global power by {deadline}?",
    "Will a new international tech treaty be signed before {deadline}?",
  ],
  science: [
    "Will a major breakthrough in quantum computing occur before {deadline}?",
    "Will nuclear fusion achieve net energy gain again before {deadline}?",
    "Will a new element or material be synthesized before {deadline}?",
    "Will gene therapy receive approval for a new condition before {deadline}?",
  ],
};

// Variables for template substitution
const variables: Record<string, string[]> = {
  company: ['Apple', 'Google', 'Microsoft', 'Meta', 'Amazon', 'OpenAI', 'Anthropic', 'xAI', 'Tesla', 'NVIDIA'],
  technology: ['AR glasses', 'autonomous vehicles', 'quantum computers', 'brain-computer interfaces', 'humanoid robots'],
  region: ['the US', 'the EU', 'China', 'Japan', 'the UK'],
  country: ['the US', 'China', 'the EU', 'Japan', 'India'],
  price: ['100,000', '150,000', '200,000', '75,000', '50,000'],
  amount: ['5', '10', '15', '20', '25'],
  percentage: ['30', '35', '40', '45', '50'],
};

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateDeadline(): Date {
  // Generate deadlines between 1 week and 3 months from now
  const minDays = 7;
  const maxDays = 90;
  const days = minDays + Math.floor(Math.random() * (maxDays - minDays));
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + days);
  return deadline;
}

function formatDeadline(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function substituteVariables(template: string, deadline: Date): string {
  let result = template.replace('{deadline}', formatDeadline(deadline));
  
  for (const [key, values] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, getRandomElement(values));
  }
  
  return result;
}

export function generateTopic(category?: string): Topic {
  const selectedCategory = category || getRandomElement(Object.keys(topicTemplates));
  const templates = topicTemplates[selectedCategory];
  const template = getRandomElement(templates);
  const deadline = generateDeadline();
  
  const title = substituteVariables(template, deadline);
  
  return {
    title,
    description: `Make your prediction! Comment with the PREDICTION format.\n\n**Deadline:** ${formatDeadline(deadline)}\n\n\`\`\`\nPREDICTION: [your prediction here]\nCONFIDENCE: [1-10]\nCATEGORY: ${selectedCategory}\n\`\`\``,
    category: selectedCategory,
    deadline,
  };
}

export function generateDailyTopics(count: number = 3): Topic[] {
  const categories = Object.keys(topicTemplates);
  const selectedCategories: string[] = [];
  
  // Ensure variety by picking different categories
  for (let i = 0; i < count; i++) {
    const remainingCategories = categories.filter(c => !selectedCategories.includes(c));
    const category = remainingCategories.length > 0 
      ? getRandomElement(remainingCategories) 
      : getRandomElement(categories);
    selectedCategories.push(category);
  }
  
  return selectedCategories.map(category => generateTopic(category));
}

/**
 * Generate topics from Polymarket markets
 */
export async function generatePolymarketTopics(count: number = 1): Promise<Topic[]> {
  if (!config.polymarket?.enabled) {
    console.log('ℹ️ Polymarket integration disabled');
    return [];
  }

  try {
    const polymarket = new PolymarketClient();
    const markets = await polymarket.getTrendingMarkets({ 
      limit: count * 3, // Fetch more to filter
    });

    // Filter for suitable markets
    const suitableMarkets = polymarket.filterSuitableMarkets(
      markets, 
      config.polymarket.minLiquidity
    );

    if (suitableMarkets.length === 0) {
      console.warn('⚠️ No suitable Polymarket markets found');
      return [];
    }

    // Convert to topics
    const topics = suitableMarkets.slice(0, count).map(market => marketToTopic(market));
    
    console.log(`✅ Generated ${topics.length} topic(s) from Polymarket`);
    return topics;
  } catch (error: any) {
    console.error('❌ Failed to fetch Polymarket topics:', error.message);
    return [];
  }
}

export function formatTopicPost(topic: Topic): { title: string; content: string } {
  return {
    title: `🔮 PREDICTION: ${topic.title}`,
    content: `# Oracle Challenge\n\n${topic.description}\n\n---\n\n**Category:** ${topic.category.toUpperCase()}\n**Resolves:** ${formatDeadline(topic.deadline)}\n\n*Make your prediction below!*`,
  };
}

export { Topic };
export default { generateTopic, generateDailyTopics, generatePolymarketTopics, formatTopicPost };

