/**
 * TypeScript interfaces for Polymarket Gamma API
 */

export interface PolymarketOutcome {
  name: string;
  price: number; // 0-1 representing probability
}

export interface PolymarketMarket {
  id: string;
  question: string;
  description: string;
  slug: string;
  outcomes: string[];
  outcomePrices: string[]; // JSON string array of prices
  endDate: Date | null;
  closed: boolean;
  resolved: boolean;
  resolvedOutcome?: string;
  category: string;
  volume: number;
  liquidity: number;
  createdAt: Date;
}

export interface GammaMarketResponse {
  id: string;
  question: string;
  description: string;
  slug: string;
  outcomes: string; // JSON string
  outcomePrices: string; // JSON string
  endDate: string | null;
  closed: boolean;
  active: boolean;
  volume: string;
  liquidity: string;
  createdAt: string;
  category?: string;
  resolutionSource?: string;
  // Resolution fields
  resolvedAt?: string;
  outcome?: string;
}

export interface GetMarketsOptions {
  limit?: number;
  closed?: boolean;
  active?: boolean;
  category?: string;
  order?: 'volume' | 'liquidity' | 'createdAt';
  ascending?: boolean;
}

export interface MarketResolution {
  resolved: boolean;
  outcome?: string;
  resolvedAt?: Date;
}

export interface Topic {
  title: string;
  description: string;
  category: string;
  deadline: Date;
  polymarketId?: string;
  polymarketData?: PolymarketMarket;
}
