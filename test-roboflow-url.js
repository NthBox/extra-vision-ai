/**
 * Test Roboflow API with URL-based image input
 * Usage: node test-roboflow-url.js <image-url> [api-key]
 */

const WORKFLOW_ID = 'extra-vision-ai';
const ROBOFLOW_URL = `https://serverless.roboflow.com/purple/workflows/${WORKFLOW_ID}`;
const API_KEY = process.argv[3] || process.env.ROBOFLOW_API_KEY || '0Sh2tSQ9KHzMW6swJE8J';

async function testRoboflowAPI(imageUrl) {
  console.log(`\n🔍 Testing Roboflow API with URL...`);
  console.log(`🔗 Endpoint: ${ROBOFLOW_URL}`);
  console.log(`🖼️  Image URL: ${imageUrl}`);
  console.log(`🔑 API Key: ${API_KEY.substring(0, 8)}...${API_KEY.substring(API_KEY.length - 4)}\n`);

  const requestBody = {
    api_key: API_KEY,
    inputs: {
      image: {
        type: "url",
        value: imageUrl
      }
    }
  };

  try {
    console.log('📤 Sending request to Roboflow...');
    const startTime = Date.now();
    
    const response = await fetch(ROBOFLOW_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`\n📊 Response Status: ${response.status} ${response.statusText}`);
    console.log(`⏱️  Request Duration: ${duration}ms\n`);

    let result;
    const responseText = await response.text();
    
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Failed to parse JSON response:');
      console.error('Raw response:', responseText.substring(0, 500));
      return;
    }

    if (!response.ok) {
      console.error('❌ Error Response:');
      console.error(JSON.stringify(result, null, 2));
      
      if (response.status === 500) {
        console.error('\n💡 Suggestions for 500 Internal Server Error:');
        console.error('   1. Image URL might be inaccessible or invalid');
        console.error('   2. Image might be too large');
        console.error('   3. Check if the URL is publicly accessible');
        console.error('   4. Verify the image format is supported (JPEG, PNG)');
      }
      return;
    }

    console.log('✅ Success! Full Response:');
    console.log(JSON.stringify(result, null, 2));

    // Try to extract and display detections if available
    if (result.outputs && result.outputs.length > 0) {
      const output = result.outputs[0];
      const predictions = 
        output.predictions?.predictions ||
        output.output?.predictions ||
        output.predictions ||
        [];

      if (predictions.length > 0) {
        console.log(`\n🎯 Found ${predictions.length} detections:`);
        predictions.forEach((pred, idx) => {
          const label = pred.class || pred.label || 'Unknown';
          const confidence = (pred.confidence || pred.score || 0).toFixed(2);
          const bbox = pred.bbox || pred;
          console.log(`  ${idx + 1}. ${label} (confidence: ${confidence})`);
          if (bbox && (bbox.x || bbox[0])) {
            console.log(`     Location: x=${bbox.x || bbox[0]}, y=${bbox.y || bbox[1]}, w=${bbox.width || bbox[2]}, h=${bbox.height || bbox[3]}`);
          }
        });
      } else {
        console.log('\n⚠️  No detections found in the response.');
      }
    } else {
      console.log('\n⚠️  Response structure unexpected. Check the full response above.');
    }

  } catch (error) {
    console.error('❌ Request failed:');
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
Usage:
  node test-roboflow-url.js <image-url> [api-key]

Examples:
  node test-roboflow-url.js https://example.com/image.jpg
  node test-roboflow-url.js https://example.com/image.jpg YOUR_API_KEY
  ROBOFLOW_API_KEY=YOUR_API_KEY node test-roboflow-url.js https://example.com/image.jpg
  `);
  process.exit(1);
}

testRoboflowAPI(args[0]);

