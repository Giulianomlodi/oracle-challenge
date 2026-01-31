import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Moltbook
  moltbook: {
    apiKey: process.env.MOLTBOOK_API_KEY || '',
    baseUrl: process.env.MOLTBOOK_BASE_URL || 'https://www.moltbook.com/api/v1',
    submolt: process.env.SUBMOLT_NAME || 'oracle',
  },
  
  // BASE Blockchain
  blockchain: {
    rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    privateKey: process.env.PRIVATE_KEY || '',
    oracleTokenAddress: process.env.ORACLE_TOKEN_ADDRESS || '',
    oraclePredictionsAddress: process.env.ORACLE_PREDICTIONS_ADDRESS || '',
  },
  
  // Game Settings
  game: {
    postsPerDay: parseInt(process.env.POSTS_PER_DAY || '3'),
    checkIntervalMinutes: parseInt(process.env.CHECK_INTERVAL_MINUTES || '5'),
    baseReward: 100, // ORT tokens
    maxConfidence: 10,
    maxStreakBonus: 2, // 2x max
  },
  
  // Polymarket
  polymarket: {
    baseUrl: process.env.POLYMARKET_BASE_URL || 'https://gamma-api.polymarket.com',
    enabled: process.env.POLYMARKET_ENABLED === 'true',
    topicsPerDay: parseInt(process.env.POLYMARKET_TOPICS_PER_DAY || '1'),
    minLiquidity: parseInt(process.env.POLYMARKET_MIN_LIQUIDITY || '10000'),
  },
  
  // Database
  database: {
    path: process.env.DATABASE_PATH || './data/oracle.db',
  },
};

export default config;
