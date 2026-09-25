#!/bin/bash

################################################################################
# K6 Webhook Load Test Runner
#
# Runs all three webhook load test scenarios sequentially:
# 1. Baseline (100 req/min for 5 min)
# 2. Spike (1000 req/min for 2 min)
# 3. Sustained (500 req/min for 10 min)
#
# Usage:
#   ./run-webhook-tests.sh                    # Use localhost:3002
#   BASE_URL=https://api.example.com ./run-webhook-tests.sh
#   STRIPE_WEBHOOK_SECRET=whsec_xyz ./run-webhook-tests.sh
#
# Generated Files:
#   - webhook-results-baseline.csv
#   - webhook-results-spike.csv
#   - webhook-results-sustained.csv
#   - webhook-test-summary.txt
#
# Requirements:
#   - k6 installed (brew install k6)
#   - Application running at BASE_URL
#   - Valid Stripe webhook secret (or auto-generated)
#
# Last Updated: 2026-08-23
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'  # No Color

# Configuration
BASE_URL=${BASE_URL:-"http://localhost:3002"}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET:-"whsec_test_secret_$(date +%s)"}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Output files
RESULTS_DIR="${SCRIPT_DIR}/results"
BASELINE_CSV="${RESULTS_DIR}/webhook-results-baseline-${TIMESTAMP}.csv"
SPIKE_CSV="${RESULTS_DIR}/webhook-results-spike-${TIMESTAMP}.csv"
SUSTAINED_CSV="${RESULTS_DIR}/webhook-results-sustained-${TIMESTAMP}.csv"
SUMMARY_FILE="${RESULTS_DIR}/webhook-test-summary-${TIMESTAMP}.txt"

# Create results directory
mkdir -p "${RESULTS_DIR}"

# ============================================================================
# FUNCTIONS
# ============================================================================

print_header() {
  echo -e "\n${BLUE}════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}════════════════════════════════════════════════════════${NC}\n"
}

print_info() {
  echo -e "${GREEN}ℹ${NC}  $1"
}

print_success() {
  echo -e "${GREEN}✓${NC}  $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC}  $1"
}

print_error() {
  echo -e "${RED}✗${NC}  $1"
}

check_k6() {
  if ! command -v k6 &> /dev/null; then
    print_error "k6 not found. Install it with: brew install k6"
    exit 1
  fi
  print_success "k6 found: $(k6 version)"
}

check_app_running() {
  print_info "Checking if app is running at ${BASE_URL}..."
  if ! timeout 5 curl -s "${BASE_URL}/api/health" > /dev/null 2>&1; then
    print_warning "App might not be running at ${BASE_URL}"
    print_info "Make sure to run: cd openMAIC && npm run dev"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
  else
    print_success "App is running at ${BASE_URL}"
  fi
}

run_scenario() {
  local scenario=$1
  local output_csv=$2
  local scenario_label=$3

  print_header "Running ${scenario_label} Test"

  print_info "Scenario: ${scenario}"
  print_info "Output: ${output_csv}"
  print_info "Base URL: ${BASE_URL}"
  print_info "Test starting at $(date '+%Y-%m-%d %H:%M:%S')...\n"

  # Run k6 test
  if BASE_URL="${BASE_URL}" \
     SCENARIO="${scenario}" \
     STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET}" \
     k6 run "${SCRIPT_DIR}/webhook-load-test.ts" \
       --out csv="${output_csv}" \
       --quiet \
       --no-usage-report; then
    print_success "Test completed successfully"
  else
    print_error "Test failed with exit code $?"
    return 1
  fi

  # Parse CSV results for summary
  if [ -f "${output_csv}" ]; then
    # Extract key metrics from CSV
    local success_count=$(grep "webhook_success" "${output_csv}" | wc -l)
    local error_count=$(grep "webhook_error" "${output_csv}" | wc -l)
    local latency_p95=$(grep "http_req_duration" "${output_csv}" | tail -1 | cut -d, -f3 || echo "N/A")

    echo ""
    echo "Test Results for ${scenario_label}:" >> "${SUMMARY_FILE}"
    echo "  - CSV: ${output_csv}" >> "${SUMMARY_FILE}"
    echo "  - Requests: $(grep -c "webhook_" "${output_csv}" || echo "N/A")" >> "${SUMMARY_FILE}"
    echo "  - Time: $(date '+%Y-%m-%d %H:%M:%S')" >> "${SUMMARY_FILE}"
    echo "" >> "${SUMMARY_FILE}"

    print_success "Results saved to: ${output_csv}"
  fi
}

