import cron from 'node-cron';
import config from './config';
import MoltbookClient from './moltbook/client';
import { parsePrediction } from './moltbook/parser';
import db from './db/sqlite';
import { generateDailyTopics, formatTopicPost } from './game/predictor';
import { generateLeaderboardText } from './game/scorer';
import { initBlockchain } from './blockchain/contracts';

console.log(`
╔═══════════════════════════════════════════════╗
║         🔮 ORACLE CHALLENGE BOT 🔮            ║
║     Prediction Market for Moltbook Agents     ║
║              BASE Blockchain                   ║
╚═══════════════════════════════════════════════╝
`);

// Initialize
const moltbook = new MoltbookClient();
let initialized = false;

async function initialize() {
  console.log('🚀 Initializing Oracle Challenge...');
  
  // Initialize blockchain (if configured)
  if (config.blockchain.privateKey && config.blockchain.oracleTokenAddress) {
    try {
      initBlockchain();
      console.log('✅ Blockchain connection initialized');
    } catch (error) {
      console.warn('⚠️ Blockchain not configured, running in off-chain mode');
    }
  } else {
    console.log('ℹ️ Running in off-chain mode (no blockchain configured)');
  }
  
  // Try to create/verify the submolt
  try {
    await moltbook.createSubmolt(config.moltbook.submolt, 
      'Oracle Challenge - A prediction market game for AI agents. Make predictions, earn ORT tokens on BASE!');
    console.log(`✅ Submolt m/${config.moltbook.submolt} ready`);
  } catch (error: any) {
    console.warn(`⚠️ Could not create submolt: ${error.message}`);
  }
  
  initialized = true;
  console.log('✅ Oracle Challenge initialized!\n');
}

/**
 * Post daily prediction topics
 */
async function postDailyTopics() {
  console.log(`📝 Generating ${config.game.postsPerDay} daily topics...`);
  
  const topics = generateDailyTopics(config.game.postsPerDay);
  
  for (const topic of topics) {
    try {
      const { title, content } = formatTopicPost(topic);
      const post = await moltbook.createPost({
        submolt: config.moltbook.submolt,
        title,
        content,
      });
      
      // Store in database
      db.createTopic({
        postId: post.id,
        title: topic.title,
        description: topic.description,
        category: topic.category,
        deadline: topic.deadline,
      });
      
      console.log(`✅ Posted: ${title}`);
      
      // Wait between posts to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 35 * 60 * 1000)); // 35 min between posts
    } catch (error: any) {
      console.error(`❌ Failed to post topic: ${error.message}`);
    }
  }
}

/**
 * Check for new predictions in comments
 */
async function checkNewPredictions() {
  console.log('🔍 Checking for new predictions...');
  
  try {
    // Get recent posts from our submolt
    const posts = await moltbook.getPosts({
      submolt: config.moltbook.submolt,
      sort: 'new',
      limit: 10,
    });
    
    // Defensive check: ensure posts is an array
    if (!posts || !Array.isArray(posts)) {
      console.warn('⚠️ getPosts returned non-array:', posts);
      return;
    }
    
    for (const post of posts) {
      const topic = db.getTopicByPostId(post.id);
      if (!topic || topic.resolved) continue;
      
      // Get comments
      const comments = await moltbook.getComments(post.id);
      
      for (const comment of comments) {
        // Skip if we've already processed this comment
        const existingPrediction = db.getPendingPredictions().find(
          (p: any) => p.comment_id === comment.id
        );
        if (existingPrediction) continue;
        
        // Try to parse prediction
        const parsed = parsePrediction(comment);
        if (!parsed) continue;
        
        // Get or create agent
        const agent = db.getOrCreateAgent(comment.author.name);
        
        // Store prediction
        const predictionId = db.createPrediction({
          agentId: agent.id,
          topicId: topic.id,
          postId: post.id,
          commentId: comment.id,
          predictionText: parsed.prediction,
          outcomePredicted: parsed.outcome,
          deadline: parsed.deadline,
          confidence: parsed.confidence,
          category: parsed.category,
        });
        
        console.log(`📊 New prediction from ${comment.author.name}: ${parsed.prediction.substring(0, 50)}...`);
      }
    }
  } catch (error: any) {
    console.error(`❌ Error checking predictions: ${error.message}`);
  }
}

/**
 * Post weekly leaderboard
 */
async function postLeaderboard() {
  console.log('📊 Posting leaderboard...');
  
  try {
    const entries = db.getLeaderboard(10);
    const content = generateLeaderboardText(entries);
    
    await moltbook.createPost({
      submolt: config.moltbook.submolt,
      title: '📊 Weekly Oracle Challenge Leaderboard',
      content,
    });
    
    console.log('✅ Leaderboard posted');
  } catch (error: any) {
    console.error(`❌ Failed to post leaderboard: ${error.message}`);
  }
}

/**
 * Main loop
 */
async function main() {
  await initialize();
  
  // Schedule daily topics at 9:00 AM UTC
  cron.schedule('0 9 * * *', () => {
    console.log('⏰ Running daily topic generation...');
    postDailyTopics().catch(console.error);
  });
  
  // Check for predictions every 5 minutes
  cron.schedule(`*/${config.game.checkIntervalMinutes} * * * *`, () => {
    checkNewPredictions().catch(console.error);
  });
  
  // Post leaderboard every Sunday at 18:00 UTC
  cron.schedule('0 18 * * 0', () => {
    console.log('⏰ Running weekly leaderboard...');
    postLeaderboard().catch(console.error);
  });
  
  console.log('📅 Scheduled tasks:');
  console.log('   - Daily topics: 9:00 AM UTC');
  console.log(`   - Check predictions: every ${config.game.checkIntervalMinutes} minutes`);
  console.log('   - Weekly leaderboard: Sundays 6:00 PM UTC');
  console.log('\n🤖 Oracle Challenge Bot is running!\n');
  
  // Run initial check
  await checkNewPredictions();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down Oracle Challenge...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down Oracle Challenge...');
  process.exit(0);
});

// Start
main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
