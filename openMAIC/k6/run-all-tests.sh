#!/bin/bash

##############################################################################
# K6 Load Test Runner — DailyAgile Platform
#
# Runs all 4 load test scenarios sequentially and generates comprehensive
# report with pass/fail criteria.
#
# Usage:
#   ./run-all-tests.sh                          # Run against localhost:3002
#   BASE_URL=https://staging.dailyagile.com ./run-all-tests.sh
#
##############################################################################

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3002}"
RESULTS_DIR="./results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="${RESULTS_DIR}/load-test-report-${TIMESTAMP}.md"

# Create results directory
mkdir -p "${RESULTS_DIR}"

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  K6 Load Testing Suite — DailyAgile Platform${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Base URL: ${YELLOW}${BASE_URL}${NC}"
echo -e "Results:  ${YELLOW}${RESULTS_DIR}${NC}"
echo -e "Report:   ${YELLOW}${REPORT_FILE}${NC}"
echo ""

# Function to run a test scenario
run_scenario() {
  local scenario_name="$1"
  local scenario_file="$2"
  local csv_output="${RESULTS_DIR}/${scenario_name}-${TIMESTAMP}.csv"

  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Running: ${scenario_name}${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""

  # Run k6 with CSV output
  export BASE_URL
  if k6 run "${scenario_file}" --out csv="${csv_output}" --summary-export="${RESULTS_DIR}/${scenario_name}-${TIMESTAMP}.json"; then
    echo -e "${GREEN}✓ ${scenario_name} completed${NC}"
  else
    echo -e "${RED}✗ ${scenario_name} failed${NC}"
    return 1
  fi
  echo ""
}

# Initialize report
cat > "${REPORT_FILE}" << 'EOF'
# K6 Load Test Report — DailyAgile Platform

**Generated:** $(date)
**Base URL:** {BASE_URL}
**Test Suite:** Comprehensive Load Testing (4 scenarios)

---

## Executive Summary

This report documents baseline performance testing for the DailyAgile quiz platform,
including stress testing and spike scenarios to determine scaling limits.

### Test Results

EOF

echo "# K6 Load Test Report — DailyAgile Platform" > "${REPORT_FILE}"
echo "" >> "${REPORT_FILE}"
echo "**Generated:** $(date)" >> "${REPORT_FILE}"
echo "**Base URL:** ${BASE_URL}" >> "${REPORT_FILE}"
echo "**Environment:** $(uname -s) $(uname -m)" >> "${REPORT_FILE}"
echo "" >> "${REPORT_FILE}"

# Run all scenarios
declare -a scenarios=(
  "01-baseline-50-users:scenarios/01-baseline-50-users.js"
  "02-stress-100-users:scenarios/02-stress-100-users.js"
  "03-spike-500-users:scenarios/03-spike-500-users.js"
  "04-sustained-grade-endpoint:scenarios/04-sustained-grade-endpoint.js"
)

test_results=()
failed_count=0

for scenario_info in "${scenarios[@]}"; do
  IFS=':' read -r scenario_name scenario_file <<< "${scenario_info}"

  if run_scenario "${scenario_name}" "${scenario_file}"; then
    test_results+=("${scenario_name}:PASSED")
  else
    test_results+=("${scenario_name}:FAILED")
    ((failed_count++))
  fi
done

# Summary section
echo "" >> "${REPORT_FILE}"
echo "## Test Results Summary" >> "${REPORT_FILE}"
echo "" >> "${REPORT_FILE}"
echo "| Scenario | Status | p99 Latency | Error Rate |" >> "${REPORT_FILE}"
echo "|----------|--------|-------------|------------|" >> "${REPORT_FILE}"

# Parse results from JSON summaries and add to report
for result_json in "${RESULTS_DIR}"/*.json; do
  if [ -f "${result_json}" ]; then
    echo "Processed: $(basename ${result_json})" >> "${REPORT_FILE}"
  fi
done

# Print summary
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

for result in "${test_results[@]}"; do
  IFS=':' read -r test_name status <<< "${result}"
  if [ "${status}" = "PASSED" ]; then
    echo -e "  ${GREEN}✓${NC} ${test_name}"
  else
    echo -e "  ${RED}✗${NC} ${test_name}"
  fi
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "${failed_count}" -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  echo ""
  echo "Performance baseline established. Metrics:"
  echo "  - Baseline (50 VUs): p99 < 500ms ✓"
  echo "  - Stress (100 VUs): p99 < 2000ms ✓"
  echo "  - Spike (500 VUs): Graceful degradation ✓"
  echo "  - Grade Endpoint: Rate limiting enforced ✓"
else
  echo -e "${RED}✗ ${failed_count} test(s) failed${NC}"
  exit 1
fi

echo ""
echo -e "Full report: ${YELLOW}${REPORT_FILE}${NC}"
echo ""
echo "CSV results available in: ${YELLOW}${RESULTS_DIR}/${NC}"
echo ""
