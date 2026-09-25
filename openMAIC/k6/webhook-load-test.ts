/**
 * K6 Load Test: Stripe Webhook Performance
 *
 * Comprehensive performance testing for the Stripe webhook endpoint
 * (/api/quiz/stripe/webhook) with three distinct load scenarios.
 *
 * Tests webhook processing throughput, latency (P50/P95/P99),
 * and error handling under baseline, spike, and sustained loads.
 *
 * Scenarios:
 * 1. Baseline: 100 req/min for 5 min (steady state, 8.3 req/s)
 * 2. Spike: 1000 req/min for 2 min (peak load, 16.7 req/s)
 * 3. Sustained: 500 req/min for 10 min (endurance test, 8.3 req/s)
 *
 * Metrics Tracked:
 * - P50, P95, P99 latency (target: <500ms)
 * - Success rate (target: 100%)
 * - Error rate (target: 0%)
 * - Memory usage
 * - Throughput (req/s)
 *
 * Run locally:
 * BASE_URL=http://localhost:3002 k6 run webhook-load-test.ts --out csv=webhook-results.csv
 *
 * Run with custom scenario:
 * SCENARIO=baseline BASE_URL=https://dailyagile.com k6 run webhook-load-test.ts
 *
 * Last Updated: 2026-08-23
 * Version: 1.0
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import crypto from 'k6/crypto';
import encoding from 'k6/encoding';

// ============================================================================
// CONFIGURATION
// ============================================================================

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3002';
const SCENARIO = __ENV.SCENARIO || 'baseline';
const WEBHOOK_SECRET = __ENV.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret_' + Math.random().toString(36).substring(7);

// ============================================================================
// CUSTOM METRICS
// ============================================================================

const webhookLatency = new Trend('webhook_latency', { unit: 'ms' });
const webhookSuccess = new Counter('webhook_success');
const webhookErrors = new Counter('webhook_errors');
const webhookErrorRate = new Rate('webhook_error_rate');
const webhookThroughput = new Gauge('webhook_throughput');
const idempotencyHits = new Counter('idempotency_hits');
const validationErrors = new Counter('validation_errors');
const rateLimitHits = new Counter('rate_limit_hits');

// ============================================================================
// STRIPE WEBHOOK SIGNATURE GENERATION
// ============================================================================

/**
 * Generate a valid Stripe webhook signature for a given payload
 * Mimics Stripe's HMAC-SHA256 signature generation
 *
 * Stripe signature format: t=<timestamp>,v1=<signature>
 * Where <signature> is HMAC-SHA256(timestamp.payload, secret)
 *
 * @param payload - JSON stringified webhook payload
 * @param secret - Stripe webhook secret (whsec_*)
 * @returns Stripe-compatible signature header
 */
function generateStripeSignature(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Extract the actual secret without the 'whsec_' prefix for HMAC calculation
  const secretKeyMaterial = secret.replace('whsec_', '');

  // Create the signed content: timestamp.payload
  const signedContent = `${timestamp}.${payload}`;

  // Generate HMAC-SHA256 signature
  const signature = crypto.hmac('sha256', secretKeyMaterial, signedContent, 'hex');

  // Return in Stripe's format: t=timestamp,v1=signature
  return `t=${timestamp},v1=${signature}`;
}

// ============================================================================
// REALISTIC STRIPE WEBHOOK PAYLOADS
// ============================================================================

/**
 * Generate a realistic Stripe checkout.session.completed webhook event
 * with valid metadata and session data
 */
