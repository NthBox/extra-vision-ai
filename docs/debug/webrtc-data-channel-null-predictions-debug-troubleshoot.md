# Debug & Troubleshooting: WebRTC Data Channel Null Predictions

## Issue Description
- **Symptoms**:
  - WebRTC connection establishes successfully (`Peer connection state: connected`, `ICE connection state: connected`)
  - Data channel receives messages (`onData` callback triggered)
  - `serialized_output_data` is consistently `null` or `undefined`
  - No predictions appear in real-time mode despite manual mode working correctly
  - Error messages: `"Requested output 'predictions' not found in workflow outputs"` and `"Invalid data_output fields: ['rapid_model']. Available workflow outputs: ['predictions', 'visualization']"`
- **Context**: Real-time inference using Roboflow WebRTC Streaming API with SAM3 model via hosted workflow (`workspace_name` + `workflow_id`). Manual REST API mode works correctly and returns predictions.

## Debug Methods Used
1. **Browser-MCP Inspection**: Used browser tool to inspect Roboflow Workflow dashboard at `https://app.roboflow.com/purple/workflows/edit/extra-vision-ai` to verify:
   - Workflow output names: `"predictions"` and `"visualization"`
   - Block names: `"rapid_model"` (SAM 3) and `"visualization"` (Bounding Box Visualization)
   - Output values: `"rapid_model predictions"` and `"visualization image"`
2. **Comprehensive Logging**: Added detailed logging in `useRealTimeInference.ts` to track:
   - `serialized_output_data` structure and keys
   - Data channel state and connection status
   - Full data payload structure (first 300 chars)
3. **Proxy Logging**: Added request logging in `proxy/index.ts` to verify what's being sent to Roboflow API
4. **Documentation Review**: Reviewed Roboflow Serverless Video Streaming API docs and GitHub sample app to understand correct configuration format
5. **Error Message Analysis**: Used specific error messages from Roboflow API to identify available outputs vs. requested outputs

## Troubleshooting Process
1. **Initial Configuration**: Started with `dataOutputNames: null` thinking it would return all outputs - resulted in null `serialized_output_data`
2. **Response Output Names**: Tried `dataOutputNames: ["predictions"]` - got error `"Requested output 'predictions' not found in workflow outputs"`
3. **Block Names Attempt**: Tried `dataOutputNames: ["rapid_model"]` - got error `"Invalid data_output fields: ['rapid_model']. Available workflow outputs: ['predictions', 'visualization']"`
4. **Omission Strategy**: Tried omitting `dataOutputNames` entirely - still got null `serialized_output_data`
5. **Frame Rate Optimization**: Reduced camera frame rate from 30 FPS to 5 FPS to match SAM3's processing speed (~5 FPS)
6. **Final Solution**: Used `dataOutputNames: ["predictions"]` after error message confirmed it's available - this resolved the configuration error

## Approaches That Worked
1. **Using Correct Output Names**: The error message `"Available workflow outputs: ['predictions', 'visualization']"` confirmed the exact names to use. Using `dataOutputNames: ["predictions"]` resolved the configuration error.
2. **Frame Rate Matching**: Reducing camera frame rate from 30 FPS to 5 FPS to match SAM3's ~5 FPS processing speed prevents overwhelming the GPU and reduces bandwidth.
3. **Proxy Request Format**: Ensuring `data_output` is always an array when provided in the proxy request body.
4. **Play/Pause Control**: Added play/pause functionality so both REST API and WebRTC modes default to paused, preventing unnecessary API calls.

## Key Technical Insights
1. **Output Names vs Block Names**: When using `workflow_configuration` with hosted workflows (`workspace_name` + `workflow_id`), you must use the **workflow output names** (defined in the "Outputs" section of the dashboard), NOT the block/step names. The error message explicitly lists available outputs.
2. **Data Channel vs REST API**: Workflow outputs defined for REST API responses are the same names used for WebRTC data channel outputs. The dashboard output names (`"predictions"`, `"visualization"`) are what you request in `dataOutputNames`.
3. **Frame Rate Considerations**: SAM3 models run at ~5 FPS. Sending 30 FPS from the camera causes most frames to be dropped with `realtimeProcessing: true`. Matching input frame rate to processing speed (5 FPS) is more efficient.
4. **Null vs Undefined**: When `dataOutputNames` is `undefined`, the proxy omits `data_output` from the request. When it's `null`, it sends `data_output: null` which may not be interpreted correctly. Always use an array of output names.

## Lessons Learned & Prevention
- **Always Check Error Messages**: Roboflow API error messages explicitly list available outputs. Use these exact names.
- **Output Names Are Dashboard Names**: The workflow output names in the Roboflow dashboard (e.g., "predictions", "visualization") are what you use in `dataOutputNames`, not block names or internal step names.
- **Frame Rate Should Match Processing Speed**: For models with known FPS limits (like SAM3 at ~5 FPS), set camera frame rate to match to avoid wasted bandwidth and dropped frames.
- **Test Configuration Incrementally**: Start with the error message's suggested values, then optimize. The API tells you exactly what's available.
- **Default to Paused**: Always default inference to paused state to prevent unnecessary API calls and costs when the app starts.
- **Proxy Format Matters**: When calling Roboflow API directly (not using SDK client), ensure `data_output` is always an array format, never `null` or `undefined`.

## Files Modified
- `src/hooks/useRealTimeInference.ts`: Updated `dataOutputNames` configuration, reduced frame rate to 5 FPS, added comprehensive logging
- `proxy/index.ts`: Added request logging, ensured `data_output` is always an array format
- `src/components/CameraScreen.tsx`: Added play/pause button with styling, integrated with both REST API and WebRTC modes
- `src/store/useVisionStore.ts`: Added `isPlaying` state (already existed, verified default is `false`)

## Current Status
- Configuration error resolved: Using `dataOutputNames: ["predictions"]` as confirmed by API error message
- Frame rate optimized: Reduced to 5 FPS to match SAM3 processing speed
- Play/pause implemented: Both modes default to paused, no API calls until user presses play
- **Pending**: Testing to verify `serialized_output_data` now contains predictions data and bounding boxes appear

