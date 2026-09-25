#!/bin/bash

##############################################################################
# Test Environment Setup Helper
#
# Sets up the application for load testing by:
# 1. Checking dependencies
# 2. Building the app (if needed)
# 3. Starting dev server in background
# 4. Waiting for app to be ready
#
##############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Setting up test environment...${NC}"
echo ""

# Check for required tools
echo -e "${BLUE}Checking dependencies...${NC}"

for tool in node npm k6; do
  if command -v "$tool" &> /dev/null; then
    version=$($tool --version 2>/dev/null || echo "unknown")
    echo -e "  ${GREEN}✓${NC} $tool ($version)"
  else
    echo -e "  ${RED}✗${NC} $tool (not found)"
    exit 1
  fi
done

echo ""

# Check if app is already running
if curl -s http://localhost:3002 > /dev/null; then
  echo -e "${GREEN}✓ App is already running at http://localhost:3002${NC}"
  exit 0
fi

# Navigate to app directory
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

echo -e "${BLUE}Building application...${NC}"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  pnpm install || npm install
fi

# Build the application
echo "Building..."
pnpm build 2>/dev/null || echo "Build skipped (dev mode)"

# Start the dev server in background
echo -e "${BLUE}Starting dev server...${NC}"
pnpm dev &
DEV_PID=$!

# Wait for app to be ready (max 60 seconds)
echo "Waiting for app to be ready..."
max_attempts=60
attempt=0

while [ $attempt -lt $max_attempts ]; do
  if curl -s http://localhost:3002 > /dev/null; then
    echo -e "${GREEN}✓ App is ready at http://localhost:3002${NC}"
    echo ""
    echo "Dev server PID: $DEV_PID"
    echo "To stop the server later, run: kill $DEV_PID"
    exit 0
  fi

  echo -n "."
  sleep 1
  ((attempt++))
done

echo ""
echo -e "${RED}✗ Timeout waiting for app to start${NC}"
kill $DEV_PID
exit 1
