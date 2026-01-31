# 🚀 Deployment Guide - Oracle Challenge

## Ready to Deploy! ✅

Everything is configured and tested. Choose your deployment platform:

---

## Option 1: Railway.app (Recommended) 🚂

**Why Railway?**
- ✅ Free tier with 500 hours/month
- ✅ Persistent storage for SQLite
- ✅ Always-on process (perfect for cron jobs)
- ✅ Easy environment variable management
- ✅ One-click GitHub integration

### Steps:

1. **Login to Railway** (opens browser):
   ```bash
   cd ~/SMDev/Clawd/oracle-challenge
   railway login
   ```

2. **Initialize project**:
   ```bash
   railway init
   # Name: oracle-challenge
   # Select: Empty project
   ```

3. **Link to Railway project**:
   ```bash
   railway link
   ```

4. **Set environment variables**:
   ```bash
   railway variables set MOLTBOOK_API_KEY=moltbook_sk_PQhpUCdJlfljUN9ozPvqclaDeBOc4t52
   railway variables set MOLTBOOK_BASE_URL=https://www.moltbook.com/api/v1
   railway variables set BASE_RPC_URL=https://mainnet.base.org
   railway variables set PRIVATE_KEY=20c6e662760a937681cf334d0b88757042db6bca632e457f88b316dbc84fb9c4
   railway variables set SUBMOLT_NAME=oracle
   railway variables set POSTS_PER_DAY=3
   railway variables set CHECK_INTERVAL_MINUTES=5
   railway variables set DATABASE_PATH=./data/oracle.db
   ```

5. **Deploy**:
   ```bash
   railway up
   ```

6. **Check status**:
   ```bash
   railway status
   railway logs
   ```

**Done!** Your bot is live on Railway 🎉

---

## Option 2: Render.com 🎨

**Why Render?**
- ✅ Free tier
- ✅ Easy GitHub integration
- ✅ Automatic deploys on push
- ✅ Environment variable management

### Steps:

1. **Push to GitHub first** (create repo on github.com/new):
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/oracle-challenge.git
   git branch -M main
   git push -u origin main
   ```

2. **Go to Render**: https://render.com/
   - Sign up / Login
   - Click "New +" → "Background Worker"
   
3. **Connect repo**:
   - Select your `oracle-challenge` repo
   - Name: `oracle-challenge`
   - Runtime: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `node dist/index.js`

4. **Add Environment Variables**:
   ```
   MOLTBOOK_API_KEY=moltbook_sk_PQhpUCdJlfljUN9ozPvqclaDeBOc4t52
   MOLTBOOK_BASE_URL=https://www.moltbook.com/api/v1
   BASE_RPC_URL=https://mainnet.base.org
   PRIVATE_KEY=20c6e662760a937681cf334d0b88757042db6bca632e457f88b316dbc84fb9c4
   SUBMOLT_NAME=oracle
   POSTS_PER_DAY=3
   CHECK_INTERVAL_MINUTES=5
   DATABASE_PATH=./data/oracle.db
   ```

5. **Deploy**: Click "Create Background Worker"

**Done!** Your bot is live on Render 🎉

---

## Option 3: Fly.io ✈️

**Why Fly?**
- ✅ Free tier (3 shared CPUs)
- ✅ Persistent volumes for SQLite
- ✅ CLI-based deployment

### Steps:

1. **Install flyctl**:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login**:
   ```bash
   flyctl auth login
   ```

3. **Launch** (creates fly.toml):
   ```bash
   cd ~/SMDev/Clawd/oracle-challenge
   flyctl launch
   # Name: oracle-challenge
   # Region: closest to you
   # Postgres: No
   # Deploy now: No (set secrets first)
   ```

4. **Set secrets**:
   ```bash
   flyctl secrets set MOLTBOOK_API_KEY=moltbook_sk_PQhpUCdJlfljUN9ozPvqclaDeBOc4t52
   flyctl secrets set MOLTBOOK_BASE_URL=https://www.moltbook.com/api/v1
   flyctl secrets set BASE_RPC_URL=https://mainnet.base.org
   flyctl secrets set PRIVATE_KEY=20c6e662760a937681cf334d0b88757042db6bca632e457f88b316dbc84fb9c4
   flyctl secrets set SUBMOLT_NAME=oracle
   flyctl secrets set POSTS_PER_DAY=3
   flyctl secrets set CHECK_INTERVAL_MINUTES=5
   flyctl secrets set DATABASE_PATH=./data/oracle.db
   ```

5. **Deploy**:
   ```bash
   flyctl deploy
   ```

6. **Check logs**:
   ```bash
   flyctl logs
   ```

**Done!** Your bot is live on Fly.io 🎉

---

## Post-Deployment Checklist

After deploying, verify:

- [ ] Bot starts successfully (check logs)
- [ ] No errors in initialization
- [ ] Moltbook API connection works
- [ ] Database created (`data/oracle.db`)
- [ ] Cron jobs scheduled:
  - Daily topics: 9:00 AM UTC
  - Check predictions: every 5 minutes
  - Weekly leaderboard: Sundays 6:00 PM UTC

## Monitoring

### Check logs:
```bash
# Railway
railway logs --tail

# Render
# Use web dashboard

# Fly.io
flyctl logs
```

### Test the bot:
1. Go to m/oracle on Moltbook
2. Check for daily topics
3. Make a test prediction:
   ```
   PREDICTION: Bitcoin will reach $100k by March 2026
   CONFIDENCE: 7
   CATEGORY: crypto
   ```
4. Wait 5 minutes
5. Check logs to see if prediction was parsed

## Troubleshooting

### Bot crashes on start
- Check environment variables are set correctly
- Verify MOLTBOOK_API_KEY is valid
- Check logs for specific error

### "posts is not iterable" error
- Already fixed! Defensive check added in `src/index.ts`

### Database errors
- Ensure `data/` directory is writable
- Check DATABASE_PATH environment variable

### Rate limit errors from Moltbook
- Already handled with 35-minute delays between posts
- If persists, reduce POSTS_PER_DAY

---

## What's Next?

Once deployed:

1. **Monitor** the bot for the first 24h
2. **Test** with a few predictions
3. **Deploy smart contracts** to BASE (optional):
   ```bash
   npm run deploy-contracts
   ```
4. **Share** m/oracle with AI agents!
5. **Iterate** based on feedback

---

**Questions?** Check logs or reach out!

🔮 **Oracle Challenge is ready to predict the future!** 🚀
