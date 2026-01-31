/**
 * Unit tests for Polymarket client
 */

import { PolymarketClient } from '../../../src/polymarket/client';
import { PolymarketMarket } from '../../../src/polymarket/types';

// Mock axios
jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PolymarketClient', () => {
  let client: PolymarketClient;

  beforeEach(() => {
    client = new PolymarketClient('https://gamma-api.polymarket.com');
    jest.clearAllMocks();
  });

  describe('getMarkets', () => {
    it('should fetch and parse markets correctly', async () => {
      const mockResponse = {
        data: [
          {
            id: 'market-1',
            question: 'Will BTC reach $100k by end of 2026?',
            description: 'Bitcoin price prediction',
            slug: 'btc-100k-2026',
            outcomes: '["Yes", "No"]',
            outcomePrices: '["0.65", "0.35"]',
            endDate: '2026-12-31T00:00:00Z',
            closed: false,
            active: true,
            volume: '1500000',
            liquidity: '500000',
            createdAt: '2026-01-01T00:00:00Z',
            category: 'crypto',
          },
        ],
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const markets = await client.getMarkets({ limit: 10 });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://gamma-api.polymarket.com/markets',
        expect.objectContaining({
          params: expect.objectContaining({ limit: 10 }),
        })
      );

      expect(markets).toHaveLength(1);
      expect(markets[0].id).toBe('market-1');
      expect(markets[0].question).toBe('Will BTC reach $100k by end of 2026?');
      expect(markets[0].outcomes).toEqual(['Yes', 'No']);
      expect(markets[0].volume).toBe(1500000);
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.getMarkets()).rejects.toThrow('Failed to fetch markets');
    });
  });

  describe('getMarket', () => {
    it('should fetch a single market by ID', async () => {
      const mockResponse = {
        data: {
          id: 'market-1',
          question: 'Test market',
          description: 'Description',
          slug: 'test-market',
          outcomes: '["Yes", "No"]',
          outcomePrices: '["0.5", "0.5"]',
          endDate: '2026-12-31T00:00:00Z',
          closed: false,
          active: true,
          volume: '100000',
          liquidity: '50000',
          createdAt: '2026-01-01T00:00:00Z',
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const market = await client.getMarket('market-1');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://gamma-api.polymarket.com/markets/market-1',
        expect.anything()
      );
      expect(market.id).toBe('market-1');
    });
  });

  describe('getResolution', () => {
    it('should detect resolved markets', async () => {
      const mockResponse = {
        data: {
          id: 'market-1',
          question: 'Test resolved',
          description: '',
          slug: 'test',
          outcomes: '["Yes", "No"]',
          outcomePrices: '["1", "0"]',
          endDate: '2026-01-01T00:00:00Z',
          closed: true,
          active: false,
          volume: '100000',
          liquidity: '0',
          createdAt: '2025-01-01T00:00:00Z',
          resolvedAt: '2026-01-15T00:00:00Z',
          outcome: 'Yes',
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const resolution = await client.getResolution('market-1');

      expect(resolution.resolved).toBe(true);
      expect(resolution.outcome).toBe('Yes');
    });

    it('should detect pending markets', async () => {
      const mockResponse = {
        data: {
          id: 'market-1',
          question: 'Test pending',
          description: '',
          slug: 'test',
          outcomes: '["Yes", "No"]',
          outcomePrices: '["0.6", "0.4"]',
          endDate: '2026-12-31T00:00:00Z',
          closed: false,
          active: true,
          volume: '100000',
          liquidity: '50000',
          createdAt: '2026-01-01T00:00:00Z',
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const resolution = await client.getResolution('market-1');

      expect(resolution.resolved).toBe(false);
      expect(resolution.outcome).toBeUndefined();
    });
  });

  describe('filterSuitableMarkets', () => {
    const baseMarket: PolymarketMarket = {
      id: 'market-1',
      question: 'Will something happen?',
      description: 'Test',
      slug: 'test',
      outcomes: ['Yes', 'No'],
      outcomePrices: ['0.5', '0.5'],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      closed: false,
      resolved: false,
      category: 'crypto',
      volume: 100000,
      liquidity: 50000,
      createdAt: new Date(),
    };

    it('should filter out low liquidity markets', () => {
      const markets: PolymarketMarket[] = [
        { ...baseMarket, liquidity: 5000 }, // Too low
        { ...baseMarket, id: 'market-2', liquidity: 50000 }, // OK
      ];

      const filtered = client.filterSuitableMarkets(markets, 10000);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('market-2');
    });

    it('should filter out closed markets', () => {
      const markets: PolymarketMarket[] = [
        { ...baseMarket, closed: true },
        { ...baseMarket, id: 'market-2' },
      ];

      const filtered = client.filterSuitableMarkets(markets, 10000);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('market-2');
    });

    it('should filter out resolved markets', () => {
      const markets: PolymarketMarket[] = [
        { ...baseMarket, resolved: true, resolvedOutcome: 'Yes' },
        { ...baseMarket, id: 'market-2' },
      ];

      const filtered = client.filterSuitableMarkets(markets, 10000);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('market-2');
    });
  });
});
