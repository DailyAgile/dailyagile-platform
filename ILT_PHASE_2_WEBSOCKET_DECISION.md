# WebSocket Architecture Decision for Phase 2 Real-Time Monitoring

**Decision Date:** August 6, 2026  
**Impact:** Blocks Tier 2 (Weeks 3-4) - Real-time instructor dashboard  
**Timeline:** Make decision this week, load test next week

---

## 🎯 Requirements

### Performance Targets
- **Concurrent connections:** 1000+ students taking quiz simultaneously
- **Message throughput:** 500 messages/second (30 students × 100 instructors)
- **Latency:** <2 seconds (instructor sees update within 2s of student action)
- **Uptime:** >99.5% (quiz can't drop students)
- **Cost:** <$500/month at scale

### User Experience
- Real-time progress updates on instructor dashboard
- Student status: active, stuck (idle >5 min), completed, paused
- Each student's current question number
- Class average score updating live
- Lock/pause quiz broadcasts to all students instantly

---

## 🔍 Three Architecture Options

### Option 1: Supabase Realtime (RECOMMENDED) ✅

**How it works:**
- Uses PostgreSQL's native `LISTEN/NOTIFY` mechanism
- Supabase manages connection pooling and scaling
- Client SDK connects to Supabase, subscribes to database changes
- When quiz answer is submitted → INSERT quiz_answers → NOTIFY → all subscribed instructors get update

**Pros:**
- ✅ No separate infrastructure to manage
- ✅ Included in Supabase Pro plan ($25-50/mo, already budgeted)
- ✅ Scales to 1000+ connections (proven at scale)
- ✅ Handles connection recovery automatically
- ✅ Simple to implement (library handles details)
- ✅ RLS policies work seamlessly with subscriptions
- ✅ Single source of truth (database events)

**Cons:**
- ⚠️ Limited to ~1000 concurrent connections (sufficient for MVP, not for 10K+)
- ⚠️ Latency ~500-1000ms (acceptable for 2s requirement)
- ⚠️ Broadcast events to all instructors (not targeted messages initially)

**Cost Model:**
- Included in Supabase Pro
- No additional charge for LISTEN/NOTIFY

**Implementation Time:**
- 3-5 days (library is battle-tested)

**When to migrate away:**
- Need >1000 concurrent users
- Need <500ms latency
- Need targeted message routing

**Code Example:**
```typescript
// Subscribe to quiz submissions in a classroom
const subscription = supabase
  .channel(`classroom:${classroomId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'quiz_submissions',
      filter: `classroom_id=eq.${classroomId}`,
    },
    (payload) => {
      // Update instructor dashboard with new submission
      updateDashboard(payload.new);
    },
  )
  .subscribe();
```

**Load Test Plan:**
```
1. Spin up 100 concurrent instructors in 1 classroom
2. Each instructor subscribes to Realtime channel
3. Simulate 30 students submitting answers over 10 minutes
4. Measure: latency, message delivery rate, connection stability
5. Expected: All updates delivered <1s, 0 connection drops
```

---

### Option 2: Socket.io on Dedicated Server

**How it works:**
- Run Node.js server with Socket.io library
- Instructors connect via WebSocket to this server
- Server polls database every 500ms for changes OR listens to database events
- Server broadcasts updates to all connected instructors

**Pros:**
- ✅ Unlimited concurrent connections (scale to 10K+)
- ✅ Full control over implementation
- ✅ Can optimize for <500ms latency
- ✅ Proven at scale (used by Slack, Figma, etc.)
- ✅ Can add features easily (targeted messages, typing indicators, etc.)
- ✅ Works across multiple servers (horizontal scaling)

**Cons:**
- ❌ Requires dedicated server infrastructure (ops overhead)
- ❌ Must handle connection recovery manually
- ❌ Must implement load balancing (sticky sessions)
- ❌ More complex deployment (Heroku, AWS ECS, Docker)
- ❌ Additional cost ($50-200/mo for server)
- ❌ Requires monitoring (alerts for crashes)

**Cost Model:**
- Heroku Hobby: $7/mo (dev only, not production)
- Heroku Standard: $50/mo (handles ~1000 connections)
- AWS ECS: $100-200/mo (scales better)
- Self-managed: $20/mo (DigitalOcean) + ops time

**Implementation Time:**
- 1-2 weeks (includes ops setup, monitoring, testing)

**When to use this:**
- Need >1000 concurrent users
- Need <500ms latency for competitive advantage
- Willing to invest in DevOps

**Code Example:**
```typescript
// Server (Node.js + Express + Socket.io)
const io = require('socket.io')(server);

