#!/bin/bash

# Test Roboflow API with URL-based image input
# Usage: ./test-roboflow-url.sh <image-url>

WORKFLOW_ID="extra-vision-ai"
ROBOFLOW_URL="https://serverless.roboflow.com/purple/workflows/$WORKFLOW_ID"
API_KEY="0Sh2tSQ9KHzMW6swJE8J"

if [ -z "$1" ]; then
    echo "❌ Error: Please provide an image URL"
    echo "Usage: ./test-roboflow-url.sh <image-url>"
    echo ""
    echo "Example:"
    echo "  ./test-roboflow-url.sh https://example.com/image.jpg"
    exit 1
fi

IMAGE_URL="$1"

echo "🔍 Testing Roboflow API with URL..."
echo "🔗 Endpoint: $ROBOFLOW_URL"
echo "🖼️  Image URL: $IMAGE_URL"
echo ""

curl --location "$ROBOFLOW_URL" \
--header 'Content-Type: application/json' \
--data "{
    \"api_key\": \"$API_KEY\",
    \"inputs\": {
        \"image\": {\"type\": \"url\", \"value\": \"$IMAGE_URL\"}
    }
}" | jq '.' 2>/dev/null || curl --location "$ROBOFLOW_URL" \
--header 'Content-Type: application/json' \
--data "{
    \"api_key\": \"$API_KEY\",
    \"inputs\": {
        \"image\": {\"type\": \"url\", \"value\": \"$IMAGE_URL\"}
    }
}"

echo ""

