# Webhook Error Handling - Verification Checklist

**Date:** 2026-08-23  
**Purpose:** Verify complete implementation of error handling & idempotency system  
**Estimated Time:** 30 minutes

## Phase 1: Code Review ✅ (5 minutes)

- [ ] **error-classification.ts exists**
  ```bash
  test -f openMAIC/lib/webhook/error-classification.ts && echo "✓ Found"
  ```
  - [ ] ErrorClass enum defined (TRANSIENT, PERMANENT, IDEMPOTENT)
  - [ ] ErrorClassifier class with classify() method
  - [ ] Pattern matching for 20+ error types
  - [ ] Global singleton instance exported

- [ ] **idempotency-manager.ts exists**
  ```bash
  test -f openMAIC/lib/webhook/idempotency-manager.ts && echo "✓ Found"
  ```
  - [ ] IdempotencyManager class defined
  - [ ] checkIdempotency() method
  - [ ] markAsProcessing() method
  - [ ] markAsSucceeded() method
  - [ ] markAsFailed() method

- [ ] **stripe-webhook-processor.ts exists**
  ```bash
  test -f openMAIC/lib/webhook/stripe-webhook-processor.ts && echo "✓ Found"
  ```
  - [ ] StripeWebhookProcessor class
  - [ ] process() method (main entry point)
  - [ ] processCheckoutSessionCompleted() method
  - [ ] Factory function createStripeWebhookProcessor()

## Phase 2: Database Schema ✅ (5 minutes)

- [ ] **Migration 032 exists**
  ```bash
  test -f openMAIC/supabase/migrations/032_webhook_error_handling_and_idempotency.sql && echo "✓ Found"
  ```
  - [ ] 411+ lines of SQL
  - [ ] Check file includes:
    ```bash
    grep -c "webhook_processing" openMAIC/supabase/migrations/032_* | grep -q "[1-9]" && echo "✓ webhook_processing table"
    grep -c "webhook_deadletter" openMAIC/supabase/migrations/032_* | grep -q "[1-9]" && echo "✓ webhook_deadletter table"
    grep -c "stripe_transaction_idempotency" openMAIC/supabase/migrations/032_* | grep -q "[1-9]" && echo "✓ stripe_transaction_idempotency table"
    ```

- [ ] **Verify table structure (after running migration)**
  ```sql
  -- In Supabase SQL editor:
  SELECT tablename FROM pg_tables WHERE tablename LIKE 'webhook%' ORDER BY tablename;
  -- Should return:
  -- webhook_deadletter
  -- webhook_processing
  ```

- [ ] **Verify indexes created**
  ```sql
  SELECT indexname FROM pg_indexes WHERE tablename = 'webhook_processing';
  -- Should have ~5 indexes including external_id unique index
  ```

- [ ] **Verify functions created**
  ```sql
  SELECT routine_name FROM information_schema.routines 
  WHERE routine_name LIKE 'check_webhook%' OR routine_name LIKE 'mark_webhook%';
  -- Should return: check_webhook_idempotency, mark_webhook_processing, etc.
  ```

## Phase 3: Test Suite ✅ (5 minutes)

- [ ] **Test file exists**
  ```bash
  test -f openMAIC/lib/webhook/__tests__/error-classification.test.ts && echo "✓ Found"
  ```

- [ ] **Run tests (requires npm)**
  ```bash
  cd openMAIC
  npm test -- lib/webhook/__tests__/error-classification.test.ts 2>&1 | tee /tmp/test-output.txt
  ```

- [ ] **Verify test results**
  ```bash
  grep -c "passing" /tmp/test-output.txt || grep -c "✓" /tmp/test-output.txt
  # Should show: 12 tests passing
  ```

- [ ] **Test coverage includes:**
  - [ ] Transient error classification (ECONNREFUSED)
  - [ ] Permanent error classification (Missing email)
  - [ ] Idempotent error classification (duplicate key)
  - [ ] Retry exhaustion
  - [ ] Unknown error handling

## Phase 4: Documentation ✅ (5 minutes)

- [ ] **Full documentation exists**
  ```bash
  test -f openMAIC/lib/webhook/WEBHOOK_ERROR_HANDLING.md && echo "✓ Found"
  ```
  - [ ] Architecture section
  - [ ] Error classification table
  - [ ] Idempotency implementation
  - [ ] Usage examples
  - [ ] Monitoring guide

- [ ] **Quick reference exists**
  ```bash
  test -f openMAIC/lib/webhook/QUICK_REFERENCE.md && echo "✓ Found"
  ```
  - [ ] TL;DR section
  - [ ] Quick decision tree
  - [ ] Code templates
  - [ ] Database queries

