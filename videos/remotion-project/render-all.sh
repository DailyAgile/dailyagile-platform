#!/bin/bash

# DailyAgile Video Rendering Script
# Renders all 3 tutorial videos in sequence

set -e  # Exit on error

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$PROJECT_DIR/dist"
LOG_FILE="$PROJECT_DIR/render.log"

# Create dist directory if it doesn't exist
mkdir -p "$DIST_DIR"

echo "==================================="
echo "DailyAgile Video Rendering Script"
echo "==================================="
echo "Project: $PROJECT_DIR"
echo "Output: $DIST_DIR"
echo "Start time: $(date)"
echo ""

# Function to render a video
render_video() {
    local composition=$1
    local output_file=$2

    echo "Rendering: $composition"
    echo "Output: $output_file"

    npx remotion render "$PROJECT_DIR/src/Root.tsx" "$composition" \
        --output-format=mp4 \
        --codec=h264 \
        --crf=18 \
        "$output_file"

    # Get file size
    local file_size=$(du -h "$output_file" | cut -f1)
    echo "✓ $composition rendered successfully ($file_size)"
    echo ""
}

# Render all 3 videos
render_video "QuizCreateTutorial" "$DIST_DIR/quiz-create.mp4"
render_video "QuizTakeTutorial" "$DIST_DIR/quiz-take.mp4"
render_video "QuizExtensionTutorial" "$DIST_DIR/quiz-extend.mp4"

echo "==================================="
echo "All videos rendered successfully!"
echo "==================================="
echo ""
echo "Files created:"
ls -lh "$DIST_DIR"/*.mp4
echo ""
echo "End time: $(date)"
echo ""
echo "Next steps:"
echo "1. Review videos in Remotion Studio"
echo "2. Upload to YouTube (unlisted)"
echo "3. Get embed codes from YouTube"
echo "4. Add embed codes to docs/video-embeds.md"
