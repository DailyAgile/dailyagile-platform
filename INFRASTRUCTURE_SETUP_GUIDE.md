# DailyAgile Infrastructure Setup — 2 Critical Fixes

**Goal:** Fix API key + Redis in 2 hours, then run Phase 2 testing locally  
**Status:** Setup instructions for local development  
**Time Estimate:** 2 hours total

---

## 🔴 CRITICAL ISSUE #1: Anthropic API Key (30 minutes)

### Problem
- Current: Test/invalid API key in `.env.local`
- Impact: Health endpoint returns 503, AI grading blocked
- Symptom: `curl http://localhost:3002/api/health` shows Claude API "degraded"

### Solution: Get Valid API Key

**Step 1: Get Your API Key**
```bash
# Go to: https://console.anthropic.com/account/keys
# Or follow this direct link:
# https://console.anthropic.com/account/keys

# Copy your API key (starts with: sk-ant-v0-...)
```

**Step 2: Update .env.local**
```bash
# Open your .env.local file
nano /Users/apgo21/dailyagile-platform/openMAIC/.env.local

# Find this line:
ANTHROPIC_API_KEY=sk-ant-v0-old-key

# Replace with your valid key:
ANTHROPIC_API_KEY=sk-ant-v0-xxxxxxxxxxxxx

# Save (Ctrl+X, then Y, then Enter)
```

**Step 3: Verify It Works**
```bash
# Restart local server
cd /Users/apgo21/dailyagile-platform/openMAIC
npm run dev

# In another terminal, test health check:
curl -s http://localhost:3002/api/health | jq '.checks[] | select(.name=="Anthropic Claude API")'

# Expected output:
# {
#   "name": "Anthropic Claude API",
#   "status": "healthy",
#   "latency_ms": 120
# }
```

---

## 🔴 CRITICAL ISSUE #2: Vercel KV Redis (1-2 hours)

### Problem
- Current: `KV_REST_API_URL` and `KV_REST_API_TOKEN` missing
- Impact: Rate limiting falls back to sync mode, login takes 13s instead of 500ms
- Symptom: Slow rate limit checks during login

### Solution: Local Redis Setup (Recommended for Development)

#### Option A: Install Local Redis (Easiest — 30 minutes)

**Step 1: Install Redis via Homebrew**
```bash
# Install Redis
brew install redis

# Start Redis server in background
redis-server --daemonize yes

# Verify it's running
redis-cli ping
# Expected: PONG
```

**Step 2: Update .env.local**
```bash
# Open .env.local
nano /Users/apgo21/dailyagile-platform/openMAIC/.env.local

# Add this line (if not already present):
REDIS_URL=redis://localhost:6379

# Save (Ctrl+X, then Y, then Enter)
```

**Step 3: Test Redis Connection**
```bash
# Restart dev server
cd /Users/apgo21/dailyagile-platform/openMAIC
npm run dev

# In another terminal, test rate limiting:
# Make 15 requests to /api/quiz-grade (should get 429 after 10)
for i in {1..15}; do
  status=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    http://localhost:3002/api/quiz-grade \
    -H "Content-Type: application/json" \
    -d '{"question":"test","answer":"test"}')
  echo "Request $i: HTTP $status"
  sleep 1
done

# Expected output:
# Request 1: HTTP 200
# Request 2: HTTP 200
# ...
# Request 10: HTTP 200
# Request 11: HTTP 429   <-- Rate limited!
# Request 12: HTTP 429
# ...
```

**Step 4: Verify Login Performance**
```bash
# Time a login request (should be < 500ms):
time curl -X POST http://localhost:3002/api/auth/student/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"student@test.com",
    "password":"Test123!"
  }'

# Should see "real 0m0.XXXs" showing < 500ms
```

---

#### Option B: Use Vercel KV (For Production Staging)

If you want to test with Vercel KV before production:

**Step 1: Create Vercel KV Database**
1. Go to: https://vercel.com/dashboard
2. Select DailyAgile project
3. Click **Storage** tab → **Create Database** → **KV**
4. Name: `dailyagile-rate-limit`
5. Region: US / Europe (closest to you)
6. Click **Create**