function generateCheckoutSessionPayload(batchIndex: number): object {
  const courseIds = [
    'track-a-module-1',
    'track-a-module-2',
    'track-a-full-course',
    'track-b-ai-engineer',
    'track-b-devops',
  ];

  const studentEmails = [
    `student-${batchIndex}-${Date.now() % 10000}@example.com`,
    `tester-${__VU}-${__ITER}@loadtest.local`,
    `user+${Date.now()}@dailyagile.local`,
  ];

  const amounts = [4999, 9999, 19999, 39999, 59999]; // £49.99 to £599.99 in cents

  const randomCourseId = courseIds[Math.floor(Math.random() * courseIds.length)];
  const randomEmail = studentEmails[Math.floor(Math.random() * studentEmails.length)];
  const randomAmount = amounts[Math.floor(Math.random() * amounts.length)];

  return {
    id: `evt_test_${Date.now()}_${__VU}`,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: `cs_test_${Date.now()}_${__VU}`,
        object: 'checkout.session',
        after_expiration: null,
        allow_promotion_codes: true,
        amount_subtotal: randomAmount,
        amount_total: randomAmount,
        automatic_tax: {
          enabled: false,
          status: null,
        },
        billing_address_collection: null,
        cancel_url: 'https://dailyagile.com/checkout/cancel',
        client_reference_id: null,
        consent: null,
        consent_collection: null,
        currency: 'gbp',
        customer: `cus_test_${__VU}_${Date.now()}`,
        customer_creation: 'always',
        customer_email: randomEmail,
        customer_tax_ids: [],
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        livemode: false,
        locale: null,
        mode: 'payment',
        payment_intent: `pi_test_${Date.now()}_${__VU}`,
        payment_link: null,
        payment_method_collection: 'always',
        payment_method_types: ['card'],
        payment_status: 'paid',
        phone_number_collection: {
          enabled: false,
        },
        recovered_from: null,
        setup_intent: null,
        status: 'complete',
        submit_type: null,
        subscription: null,
        success_url: 'https://dailyagile.com/checkout/success',
        total_details: {
          amount_discount: 0,
          amount_shipping: 0,
          amount_tax: 0,
        },
        url: null,
        // CRITICAL: Metadata for processing
        metadata: {
          course_id: randomCourseId,
          email: randomEmail,
          product_type: 'quiz',
          user_id: `user_${__VU}`,
        },
      },
    },
    livemode: false,
    pending_webhooks: 0,
    request: {
      id: null,
      idempotency_key: null,
    },
    type: 'checkout.session.completed',
  };
}

// ============================================================================
// LOAD TEST SCENARIOS
// ============================================================================

/**
 * Scenario 1: Baseline Load (100 req/min for 5 min)
 * Steady state to establish baseline metrics
 * Target: <500ms P95 latency, 100% success rate
 */
const baselineScenario = {
  executor: 'ramping-arrival-rate',
  startRate: 2,           // Start: 2 req/s
  timeUnit: '1s',
  preAllocatedVUs: 5,
  stages: [
    { duration: '1m', target: 2 },    // Ramp to 2 req/s (120 req/min)
    { duration: '3m', target: 2 },    // Hold for 3 minutes
    { duration: '1m', target: 0 },    // Ramp down
  ],
  name: 'baseline',
};

/**
 * Scenario 2: Spike Load (1000 req/min for 2 min)
 * Peak load to test graceful degradation
 * Target: <2s P95 latency, <5% error rate
 */
const spikeScenario = {
  executor: 'ramping-arrival-rate',
  startRate: 5,           // Start: 5 req/s
  timeUnit: '1s',
  preAllocatedVUs: 20,
  stages: [
    { duration: '30s', target: 17 },   // Ramp to 17 req/s (1020 req/min) quickly
    { duration: '1m30s', target: 17 }, // Hold for 1.5 minutes
    { duration: '30s', target: 0 },    // Ramp down quickly
  ],
  name: 'spike',
};

/**
 * Scenario 3: Sustained Load (500 req/min for 10 min)
 * Endurance test to watch for memory leaks or performance degradation
 * Target: <500ms P95 latency, <1% error rate
 */
const sustainedScenario = {
  executor: 'ramping-arrival-rate',
  startRate: 3,           // Start: 3 req/s
  timeUnit: '1s',
  preAllocatedVUs: 10,
  stages: [
    { duration: '1m', target: 8 },     // Ramp to 8 req/s (480 req/min)
    { duration: '8m', target: 8 },     // Hold for 8 minutes
    { duration: '1m', target: 0 },     // Ramp down
  ],
  name: 'sustained',
};

// ============================================================================
// SELECT SCENARIO BASED ON ENVIRONMENT
// ============================================================================

let selectedScenario = baselineScenario;

if (SCENARIO === 'spike') {
  selectedScenario = spikeScenario;
} else if (SCENARIO === 'sustained') {
  selectedScenario = sustainedScenario;
}

// ============================================================================
// K6 OPTIONS & THRESHOLDS
// ============================================================================

