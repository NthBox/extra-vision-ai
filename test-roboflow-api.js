/**
 * Test script for Roboflow API
 * Usage:
 *   node test-roboflow-api.js <image-url>
 *   node test-roboflow-api.js --base64 <base64-string>
 *   node test-roboflow-api.js --file <path-to-image>
 */

const fs = require('fs');
const path = require('path');

const WORKFLOW_ID = 'extra-vision-ai';
const ROBOFLOW_URL = `https://serverless.roboflow.com/purple/workflows/${WORKFLOW_ID}`;
const API_KEY = '0Sh2tSQ9KHzMW6swJE8J';

async function testRoboflowAPI(imageInput, inputType = 'url') {
  console.log(`\n🔍 Testing Roboflow API...`);
  console.log(`📝 Input type: ${inputType}`);
  console.log(`🔗 Endpoint: ${ROBOFLOW_URL}\n`);

  let requestBody;

  if (inputType === 'url') {
    requestBody = {
      api_key: API_KEY,
      inputs: {
        image: {
          type: "url",
          value: imageInput
        }
      }
    };
  } else if (inputType === 'base64') {
    // Remove data URL prefix if present
    const base64Data = imageInput.includes(',') 
      ? imageInput.split(',')[1] 
      : imageInput;
    
    requestBody = {
      api_key: API_KEY,
      inputs: {
        image: {
          type: "base64",
          value: base64Data
        }
      }
    };
  }

  try {
    console.log('📤 Sending request...');
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

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Error Response:');
      console.error(JSON.stringify(result, null, 2));
      return;
    }

    console.log('✅ Success! Response:');
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
          console.log(`  ${idx + 1}. ${pred.class || pred.label} (confidence: ${(pred.confidence || pred.score || 0).toFixed(2)})`);
        });
      }
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
  node test-roboflow-api.js <image-url>
  node test-roboflow-api.js --base64 <base64-string>
  node test-roboflow-api.js --file <path-to-image>

Examples:
  node test-roboflow-api.js https://example.com/image.jpg
  node test-roboflow-api.js --base64 "data:image/jpeg;base64,/9j/4AAQ..."
  node test-roboflow-api.js --file ./test-image.jpg
  `);
  process.exit(1);
}

if (args[0] === '--base64') {
  if (args.length < 2) {
    console.error('❌ Error: --base64 requires a base64 string');
    process.exit(1);
  }
  testRoboflowAPI(args[1], 'base64');
} else if (args[0] === '--file') {
  if (args.length < 2) {
    console.error('❌ Error: --file requires a file path');
    process.exit(1);
  }
  // Join all remaining args to handle filenames with spaces
  const filePathArg = args.slice(1).join(' ');
  const filePath = path.isAbsolute(filePathArg) 
    ? filePathArg 
    : path.resolve(process.cwd(), filePathArg);
  
  console.log(`Looking for file: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: File not found: ${filePath}`);
    console.error(`Current working directory: ${process.cwd()}`);
    process.exit(1);
  }
  
  console.log(`✅ File found: ${filePath}`);
  const imageBuffer = fs.readFileSync(filePath);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = path.extname(filePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
  const dataUrl = `data:${mimeType};base64,${base64Image}`;
  console.log(`📸 Image loaded: ${(imageBuffer.length / 1024).toFixed(2)} KB, Base64 length: ${base64Image.length}`);
  testRoboflowAPI(dataUrl, 'base64');
} else {
  // Assume it's a URL
  testRoboflowAPI(args[0], 'url');
}

