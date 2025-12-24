/**
 * Helper script to test Roboflow API
 * This script will help you upload your image or test with base64
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const WORKFLOW_ID = 'extra-vision-ai';
const ROBOFLOW_URL = `https://serverless.roboflow.com/purple/workflows/${WORKFLOW_ID}`;
const API_KEY = process.env.ROBOFLOW_API_KEY || '4U1HHPLS5D0I3toF8K67';

async function uploadToImgur(imagePath) {
  // This is a placeholder - you'd need imgur API credentials
  console.log('📤 To upload to Imgur:');
  console.log('   1. Go to https://api.imgur.com/oauth2/addclient');
  console.log('   2. Create an app and get client ID');
  console.log('   3. Or use: https://imgur.com/upload (manual upload)');
  console.log('   4. Copy the direct image URL');
  return null;
}

async function testWithBase64(imagePath) {
  console.log(`\n🔍 Testing Roboflow API with Base64...`);
  console.log(`📸 Loading image: ${imagePath}`);
  
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const imageSizeKB = (imageBuffer.length / 1024).toFixed(2);
  
  console.log(`✅ Image loaded: ${imageSizeKB} KB`);
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

    const responseText = await response.text();
    let result;
    
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
      return;
    }

    console.log('✅ Success! Full Response:');
    console.log(JSON.stringify(result, null, 2));

    // Extract detections
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
          console.log(`  ${idx + 1}. ${label} (confidence: ${confidence})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Request failed:');
    console.error(error.message);
  }
}

// Main
const imageDir = path.join(__dirname, 'assets', 'pov-driving');
const files = fs.readdirSync(imageDir);
const imageFile = files.find(f => f.endsWith('.png'));

if (!imageFile) {
  console.error('❌ No PNG file found in assets/pov-driving/');
  process.exit(1);
}

const imagePath = path.join(imageDir, imageFile);

console.log('💡 Testing with Base64 (same format as your proxy)...\n');
testWithBase64(imagePath);

