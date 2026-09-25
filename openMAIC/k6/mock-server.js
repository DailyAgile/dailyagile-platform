#!/usr/bin/env node

/**
 * Mock Server for K6 Load Testing
 *
 * Simulates the DailyAgile Quiz API without requiring the full Next.js app.
 * Provides realistic latency and rate limiting behavior.
 *
 * Usage:
 *   node mock-server.js           # Start on port 3000
 *   node mock-server.js --port 3002  # Custom port
 *
 * Then run k6 tests:
 *   BASE_URL=http://localhost:3000 k6 run scenarios/01-baseline-50-users.js
 */

const http = require('http');
const url = require('url');

// Configuration
const PORT = process.argv[2] === '--port' ? parseInt(process.argv[3]) : 3000;
const RATE_LIMIT = {
  max: 10,
  windowMs: 60000, // 1 minute
};

// In-memory rate limiting store
const rateLimitStore = new Map();

// Simulated latencies (in ms)
const LATENCIES = {
  submitAnswer: { min: 20, max: 150 },
  gradeShortAnswer: { min: 500, max: 3000 }, // Claude API latency
  gradeEssay: { min: 800, max: 4000 },
  gradeCode: { min: 1200, max: 5000 },
};

/**
 * Simulate realistic latency
 */
function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Check rate limit for client IP
 */
function checkRateLimit(clientIp) {
  const now = Date.now();
  const key = `rate-limit:${clientIp}`;

  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { count: 0, resetTime: now + RATE_LIMIT.windowMs });
  }

  const record = rateLimitStore.get(key);

  // Reset if window expired
  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + RATE_LIMIT.windowMs;
  }

  record.count++;

  return {
    allowed: record.count <= RATE_LIMIT.max,
    remaining: Math.max(0, RATE_LIMIT.max - record.count),
    retryAfter: Math.ceil((record.resetTime - now) / 1000),
  };
}

/**
 * Get CSRF token from request cookies or generate one
 */
function getCSRFToken(req) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/csrf-token=([^;]+)/);
  if (match) {
    return match[1];
  }
  // Generate a new token
  return 'csrf-' + Math.random().toString(36).substring(7);
}

/**
 * Parse request body
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

/**
 * Send JSON response
 */
function sendJSON(res, statusCode, data, headers = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
    ...headers,
  });
  res.end(JSON.stringify(data));
}

/**
 * Request handler
 */
async function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
    });
    res.end();
    return;
  }

  try {
    // GET / - Return homepage (for CSRF token setup)
    if (pathname === '/' && method === 'GET') {
      const csrfToken = getCSRFToken(req);
      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Set-Cookie': `csrf-token=${csrfToken}; Path=/; HttpOnly; SameSite=Strict`,
      });
      res.end('<html><body>DailyAgile Mock Server - Ready for Load Testing</body></html>');
      return;
    }

    // POST /api/student/quiz/submit-answer
    if (pathname === '/api/student/quiz/submit-answer' && method === 'POST') {
      const body = await parseBody(req);

      // Simulate processing delay
      await new Promise((resolve) =>
        setTimeout(resolve, randomDelay(LATENCIES.submitAnswer.min, LATENCIES.submitAnswer.max))
      );

      sendJSON(res, 200, {
        success: true,
        is_correct: Math.random() > 0.5,
        message: 'Answer submitted',
      });
      return;
    }

    // POST /api/quiz-grade
    if (pathname === '/api/quiz-grade' && method === 'POST') {
      const body = await parseBody(req);
      const rateLimit = checkRateLimit(clientIp);

      if (!rateLimit.allowed) {
        sendJSON(
          res,
          429,
          {
            error: 'RATE_LIMITED',
            message: `Rate limit exceeded. Max ${RATE_LIMIT.max} requests per minute`,
            retryAfterSeconds: rateLimit.retryAfter,
          },
          {
            'Retry-After': rateLimit.retryAfter.toString(),
          }
        );
        return;
      }

      // Determine latency based on question type
      const questionType = body.questionType || 'short_answer';
      let delay = LATENCIES.gradeShortAnswer;

      if (questionType === 'essay') {
        delay = LATENCIES.gradeEssay;
      } else if (questionType === 'code') {
        delay = LATENCIES.gradeCode;
      }

      // Simulate Claude API latency
      await new Promise((resolve) => setTimeout(resolve, randomDelay(delay.min, delay.max)));

      // Return grading result
      sendJSON(res, 200, {
        score: Math.floor(Math.random() * (body.points || 10)) + 1,
        comment: 'Good attempt. Consider reviewing the key concepts.',
        details: {
          rubricAlignment: 0.75,
          clarity: 0.8,
          accuracy: 0.85,
        },
      });
      return;
    }

    // 404 - Not found
    sendJSON(res, 404, {
      error: 'NOT_FOUND',
      message: `Endpoint ${pathname} not found`,
    });
  } catch (error) {
    console.error('Error handling request:', error);
    sendJSON(res, 500, {
      error: 'INTERNAL_ERROR',
      message: error.message,
    });
  }
}

// Create and start server
const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║          K6 Mock Server — DailyAgile Platform              ║
╚════════════════════════════════════════════════════════════╝

📍 Server running at: http://localhost:${PORT}

✓ POST /api/student/quiz/submit-answer (${LATENCIES.submitAnswer.min}-${LATENCIES.submitAnswer.max}ms)
✓ POST /api/quiz-grade (${LATENCIES.gradeShortAnswer.min}-${LATENCIES.gradeShortAnswer.max}ms)

📊 Rate Limiting: ${RATE_LIMIT.max} requests per ${RATE_LIMIT.windowMs / 1000}s

🚀 Run k6 tests:

  BASE_URL=http://localhost:${PORT} k6 run scenarios/01-baseline-50-users.js

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
});
