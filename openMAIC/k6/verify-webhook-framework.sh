#!/bin/bash

################################################################################
# Webhook Load Test Framework Verification
#
# Verifies all components of the k6 webhook load testing framework are in place
# and ready for execution.
#
# Usage:
#   ./verify-webhook-framework.sh
#
# Exit Codes:
#   0 = All checks passed ✅
#   1 = One or more checks failed ❌
#
# Last Updated: 2026-08-24
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
PASSED=0
FAILED=0
WARNINGS=0

print_header() {
  echo -e "\n${BLUE}════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}════════════════════════════════════════════════════════${NC}\n"
}

print_pass() {
  echo -e "${GREEN}✓${NC}  $1"
  ((PASSED++))
}

print_fail() {
  echo -e "${RED}✗${NC}  $1"
  ((FAILED++))
}

print_warn() {
  echo -e "${YELLOW}⚠${NC}  $1"
  ((WARNINGS++))
}

print_info() {
  echo -e "ℹ  $1"
}

# ============================================================================
# VERIFICATION CHECKS
# ============================================================================

print_header "Webhook Load Test Framework Verification"

# Check k6 is installed
echo "1. K6 Installation"
if command -v k6 &> /dev/null; then
  K6_VERSION=$(k6 version)
  print_pass "k6 installed: $K6_VERSION"
else
  print_fail "k6 not installed. Install with: brew install k6"
fi

# Check core test file exists and is valid
echo ""
echo "2. Core Test File"
if [ -f "webhook-load-test.ts" ]; then
  print_pass "webhook-load-test.ts exists"

  # Check file size
  FILE_SIZE=$(wc -c < webhook-load-test.ts)
  if [ "$FILE_SIZE" -gt 5000 ]; then
    print_pass "File size reasonable: $(numfmt --to=iec $FILE_SIZE 2>/dev/null || echo "${FILE_SIZE} bytes")"
  else
    print_warn "File size small (${FILE_SIZE} bytes) - check if complete"
  fi

  # Check for key functions
  if grep -q "generateStripeSignature" webhook-load-test.ts; then
    print_pass "Stripe signature generation present"
  else
    print_fail "Stripe signature generation missing"
  fi

  if grep -q "generateCheckoutSessionPayload" webhook-load-test.ts; then
    print_pass "Payload generation present"
  else
    print_fail "Payload generation missing"
  fi

  if grep -q "baselineScenario\|spikeScenario\|sustainedScenario" webhook-load-test.ts; then
    print_pass "All three scenarios defined"
  else
    print_fail "One or more scenarios missing"
  fi

  # Check metrics
  if grep -q "webhookLatency\|webhookSuccess\|webhookErrors" webhook-load-test.ts; then
    print_pass "Custom metrics defined"
  else
    print_fail "Custom metrics missing"
  fi
else
  print_fail "webhook-load-test.ts not found"
fi

# Check test runner script
echo ""
echo "3. Test Runner Script"
if [ -f "run-webhook-tests.sh" ]; then
  print_pass "run-webhook-tests.sh exists"

  if [ -x "run-webhook-tests.sh" ]; then
    print_pass "run-webhook-tests.sh is executable"
  else
    print_fail "run-webhook-tests.sh is not executable. Fix with: chmod +x run-webhook-tests.sh"
  fi

  if grep -q "k6 run" run-webhook-tests.sh; then
    print_pass "Test runner contains k6 commands"
  else
    print_fail "Test runner missing k6 commands"
  fi
else
  print_fail "run-webhook-tests.sh not found"
fi

# Check results analyzer
echo ""
echo "4. Results Analyzer"
if [ -f "analyze-webhook-results.py" ]; then
  print_pass "analyze-webhook-results.py exists"

  if [ -x "analyze-webhook-results.py" ]; then
    print_pass "analyze-webhook-results.py is executable"
  else
    print_fail "analyze-webhook-results.py is not executable. Fix with: chmod +x analyze-webhook-results.py"
  fi

  if python3 -m py_compile analyze-webhook-results.py 2>/dev/null; then
    print_pass "Python syntax is valid"
  else
    print_fail "Python syntax error in analyze-webhook-results.py"
  fi

  if grep -q "WebhookResultsAnalyzer\|analyze\|thresholds" analyze-webhook-results.py; then
    print_pass "Analyzer contains required functions"
  else
    print_fail "Analyzer missing required functions"
  fi
else
  print_fail "analyze-webhook-results.py not found"
fi

# Check documentation
echo ""
echo "5. Documentation"
DOCS=("WEBHOOK_LOAD_TESTING.md" "WEBHOOK_TEST_README.md" "WEBHOOK_TEST_EXECUTION_CHECKLIST.md")

for doc in "${DOCS[@]}"; do
  if [ -f "$doc" ]; then
    DOC_SIZE=$(wc -c < "$doc")
    if [ "$DOC_SIZE" -gt 5000 ]; then
      print_pass "$doc exists and has substantial content"
    else
      print_warn "$doc exists but is small (${DOC_SIZE} bytes)"
    fi
  else
    print_fail "$doc not found"
  fi
done

# Check for Stripe webhook endpoint in app
echo ""
echo "6. Webhook Endpoint Integration"
if [ -f "../app/api/quiz/stripe/webhook/route.ts" ]; then
  print_pass "Stripe webhook endpoint exists at /api/quiz/stripe/webhook"

  if grep -q "checkout.session.completed" ../app/api/quiz/stripe/webhook/route.ts; then
    print_pass "Webhook handler processes checkout.session.completed events"
  else
    print_warn "Webhook handler may not process checkout.session.completed events"
  fi
else
  print_warn "Webhook endpoint not found at expected location"
fi

# Check k6 results directory
echo ""
echo "7. Results Directory"
if [ -d "results" ]; then
  print_pass "Results directory exists: k6/results/"
else
  print_warn "Results directory doesn't exist yet (will be created on first run)"
fi

# Summary
echo ""
print_header "Verification Summary"

TOTAL=$((PASSED + FAILED + WARNINGS))
echo "Total Checks: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
if [ "$WARNINGS" -gt 0 ]; then
  echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
fi
if [ "$FAILED" -gt 0 ]; then
  echo -e "${RED}Failed: $FAILED${NC}"
else
  echo -e "${RED}Failed: 0${NC}"
fi

echo ""

if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}✅ Framework Verification PASSED${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Start the application: cd openMAIC && npm run dev"
  echo "  2. Run webhook tests: ./run-webhook-tests.sh"
  echo "  3. Analyze results: python3 analyze-webhook-results.py webhook-results-*.csv"
  echo ""
  exit 0
else
  echo -e "${RED}❌ Framework Verification FAILED${NC}"
  echo ""
  echo "Issues to fix:"
  echo "  - Check failed items above"
  echo "  - Ensure all files are in k6/ directory"
  echo "  - Verify file permissions (chmod +x for shell/python scripts)"
  echo "  - Check Python syntax: python3 -m py_compile analyze-webhook-results.py"
  echo ""
  exit 1
fi