generate_summary() {
  print_header "Test Execution Summary"

  echo "Test Results Summary" > "${SUMMARY_FILE}"
  echo "===================" >> "${SUMMARY_FILE}"
  echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')" >> "${SUMMARY_FILE}"
  echo "Base URL: ${BASE_URL}" >> "${SUMMARY_FILE}"
  echo "" >> "${SUMMARY_FILE}"

  echo "Baseline Test:" >> "${SUMMARY_FILE}"
  if [ -f "${BASELINE_CSV}" ]; then
    local baseline_lines=$(wc -l < "${BASELINE_CSV}")
    echo "  ✓ Completed (${baseline_lines} data points)" >> "${SUMMARY_FILE}"
    echo "  - File: ${BASELINE_CSV}" >> "${SUMMARY_FILE}"
  else
    echo "  ✗ Not completed" >> "${SUMMARY_FILE}"
  fi
  echo "" >> "${SUMMARY_FILE}"

  echo "Spike Test:" >> "${SUMMARY_FILE}"
  if [ -f "${SPIKE_CSV}" ]; then
    local spike_lines=$(wc -l < "${SPIKE_CSV}")
    echo "  ✓ Completed (${spike_lines} data points)" >> "${SUMMARY_FILE}"
    echo "  - File: ${SPIKE_CSV}" >> "${SUMMARY_FILE}"
  else
    echo "  ✗ Not completed" >> "${SUMMARY_FILE}"
  fi
  echo "" >> "${SUMMARY_FILE}"

  echo "Sustained Test:" >> "${SUMMARY_FILE}"
  if [ -f "${SUSTAINED_CSV}" ]; then
    local sustained_lines=$(wc -l < "${SUSTAINED_CSV}")
    echo "  ✓ Completed (${sustained_lines} data points)" >> "${SUMMARY_FILE}"
    echo "  - File: ${SUSTAINED_CSV}" >> "${SUMMARY_FILE}"
  else
    echo "  ✗ Not completed" >> "${SUMMARY_FILE}"
  fi
  echo "" >> "${SUMMARY_FILE}"

  # Print to console
  cat "${SUMMARY_FILE}"

  print_success "Summary saved to: ${SUMMARY_FILE}"
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
  print_header "DailyAgile Webhook Load Test Suite"

  print_info "Configuration:"
  echo "  - Base URL: ${BASE_URL}"
  echo "  - Webhook Secret: ${STRIPE_WEBHOOK_SECRET:0:20}..."
  echo "  - Results Directory: ${RESULTS_DIR}"
  echo ""

  # Pre-flight checks
  check_k6
  check_app_running

  print_header "Execution Plan"
  echo "1️⃣  Baseline Test   (100 req/min for 5 min)"
  echo "2️⃣  Spike Test      (1000 req/min for 2 min)"
  echo "3️⃣  Sustained Test  (500 req/min for 10 min)"
  echo ""
  echo "⏱️  Total time: ~20 minutes"
  echo ""
  read -p "Continue? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_error "Test suite cancelled"
    exit 1
  fi

  # Run tests
  START_TIME=$(date +%s)

  # Test 1: Baseline
  if ! run_scenario "baseline" "${BASELINE_CSV}" "Baseline (100 req/min)"; then
    print_error "Baseline test failed"
  fi
  sleep 5

  # Test 2: Spike
  if ! run_scenario "spike" "${SPIKE_CSV}" "Spike (1000 req/min)"; then
    print_error "Spike test failed"
  fi
  sleep 5

  # Test 3: Sustained
  if ! run_scenario "sustained" "${SUSTAINED_CSV}" "Sustained (500 req/min)"; then
    print_error "Sustained test failed"
  fi

  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))

  # Generate summary
  generate_summary

  # Final status
  print_header "Test Suite Complete"
  print_info "Total Duration: $((DURATION / 60)) minutes $((DURATION % 60)) seconds"
  echo ""
  echo "📊 Results Files:"
  echo "  1. ${BASELINE_CSV}"
  echo "  2. ${SPIKE_CSV}"
  echo "  3. ${SUSTAINED_CSV}"
  echo "  4. ${SUMMARY_FILE}"
  echo ""
  echo "📖 Analysis:"
  echo "  - Open CSV files in Excel or Google Sheets for visualization"
  echo "  - Look for webhook_latency metric for performance"
  echo "  - Check webhook_error_rate for reliability"
  echo ""
  echo "🔗 Documentation:"
  echo "  - Read: openMAIC/k6/WEBHOOK_LOAD_TESTING.md"
  echo ""
}

# Run main function
main "$@"
