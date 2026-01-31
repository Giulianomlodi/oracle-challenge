import { MoltbookComment } from './client';

export interface ParsedPrediction {
  prediction: string;
  outcome: string;
  deadline?: Date;
  confidence: number;
  category: string;
  raw: string;
}

/**
 * Parse a prediction from a Moltbook comment
 * Expected format:
 * PREDICTION: [what] will [outcome] by [deadline]
 * CONFIDENCE: [1-10]
 * CATEGORY: [tech|crypto|ai|world|science]
 */
export function parsePrediction(comment: MoltbookComment): ParsedPrediction | null {
  const content = comment.content;
  
  // Match prediction line
  const predictionMatch = content.match(/PREDICTION:\s*(.+?)(?:\n|$)/i);
  if (!predictionMatch) return null;
  
  const predictionText = predictionMatch[1].trim();
  
  // Match confidence
  const confidenceMatch = content.match(/CONFIDENCE:\s*(\d+)/i);
  const confidence = confidenceMatch 
    ? Math.min(10, Math.max(1, parseInt(confidenceMatch[1]))) 
    : 5;
  
  // Match category
  const categoryMatch = content.match(/CATEGORY:\s*(tech|crypto|ai|world|science|other)/i);
  const category = categoryMatch ? categoryMatch[1].toLowerCase() : 'other';
  
  // Try to extract deadline from prediction text
  const deadlinePatterns = [
    /by\s+(\w+\s+\d{4})/i,           // "by March 2026"
    /by\s+(\d{1,2}\/\d{1,2}\/\d{4})/i, // "by 03/15/2026"
    /by\s+(end of \w+)/i,            // "by end of year"
    /within\s+(\d+\s+\w+)/i,         // "within 30 days"
  ];
  
  let deadline: Date | undefined;
  for (const pattern of deadlinePatterns) {
    const match = predictionText.match(pattern);
    if (match) {
      try {
        deadline = parseDateString(match[1]);
        break;
      } catch (e) {
        // Continue trying other patterns
      }
    }
  }
  
  // Extract outcome from prediction
  const outcomeMatch = predictionText.match(/will\s+(.+?)(?:\s+by|$)/i);
  const outcome = outcomeMatch ? outcomeMatch[1].trim() : predictionText;
  
  return {
    prediction: predictionText,
    outcome,
    deadline,
    confidence,
    category,
    raw: content,
  };
}

/**
 * Parse a date string into a Date object
 */
function parseDateString(dateStr: string): Date {
  const normalizedStr = dateStr.toLowerCase().trim();
  
  // Handle relative dates
  if (normalizedStr.includes('within')) {
    const match = normalizedStr.match(/(\d+)\s+(day|week|month|year)s?/);
    if (match) {
      const amount = parseInt(match[1]);
      const unit = match[2];
      const date = new Date();
      switch (unit) {
        case 'day': date.setDate(date.getDate() + amount); break;
        case 'week': date.setDate(date.getDate() + amount * 7); break;
        case 'month': date.setMonth(date.getMonth() + amount); break;
        case 'year': date.setFullYear(date.getFullYear() + amount); break;
      }
      return date;
    }
  }
  
  // Handle "end of X"
  if (normalizedStr.includes('end of')) {
    const date = new Date();
    if (normalizedStr.includes('year')) {
      date.setMonth(11, 31);
    } else if (normalizedStr.includes('month')) {
      date.setMonth(date.getMonth() + 1, 0);
    } else if (normalizedStr.includes('quarter')) {
      const currentMonth = date.getMonth();
      const quarterEnd = Math.ceil((currentMonth + 1) / 3) * 3;
      date.setMonth(quarterEnd, 0);
    }
    return date;
  }
  
  // Try standard date parsing
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  throw new Error(`Could not parse date: ${dateStr}`);
}

/**
 * Format a prediction for display
 */
export function formatPredictionSummary(pred: ParsedPrediction): string {
  const deadline = pred.deadline 
    ? pred.deadline.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'unspecified';
  
  return `📊 **${pred.category.toUpperCase()}** | Confidence: ${pred.confidence}/10 | Deadline: ${deadline}\n> ${pred.prediction}`;
}

export default { parsePrediction, formatPredictionSummary };
