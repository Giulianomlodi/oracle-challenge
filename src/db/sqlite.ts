import Database from 'better-sqlite3';
import config from '../config';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dbDir = path.dirname(config.database.path);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(config.database.path);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    moltbook_name TEXT UNIQUE,
    wallet_address TEXT,
    total_predictions INTEGER DEFAULT 0,
    correct_predictions INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    total_ort_earned REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS predictions (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    topic_id TEXT,
    post_id TEXT,
    comment_id TEXT,
    prediction_text TEXT NOT NULL,
    outcome_predicted TEXT,
    deadline DATETIME,
    confidence INTEGER NOT NULL DEFAULT 5,
    category TEXT DEFAULT 'other',
    status TEXT DEFAULT 'pending',
    tx_hash TEXT,
    on_chain_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  );

  CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    post_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'other',
    deadline DATETIME,
    resolved BOOLEAN DEFAULT FALSE,
    actual_outcome TEXT,
    polymarket_id TEXT,
    polymarket_data TEXT,
    source TEXT DEFAULT 'generated',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME
  );

  CREATE INDEX IF NOT EXISTS idx_predictions_agent ON predictions(agent_id);
  CREATE INDEX IF NOT EXISTS idx_predictions_status ON predictions(status);
  CREATE INDEX IF NOT EXISTS idx_predictions_topic ON predictions(topic_id);
  CREATE INDEX IF NOT EXISTS idx_topics_resolved ON topics(resolved);
`);

// Agent functions
export function getOrCreateAgent(moltbookName: string): any {
  let agent = db.prepare('SELECT * FROM agents WHERE moltbook_name = ?').get(moltbookName);
  
  if (!agent) {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO agents (id, moltbook_name) VALUES (?, ?)
    `).run(id, moltbookName);
    agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
  }
  
  return agent;
}

export function updateAgentWallet(agentId: string, walletAddress: string): void {
  db.prepare('UPDATE agents SET wallet_address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(walletAddress, agentId);
}

export function getAgent(agentId: string): any {
  return db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
}

export function getAgentByName(moltbookName: string): any {
  return db.prepare('SELECT * FROM agents WHERE moltbook_name = ?').get(moltbookName);
}

// Prediction functions
export function createPrediction(data: {
  agentId: string;
  topicId?: string;
  postId?: string;
  commentId?: string;
  predictionText: string;
  outcomePredicted?: string;
  deadline?: Date;
  confidence: number;
  category?: string;
}): string {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO predictions (
      id, agent_id, topic_id, post_id, comment_id, 
      prediction_text, outcome_predicted, deadline, confidence, category
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.agentId,
    data.topicId || null,
    data.postId || null,
    data.commentId || null,
    data.predictionText,
    data.outcomePredicted || null,
    data.deadline?.toISOString() || null,
    data.confidence,
    data.category || 'other'
  );
  return id;
}

export function getPrediction(id: string): any {
  return db.prepare('SELECT * FROM predictions WHERE id = ?').get(id);
}

export function getPendingPredictions(): any[] {
  return db.prepare(`
    SELECT p.*, a.moltbook_name as agent_name, a.wallet_address
    FROM predictions p
    JOIN agents a ON p.agent_id = a.id
    WHERE p.status = 'pending'
    ORDER BY p.created_at ASC
  `).all();
}

export function resolvePrediction(id: string, correct: boolean, txHash?: string): void {
  const status = correct ? 'resolved_correct' : 'resolved_wrong';
  db.prepare(`
    UPDATE predictions 
    SET status = ?, resolved_at = CURRENT_TIMESTAMP, tx_hash = ?
    WHERE id = ?
  `).run(status, txHash || null, id);
  
  // Update agent stats
  const prediction = getPrediction(id);
  if (prediction) {
    if (correct) {
      db.prepare(`
        UPDATE agents 
        SET correct_predictions = correct_predictions + 1,
            current_streak = current_streak + 1,
            best_streak = MAX(best_streak, current_streak + 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(prediction.agent_id);
    } else {
      db.prepare(`
        UPDATE agents 
        SET current_streak = 0,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(prediction.agent_id);
    }
  }
}

// Topic functions
export function createTopic(data: {
  postId?: string;
  title: string;
  description?: string;
  category?: string;
  deadline?: Date;
  polymarketId?: string;
  polymarketData?: any;
  source?: 'generated' | 'polymarket';
}): string {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO topics (id, post_id, title, description, category, deadline, polymarket_id, polymarket_data, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.postId || null,
    data.title,
    data.description || null,
    data.category || 'other',
    data.deadline?.toISOString() || null,
    data.polymarketId || null,
    data.polymarketData ? JSON.stringify(data.polymarketData) : null,
    data.source || 'generated'
  );
  return id;
}

export function getTopic(id: string): any {
  return db.prepare('SELECT * FROM topics WHERE id = ?').get(id);
}

export function getTopicByPostId(postId: string): any {
  return db.prepare('SELECT * FROM topics WHERE post_id = ?').get(postId);
}

export function getPendingTopics(): any[] {
  return db.prepare('SELECT * FROM topics WHERE resolved = FALSE ORDER BY created_at DESC').all();
}

export function resolveTopic(id: string, actualOutcome: string): void {
  db.prepare(`
    UPDATE topics 
    SET resolved = TRUE, actual_outcome = ?, resolved_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(actualOutcome, id);
}

// Leaderboard
export function getLeaderboard(limit: number = 10): any[] {
  return db.prepare(`
    SELECT 
      moltbook_name,
      total_predictions,
      correct_predictions,
      ROUND(CAST(correct_predictions AS FLOAT) / NULLIF(total_predictions, 0) * 100, 1) as accuracy,
      current_streak,
      best_streak,
      total_ort_earned
    FROM agents
    WHERE total_predictions > 0
    ORDER BY correct_predictions DESC, accuracy DESC
    LIMIT ?
  `).all(limit);
}

export default {
  getOrCreateAgent,
  updateAgentWallet,
  getAgent,
  getAgentByName,
  createPrediction,
  getPrediction,
  getPendingPredictions,
  resolvePrediction,
  createTopic,
  getTopic,
  getTopicByPostId,
  getPendingTopics,
  resolveTopic,
  getLeaderboard,
};
