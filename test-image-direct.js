/**
 * Direct test script for Roboflow API with the specific image
 */

const fs = require('fs');
const path = require('path');

const WORKFLOW_ID = 'extra-vision-ai';
const ROBOFLOW_URL = `https://serverless.roboflow.com/purple/workflows/${WORKFLOW_ID}`;
// API key can be set via environment variable: ROBOFLOW_API_KEY
// Or pass as command line argument: node test-image-direct.js <api-key>
const API_KEY = process.argv[2] || process.env.ROBOFLOW_API_KEY || '0Sh2tSQ9KHzMW6swJE8J';

async function testRoboflowAPI() {
  console.log(`\n🔍 Testing Roboflow API...`);
  console.log(`🔗 Endpoint: ${ROBOFLOW_URL}`);
  console.log(`🔑 API Key: ${API_KEY.substring(0, 8)}...${API_KEY.substring(API_KEY.length - 4)}\n`);

  // Read the image file
  const imageDir = path.join(__dirname, 'assets', 'pov-driving');
  const files = fs.readdirSync(imageDir);
  const imageFile = files.find(f => f.endsWith('.png'));
  
  if (!imageFile) {
    console.error('❌ No PNG file found in assets/pov-driving/');
    process.exit(1);
  }

  const imagePath = path.join(imageDir, imageFile);
  console.log(`📸 Loading image: ${imageFile}`);
  
  const imageBuffer = fs.readFileSync(imagePath);
  const imageSizeKB = (imageBuffer.length / 1024).toFixed(2);
  
  console.log(`✅ Image loaded: ${imageSizeKB} KB`);
  
  // Check if image is too large (Roboflow may have size limits)
  if (imageBuffer.length > 5 * 1024 * 1024) { // 5MB
    console.warn(`⚠️  Warning: Image is large (${imageSizeKB} KB). Roboflow may reject it.`);
    console.warn(`   Consider resizing/compressing the image first.`);
  }
  
  const base64Image = imageBuffer.toString('base64');
  console.log(`📦 Base64 length: ${base64Image.length} characters\n`);

  const requestBody = {
    api_key: API_KEY,
    inputs: {
      image: {
        type: "base64",
        value: base64Image
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
      
      // Provide helpful suggestions based on error
      if (response.status === 500) {
        console.error('\n💡 Suggestions for 500 Internal Server Error:');
        console.error('   1. Image might be too large - try compressing/resizing');
        console.error('   2. Base64 encoding might be invalid');
        console.error('   3. Check Roboflow API status/dashboard');
        console.error(`   4. Image size: ${imageSizeKB} KB, Base64: ${(base64Image.length / 1024).toFixed(2)} KB`);
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

testRoboflowAPI();

