/**
 * Polymarket Gamma API Client
 * Base URL: https://gamma-api.polymarket.com
 */

import axios from 'axios';
import config from '../config';
import {
  PolymarketMarket,
  GammaMarketResponse,
  GetMarketsOptions,
  MarketResolution,
} from './types';

export class PolymarketClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || config.polymarket?.baseUrl || 'https://gamma-api.polymarket.com';
  }

  /**
   * Parse Gamma API market response into our format
   */
  private parseMarket(raw: GammaMarketResponse): PolymarketMarket {
    let outcomes: string[] = [];
    let outcomePrices: string[] = [];
    
    try {
      outcomes = typeof raw.outcomes === 'string' ? JSON.parse(raw.outcomes) : raw.outcomes;
      outcomePrices = typeof raw.outcomePrices === 'string' ? JSON.parse(raw.outcomePrices) : raw.outcomePrices;
    } catch (e) {
      console.warn(`Failed to parse outcomes for market ${raw.id}`);
    }

    return {
      id: raw.id,
      question: raw.question,
      description: raw.description || '',
      slug: raw.slug,
      outcomes,
      outcomePrices,
      endDate: raw.endDate ? new Date(raw.endDate) : null,
      closed: raw.closed,
      resolved: !!raw.resolvedAt || !!raw.outcome,
      resolvedOutcome: raw.outcome,
      category: raw.category || 'other',
      volume: parseFloat(raw.volume) || 0,
      liquidity: parseFloat(raw.liquidity) || 0,
      createdAt: new Date(raw.createdAt),
    };
  }

  /**
   * Fetch markets from Polymarket Gamma API
   */
  async getMarkets(options: GetMarketsOptions = {}): Promise<PolymarketMarket[]> {
    const {
      limit = 20,
      closed = false,
      active = true,
      order = 'volume',
      ascending = false,
    } = options;

    try {
      const params: Record<string, any> = {
        limit,
        closed,
        active,
        order,
        ascending,
      };

      const response = await axios.get<GammaMarketResponse[]>(`${this.baseUrl}/markets`, {
        params,
        timeout: 10000,
      });

      return response.data.map(m => this.parseMarket(m));
    } catch (error: any) {
      console.error('Polymarket API error:', error.message);
      throw new Error(`Failed to fetch markets: ${error.message}`);
    }
  }

  /**
   * Fetch trending/popular markets
   */
  async getTrendingMarkets(options: { limit?: number; category?: string } = {}): Promise<PolymarketMarket[]> {
    const markets = await this.getMarkets({
      limit: options.limit || 20,
      closed: false,
      active: true,
      order: 'volume',
      ascending: false,
    });

    // Filter by category if specified
    if (options.category) {
      const categories = options.category.split(',').map(c => c.trim().toLowerCase());
      return markets.filter(m => 
        categories.some(cat => 
          m.category.toLowerCase().includes(cat) ||
          m.question.toLowerCase().includes(cat)
        )
      );
    }

    return markets;
  }

  /**
   * Get a specific market by ID
   */
  async getMarket(marketId: string): Promise<PolymarketMarket> {
    try {
      const response = await axios.get<GammaMarketResponse>(`${this.baseUrl}/markets/${marketId}`, {
        timeout: 10000,
      });

      return this.parseMarket(response.data);
    } catch (error: any) {
      console.error(`Polymarket API error for market ${marketId}:`, error.message);
      throw new Error(`Failed to fetch market ${marketId}: ${error.message}`);
    }
  }

  /**
   * Check if a market is resolved and get the outcome
   */
  async getResolution(marketId: string): Promise<MarketResolution> {
    try {
      const market = await this.getMarket(marketId);

      return {
        resolved: market.resolved,
        outcome: market.resolvedOutcome,
        resolvedAt: market.resolved && market.endDate ? market.endDate : undefined,
      };
    } catch (error: any) {
      console.error(`Failed to get resolution for market ${marketId}:`, error.message);
      return { resolved: false };
    }
  }

  /**
   * Get current odds/probabilities for a market
   */
  async getOdds(marketId: string): Promise<Record<string, number>> {
    const market = await this.getMarket(marketId);
    const odds: Record<string, number> = {};

    market.outcomes.forEach((outcome, index) => {
      const price = parseFloat(market.outcomePrices[index]) || 0;
      odds[outcome] = price;
    });

    return odds;
  }

  /**
   * Filter markets suitable for Oracle Challenge topics
   */
  filterSuitableMarkets(markets: PolymarketMarket[], minLiquidity: number = 10000): PolymarketMarket[] {
    const now = new Date();
    const maxDeadline = new Date();
    maxDeadline.setMonth(maxDeadline.getMonth() + 6); // 6 months max

    const minDeadline = new Date();
    minDeadline.setDate(minDeadline.getDate() + 7); // At least 1 week

    return markets.filter(market => {
      // Must be open
      if (market.closed || market.resolved) return false;

      // Must have sufficient liquidity
      if (market.liquidity < minLiquidity) return false;

      // Must have reasonable deadline
      if (market.endDate) {
        if (market.endDate < minDeadline || market.endDate > maxDeadline) return false;
      }

      // Must have clear outcomes
      if (market.outcomes.length < 2) return false;

      // Must have a question
      if (!market.question || market.question.length < 10) return false;

      return true;
    });
  }
}

export default PolymarketClient;