**Step 2: Get Credentials**
1. Click on created database
2. Click **`.env.local`** button (right side)
3. Copy entire code block:
   ```
   KV_REST_API_URL=https://xxx.kv.vercel.sh
   KV_REST_API_TOKEN=xxx_xxx_xxx
   ```

**Step 3: Add to .env.local**
```bash
# Open .env.local
nano /Users/apgo21/dailyagile-platform/openMAIC/.env.local

# Remove REDIS_URL line if present:
# REDIS_URL=redis://localhost:6379

# Add Vercel KV credentials:
KV_REST_API_URL=https://xxx.kv.vercel.sh
KV_REST_API_TOKEN=xxx_xxx_xxx

# Save (Ctrl+X, then Y, then Enter)
```

**Step 4: Test**
```bash
# Restart dev server and test rate limiting as above
npm run dev

# Test: curl http://localhost:3002/api/health
```

---

## ✅ Verification Checklist

After both fixes, run this verification:

```bash
# 1. Health check (all 3 services should be healthy)
curl -s http://localhost:3002/api/health | jq '.'

# Expected output:
# {
#   "status": "healthy",
#   "checks": [
#     { "name": "Supabase Database", "status": "healthy" },
#     { "name": "Anthropic Claude API", "status": "healthy" },  ← Should be healthy now
#     { "name": "Email Service (Brevo)", "status": "healthy" }
#   ]
# }

# 2. Rate limiting works (should get 429 after 10 requests)
for i in {1..12}; do
  curl -s -o /dev/null -w "Request $i: %{http_code}\n" -X POST \
    http://localhost:3002/api/quiz-grade \
    -H "Content-Type: application/json" \
    -d '{"question":"test","answer":"test"}'
done

# Expected: 200 × 10, then 429 × 2

# 3. Login is fast (< 500ms)
time curl -X POST http://localhost:3002/api/auth/student/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@test.com","password":"Test123!"}'
```

---

## 🚀 Quick Start After Fixes

Once both issues are fixed:

```bash
# 1. Start Redis (if using local Redis)
redis-server --daemonize yes

# 2. Start dev server
cd /Users/apgo21/dailyagile-platform/openMAIC
npm run dev

# 3. In another terminal, begin Phase 2 testing
# (See PHASE_2_LOCAL_TESTING_PLAN.md)
```

---

## 📋 Troubleshooting

### "Redis connection refused"
```bash
# Check if Redis is running:
redis-cli ping

# If not running, start it:
redis-server --daemonize yes

# Check Redis is listening on port 6379:
lsof -i :6379
```

### "Invalid Anthropic API key"
```bash
# Verify your key format (should start with sk-ant-v0-):
echo $ANTHROPIC_API_KEY

# If blank, check .env.local:
grep ANTHROPIC_API_KEY /Users/apgo21/dailyagile-platform/openMAIC/.env.local

# If still wrong, get new key from https://console.anthropic.com/account/keys
```

### "Rate limiting still slow"
```bash
# Verify Redis is connected:
redis-cli PING
# Should return: PONG

# Check if env var is set:
echo $REDIS_URL
# Should return: redis://localhost:6379

# Restart dev server:
cd /Users/apgo21/dailyagile-platform/openMAIC
npm run dev
```

---

## ⏱️ Timeline

| Task | Duration | Status |
|------|----------|--------|
| Get Anthropic API key | 5 min | 1️⃣ |
| Update .env.local | 2 min | 1️⃣ |
| Install Redis | 10 min | 2️⃣ |
| Configure Redis in .env.local | 2 min | 2️⃣ |
| Verify both fixes | 10 min | ✅ |
| **TOTAL** | **30 min** | Ready for testing |

---

## Next Step

Once you've completed these fixes and verified both work, proceed to:
**PHASE_2_LOCAL_TESTING_PLAN.md** for comprehensive local testing before staging deployment.