- [ ] **Implementation summary exists**
  ```bash
  test -f WEBHOOK_IMPLEMENTATION_SUMMARY.md && echo "✓ Found"
  ```
  - [ ] Overview section
  - [ ] Files created list
  - [ ] Architecture diagram
  - [ ] Deployment instructions

## Phase 5: Integration Test (Manual) ⚠️ (10 minutes)

**Prerequisite:** Stripe CLI and local environment running

- [ ] **Start Stripe CLI webhook forwarder**
  ```bash
  stripe listen --forward-to localhost:3000/api/quiz/stripe/webhook
  # Should output: Ready! Your webhook signing secret is: whsec_xxx
  ```

- [ ] **Export webhook secret to environment**
  ```bash
  export STRIPE_WEBHOOK_SECRET="whsec_xxx"  # from above
  ```

- [ ] **Start local development server**
  ```bash
  cd openMAIC
  npm run dev
  # Should start on http://localhost:3000
  ```

- [ ] **Trigger test webhook**
  ```bash
  stripe trigger payment_intent.succeeded
  # Output should show: Ready to process webhooks!
  ```

- [ ] **Check webhook was processed**
  ```sql
  -- In Supabase SQL editor:
  SELECT status, error_classification 
  FROM webhook_processing 
  ORDER BY created_at DESC LIMIT 1;
  -- Should show: status='succeeded' (or 'failed' if no valid metadata)
  ```

- [ ] **Check logs show processing**
  ```bash
  # In terminal with dev server, should see:
  # [INFO] Webhook processing complete: {...}
  # or
  # [ERROR] Webhook processing failed: {...}
  ```

## Phase 6: Error Classification Validation ✅ (5 minutes)

Create test errors and verify classification:

```typescript
// In Node REPL or test file:
import { ErrorClassifier } from './lib/webhook/error-classification';

const classifier = new ErrorClassifier();

// Test 1: Transient error
const transient = classifier.classify(new Error('ECONNREFUSED'), { attemptNumber: 1 });
console.assert(transient.classification === 'transient', '✗ Transient classification failed');
console.assert(transient.httpStatus === 500, '✗ HTTP 500 for transient failed');

// Test 2: Permanent error
const permanent = classifier.classify(new Error('Missing email'), { attemptNumber: 1 });
console.assert(permanent.classification === 'permanent', '✗ Permanent classification failed');
console.assert(permanent.httpStatus === 200, '✗ HTTP 200 for permanent failed');

// Test 3: Idempotent error
const idempotent = classifier.classify(new Error('Unique constraint violation'), { attemptNumber: 1 });
console.assert(idempotent.classification === 'idempotent', '✗ Idempotent classification failed');
console.assert(idempotent.httpStatus === 200, '✗ HTTP 200 for idempotent failed');

console.log('✓ All classification tests passed');
```

**Run verification:**
```bash
cd openMAIC
node -e "$(cat above test code)"
```

## Phase 7: Idempotency Test ✅ (5 minutes)

Verify that duplicate webhooks are handled correctly:

```sql
-- Setup: Create a test webhook record
INSERT INTO webhook_processing (
  external_id,
  source,
  event_type,
  status,
  payload
) VALUES (
  'evt_test_duplicate_' || NOW()::text,
  'stripe',
  'checkout.session.completed',
  'succeeded',
  '{"test": "data"}'::jsonb
);

-- Get the external_id
SELECT external_id INTO @test_id FROM webhook_processing 
WHERE source='stripe' ORDER BY created_at DESC LIMIT 1;

-- Try to insert same external_id again (should fail uniquely)
INSERT INTO webhook_processing (
  external_id,
  source,
  event_type,
  status,
  payload
) VALUES (
  @test_id,
  'stripe',
  'checkout.session.completed',
  'processing',
  '{"test": "data2"}'::jsonb
);
-- Should get: ERROR: duplicate key value violates unique constraint

-- Verify unique index prevents duplicates
SELECT COUNT(*) FROM pg_indexes 
WHERE tablename = 'webhook_processing' 
AND indexname LIKE '%external_id%unique%';
-- Should return: 1
```

## Phase 8: Performance Test ✅ (5 minutes)

Verify O(1) time complexity:

```sql
-- Test: Run 100 sequential idempotency checks
DO $$
DECLARE
  v_start TIMESTAMP := NOW();
  v_result RECORD;
  i INT := 0;
BEGIN
  FOR i IN 1..100 LOOP
    -- Simulate check_webhook_idempotency call
    SELECT (wp.id IS NOT NULL) as is_processed
    FROM webhook_processing wp
    WHERE wp.external_id = 'evt_' || i::text
    INTO v_result;
  END LOOP;
  
  RAISE NOTICE 'Completed 100 idempotency checks in % ms',
    EXTRACT(MILLISECOND FROM (NOW() - v_start));
END $$;
-- Should complete in <100ms (O(1) per check)
```