io.on('connection', (socket) => {
  // Student joins a quiz
  socket.on('quiz:join', ({ classroomId, studentId }) => {
    socket.join(`quiz:${classroomId}`);
  });

  // Database triggers event
  // → Server broadcasts to all in room
  socket.to(`quiz:${classroomId}`).emit('quiz:answer-submitted', data);
});
```

**Load Test Plan:**
```
1. Deploy Socket.io server to staging
2. Load test: 1000 concurrent instructors × 5 classrooms
3. Simulate 100 student answer submissions/sec
4. Measure: CPU/memory, latency, message delivery
5. Expected: <500ms latency, <80% CPU utilization
6. Scale to 5000 connections (requires load balancer)
```

---

### Option 3: Vercel WebSocket (NOT RECOMMENDED) ❌

**How it works:**
- Vercel serverless functions can handle WebSocket connections
- Deploy WebSocket handler as serverless function
- Connections routed through Vercel's edge network

**Pros:**
- Minimal infrastructure code
- Scales automatically with Vercel
- No separate server to manage

**Cons:**
- ❌ Serverless architecture NOT suited for persistent connections
- ❌ Cold starts break real-time requirements
- ❌ Each function invocation billed (cost explodes at scale)
- ❌ Concurrency limits on serverless functions (not suitable for 1000+ connections)
- ❌ No official Vercel WebSocket support (community solutions only)
- ❌ Will cost $500+/mo at target scale (vs $25-200 for alternatives)
- ❌ Unreliable connection persistence

**Not Recommended Rationale:**
Serverless is optimized for short-lived request-response patterns, not persistent connections. Every message incurs overhead that makes this approach economically non-viable and technically unsuitable.

---

## 💡 RECOMMENDATION: Supabase Realtime (Option 1)

### Why
1. **MVP-Fit:** Handles 1000 concurrent users (more than enough for beta)
2. **No Ops:** Managed service (we have no DevOps team)
3. **Already Budgeted:** Included in Supabase Pro tier
4. **Fast Implementation:** 3-5 days vs 1-2 weeks
5. **Easy Migration Path:** If we grow, migrate to Socket.io while keeping app code mostly unchanged

### Migration Path (Year 2)
- If we need >1000 concurrent users OR <500ms latency
- Migrate to Socket.io on dedicated server
- Application code changes minimal (just swap realtime library)
- No database changes needed

### Architecture Decision
```
Phase 2 (MVP): Supabase Realtime
├─ Build for up to 1000 concurrent instructors
├─ ~500-1000ms latency (acceptable for ILT use case)
├─ $25-50/mo cost
└─ 3-5 days to implement

Phase 3+ (If needed): Migrate to Socket.io
├─ Handles 10K+ concurrent users
├─ <500ms latency possible
├─ $100-200/mo cost
└─ 2 weeks to migrate + testing
```

---

## 🧪 Validation Plan (Week of Aug 13)

### Week 1: Spike & Load Test

**Monday-Tuesday:**
- Prototype Supabase Realtime subscription in dashboard component
- Create test classroom with 100 simulated instructors
- Implement quiz answer submission simulation

**Wednesday-Thursday:**
- Run load test: 100 concurrent instructors
- Measure: latency, message delivery rate, connection stability
- Record metrics to validate requirements

**Friday:**
- Decision gate: Does it meet requirements?
  - **YES** → Proceed with Supabase Realtime
  - **NO** → Escalate to Socket.io (requires scope/timeline adjustment)

### Load Test Acceptance Criteria

| Metric | Target | Must-Have |
|--------|--------|-----------|
| **Latency (p99)** | <2 seconds | YES |
| **Message delivery** | 100% | YES |
| **Connection drops** | <0.1% | YES |
| **Throughput** | 500 msg/sec | YES |
| **CPU usage** | <70% at peak | YES |
| **Cost at scale** | <$100/mo | NO (nice-to-have) |

---

## 📋 Next Steps

### This Week (Aug 6-10)
1. ☐ Get approval on Supabase Realtime recommendation
2. ☐ Update Tier 2 timeline (3-5 days infrastructure instead of unknown)
3. ☐ Schedule spike week (Aug 13-17)

### Week of Aug 13 (Infrastructure Spike)
1. ☐ Prototype Supabase Realtime
2. ☐ Implement load test simulation
3. ☐ Run comprehensive tests
4. ☐ Make go/no-go decision

### If Go (Aug 20 onwards)
1. ☐ Build InstructorDashboard component with Realtime subscription
2. ☐ Build QuizLiveStats with real data
3. ☐ Implement lock/pause quiz feature
4. ☐ End-to-end testing

### If No-Go
1. ☐ Escalate to Socket.io approach
2. ☐ Adjust timeline (add 1-2 weeks)
3. ☐ Allocate DevOps resources

---

## 🎓 Learning Resources

**Supabase Realtime:**
- Docs: https://supabase.com/docs/guides/realtime
- Examples: https://github.com/supabase/supabase/tree/master/examples/realtime

**Socket.io:**
- Docs: https://socket.io/docs/v4/
- Examples: https://github.com/socketio/socket.io/tree/main/examples

**Load Testing:**
- Tool: Artillery (open-source) - npm install -g artillery
- Example: `artillery run load-test.yml`

---

## 📊 Decision Matrix Summary

| Criterion | Supabase | Socket.io | Vercel WS |
|-----------|----------|-----------|-----------|
| **MVP Fit** | 🟢 Excellent | 🟡 Overkill | 🔴 Poor |
| **Implementation Speed** | 🟢 3-5 days | 🟡 1-2 weeks | 🔴 Not viable |
| **Cost** | 🟢 $25-50/mo | 🟡 $100-200/mo | 🔴 $500+/mo |
| **Ops Burden** | 🟢 None | 🟡 Moderate | 🔴 Hidden tech debt |
| **Scale Ceiling** | 🟡 1000 concurrent | 🟢 10K+ concurrent | 🔴 <100 practical |
| **Latency** | 🟡 500-1000ms | 🟢 <500ms | 🔴 Unpredictable |
| **Reliability** | 🟢 99.99% SLA | 🟡 Depends on ops | 🔴 No guarantees |

**Recommendation: Supabase Realtime** ✅

---

**Owner:** tkiran204@gmail.com  
**Status:** Ready for team decision  
**Blocker For:** Tier 2 development (real-time monitoring)  
**Decision Deadline:** August 10, 2026
