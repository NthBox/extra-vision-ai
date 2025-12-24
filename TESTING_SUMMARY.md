# Roboflow API Testing Summary

## Current Status: ⚠️ 500 Internal Server Error

### What We've Tested

1. ✅ **Request Format**: Correct - matches Roboflow API specification
2. ✅ **API Key**: Valid - `4U1HHPLS5D0I3toF8K67` (from .env file)
3. ❌ **Response**: Consistently getting `500 Internal Server Error`

### Test Results

#### Test 1: URL-based request (curl format you provided)
```bash
curl --location 'https://serverless.roboflow.com/purple/workflows/...' \
--header 'Content-Type: application/json' \
--data '{"api_key": "4U1HHPLS5D0I3toF8K67", "inputs": {"image": {"type": "url", "value": "IMAGE_URL"}}}'
```
**Result**: `500 Internal Server Error`

#### Test 2: Base64 request (same as your proxy)
```javascript
{
  "api_key": "4U1HHPLS5D0I3toF8K67",
  "inputs": {
    "image": {
      "type": "base64",
      "value": "<base64_string>"
    }
  }
}
```
**Result**: `500 Internal Server Error` (with 957 KB image)

### Possible Causes

1. **Image Size**: Your test image is 957.60 KB, which might exceed Roboflow's limits
2. **Workflow Configuration**: The workflow might not be properly configured or activated
3. **Service Issue**: Temporary Roboflow service problem
4. **Workflow ID**: The workflow ID might be incorrect or the workflow might be disabled

### Next Steps to Debug

1. **Check Roboflow Dashboard**:
   - Go to https://app.roboflow.com
   - Verify the workflow is active and properly configured
   - Check if there are any error logs or status messages

2. **Test with Smaller Image**:
   - Try with a smaller test image (< 100 KB)
   - Your app compresses images to ~30% quality and 50% scale

3. **Verify Workflow ID**:
   - Confirm the workflow ID matches exactly in your dashboard
   - Check if the workflow is published/deployed

4. **Check API Key Permissions**:
   - Verify the API key has access to this specific workflow
   - Try generating a new API key

5. **Contact Roboflow Support**:
   - If the workflow is correctly configured, this might be a service issue
   - Check Roboflow status page or contact support

### Test Scripts Available

- `test-roboflow-url.js` - Test with image URL
- `test-image-direct.js` - Test with base64 (local file)
- `test-with-upload.js` - Helper for base64 testing
- `test-roboflow-url.sh` - Bash script version

### Your Image Details
- **File**: `assets/pov-driving/Screenshot 2025-12-20 at 2.27.45 AM.png`
- **Size**: 957.60 KB
- **Base64**: 1,307,440 characters
- **Expected**: Should detect cars, people, pedestrians, etc.

### Recommended Action

Since your app compresses images before sending, try testing with a compressed version:

```bash
# Compress the image first (if you have imagemagick)
convert "assets/pov-driving/Screenshot 2025-12-20 at 2.27.45 AM.png" \
  -quality 30 -scale 50% test-image-compressed.jpg

# Then test with the compressed image
node test-image-direct.js test-image-compressed.jpg 4U1HHPLS5D0I3toF8K67
```

Or verify the workflow is correctly set up in your Roboflow dashboard first.