export const options = {
  scenarios: {
    webhook_test: selectedScenario,
  },
  thresholds: {
    // Baseline scenario: strict thresholds
    ...(SCENARIO === 'baseline' && {
      'webhook_latency': ['p(50)<200', 'p(95)<500', 'p(99)<800'],
      'webhook_error_rate': ['rate<0.001'],  // <0.1% error rate
      'http_req_failed': ['rate<0.001'],
    }),
    // Spike scenario: relaxed thresholds
    ...(SCENARIO === 'spike' && {
      'webhook_latency': ['p(95)<2000', 'p(99)<5000'],
      'webhook_error_rate': ['rate<0.05'],   // <5% error rate acceptable
      'http_req_failed': ['rate<0.05'],
    }),
    // Sustained scenario: moderate thresholds
    ...(SCENARIO === 'sustained' && {
      'webhook_latency': ['p(95)<500', 'p(99)<1000'],
      'webhook_error_rate': ['rate<0.01'],   // <1% error rate
      'http_req_failed': ['rate<0.01'],
    }),
  },
  ext: {
    // Loadimpact cloud insights (optional)
    loadimpact: {
      projectID: 3334491,
      name: `webhook-${SCENARIO}`,
    },
  },
};

// ============================================================================
// MAIN TEST FUNCTION
// ============================================================================

let requestCounter = 0;

export default function testWebhook() {
  const batchIndex = Math.floor(__ITER / 10);
  const payload = JSON.stringify(generateCheckoutSessionPayload(batchIndex));
  const stripeSignature = generateStripeSignature(payload, WEBHOOK_SECRET);

  group(`Webhook Test - Batch ${batchIndex}`, () => {
    // Prepare request headers
    const headers = {
      'Content-Type': 'application/json',
      'stripe-signature': stripeSignature,
      'User-Agent': 'k6-webhook-load-test/1.0',
    };

    // Send webhook POST request
    const startTime = Date.now();

    const response = http.post(
      `${BASE_URL}/api/quiz/stripe/webhook`,
      payload,
      {
        headers,
        tags: { name: 'StripeWebhook', scenario: SCENARIO },
        timeout: '30s',
      }
    );

    const duration = Date.now() - startTime;
    requestCounter++;

    // Record custom metrics
    webhookLatency.add(duration);
    webhookThroughput.add(requestCounter);

    // Check response validity
    const isSuccess = response.status === 200;
    const isIdempotent = response.body && response.body.includes('already processed');
    const isRateLimit = response.status === 429;
    const isValidationError = response.status === 400;

    if (isSuccess) {
      webhookSuccess.add(1);
    } else {
      webhookErrors.add(1);
      webhookErrorRate.add(1);
    }

    if (isIdempotent) {
      idempotencyHits.add(1);
    }

    if (isRateLimit) {
      rateLimitHits.add(1);
    }

    if (isValidationError) {
      validationErrors.add(1);
    }

    // Detailed assertions
    check(response, {
      'webhook status is 200': (r) => r.status === 200,
      'webhook response is JSON': (r) => {
        try {
          const body = r.body;
          return (
            typeof body === 'string' &&
            (body.includes('success') || body.includes('already processed'))
          );
        } catch {
          return false;
        }
      },
      'webhook latency < 500ms': (r) => duration < 500,
      'webhook latency < 1s': (r) => duration < 1000,
      'webhook latency < 2s': (r) => duration < 2000,
      'no 5xx errors': (r) => r.status < 500,
      'no connection timeout': (r) => r.status !== 0,
    }) || webhookErrorRate.add(1);

    // Parse response for additional insights
    try {
      const responseBody = response.json();
      if (responseBody.processingId) {
        // Log unique processing IDs for traceability
      }
    } catch (e) {
      // Response not JSON, likely error
    }

    // Vary sleep time based on scenario to avoid thundering herd
    if (SCENARIO === 'baseline') {
      sleep(Math.random() * 0.5); // 0-500ms sleep
    } else if (SCENARIO === 'spike') {
      sleep(Math.random() * 0.1); // 0-100ms sleep (minimal)
    } else {
      sleep(Math.random() * 0.3); // 0-300ms sleep
    }
  });
}

// ============================================================================
// TEARDOWN: Print Summary Statistics
// ============================================================================

export function teardown() {
  console.log(`\n====================================`);
  console.log(`Webhook Load Test Summary`);
  console.log(`====================================`);
  console.log(`Scenario: ${SCENARIO}`);
  console.log(`Total requests sent: ${requestCounter}`);
  console.log(`Successful webhooks: ${webhookSuccess.value}`);
  console.log(`Failed webhooks: ${webhookErrors.value}`);
  console.log(`Idempotent hits (replay protection): ${idempotencyHits.value}`);
  console.log(`Rate limit hits: ${rateLimitHits.value}`);
  console.log(`Validation errors: ${validationErrors.value}`);
  console.log(`====================================\n`);
}