## Phase 9: Race Condition Test ⚠️ (5 minutes - Advanced)

**Requires:** pgbench or similar load testing tool

```bash
# Simulate two processes trying to process same webhook
# Run in two terminals simultaneously:

# Terminal 1:
psql $DATABASE_URL -c "
INSERT INTO webhook_processing (external_id, source, event_type, status, payload)
VALUES ('evt_race_test', 'stripe', 'checkout.session.completed', 'processing', '{}'::jsonb)
ON CONFLICT (external_id) DO UPDATE SET attempt_number = attempt_number + 1;
"

# Terminal 2 (simultaneously):
psql $DATABASE_URL -c "
INSERT INTO webhook_processing (external_id, source, event_type, status, payload)
VALUES ('evt_race_test', 'stripe', 'checkout.session.completed', 'processing', '{}'::jsonb)
ON CONFLICT (external_id) DO UPDATE SET attempt_number = attempt_number + 1;
"

# Result: Both complete successfully, one inserts, one updates (no duplicates)
# Verify:
SELECT external_id, attempt_number FROM webhook_processing 
WHERE external_id = 'evt_race_test';
# Should show: 1 row with attempt_number = 2 (one insert + one update)
```

## Phase 10: Regression Test ✅ (5 minutes)

Verify existing webhook handler still works:

- [ ] **Original handler still functions**
  ```bash
  # The route handler should still process checkout.session.completed
  # Test by triggering webhook via Stripe CLI as in Phase 5
  ```

- [ ] **Non-quiz products are skipped**
  ```bash
  # Trigger webhook with product_type != 'quiz'
  # Should return 200 with 'success: true' but not create billing record
  ```

- [ ] **Rate limiting still works**
  ```bash
  # Trigger 100 webhooks from same email within 1 minute
  # Should get 429 after limit exceeded
  ```

- [ ] **Signature validation still works**
  ```bash
  # Send webhook with invalid signature
  # Should get 401 Unauthorized
  ```

## Phase 11: Monitoring Setup ✅ (5 minutes)

- [ ] **Query to monitor webhook status**
  ```sql
  SELECT 
    status,
    COUNT(*) as count,
    MAX(created_at) as latest
  FROM webhook_processing
  WHERE created_at > NOW() - INTERVAL '1 hour'
  GROUP BY status;
  ```

- [ ] **Query to identify failures**
  ```sql
  SELECT 
    external_id,
    error_classification,
    last_error,
    attempt_number
  FROM webhook_processing
  WHERE status = 'failed'
  ORDER BY created_at DESC
  LIMIT 10;
  ```

- [ ] **Query to find deadletter**
  ```sql
  SELECT 
    wp.external_id,
    wp.last_error,
    wd.error_summary,
    wd.status
  FROM webhook_deadletter wd
  JOIN webhook_processing wp ON wp.id = wd.webhook_processing_id
  WHERE wd.status = 'unreviewed'
  ORDER BY wd.created_at DESC;
  ```

## Phase 12: Documentation Review ✅ (5 minutes)

- [ ] **QUICK_REFERENCE.md is clear and concise**
  - [ ] TL;DR section fits on 1 screen
  - [ ] Error decision tree is understandable
  - [ ] Code examples are copy-paste ready

- [ ] **WEBHOOK_ERROR_HANDLING.md is complete**
  - [ ] Architecture section explains flow
  - [ ] Database schema is documented
  - [ ] Usage examples provided
  - [ ] Troubleshooting section covers common issues

- [ ] **README/docs linked in main project**
  - [ ] Team wiki updated
  - [ ] Runbook created for manual replay
  - [ ] Alert thresholds documented

## Final Sign-Off

- [ ] All 12 phases completed
- [ ] No critical issues found
- [ ] Team trained on error handling
- [ ] Monitoring configured
- [ ] Ready for production deployment

**Sign-Off Date:** ___________  
**Reviewed By:** ___________  
**Status:** 🟢 Ready for Deployment

## Troubleshooting This Checklist

### Issue: Tests don't run
**Solution:** Ensure Jest is installed: `npm install --save-dev jest @types/jest`

### Issue: Database migration fails
**Solution:** Check Supabase migration logs: `supabase migration list`

### Issue: Stripe CLI not forwarding
**Solution:** Run `stripe listen` again and copy new signing secret to .env.local

### Issue: Local server won't start
**Solution:** Check port 3000 is free: `lsof -i :3000`

### Issue: Tests pass but webhook handler throws
**Solution:** Ensure lib/webhook imports are correct: `grep -r "import.*ErrorClassifier" openMAIC/lib/`

---

**Last Updated:** 2026-08-23  
**Estimated Total Time:** 30 minutes  
**Difficulty Level:** Intermediate  
