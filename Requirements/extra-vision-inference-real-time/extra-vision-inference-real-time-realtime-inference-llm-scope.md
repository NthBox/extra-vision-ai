# Scope: Real-time Inference via Roboflow WebRTC

## 1. Feature Overview
The goal is to integrate Roboflow's **Serverless Video Streaming API** (WebRTC) into the Extra-Vision AI mobile application. This will allow for low-latency, real-time object detection directly on the camera stream, supplementing the existing request-response (manual/polling) inference mode.

## 2. Current Implementation
- **Current Mode**: Request-Response.
- **Flow**: App captures frame -> Base64 encoding -> POST to Cloudflare Worker -> Roboflow Workflow API -> Results returned to App -> HUD Overlay updates.
- **Hook**: `useInference.ts` using `@tanstack/react-query`.
- **State**: `useVisionStore.ts` (Zustand) tracks detections and inference state.

## 3. Real-time Inference Requirements (WebRTC)
### A. Dependencies
- `@roboflow/inference-sdk`: For managing the WebRTC connection and inference lifecycle.
- `react-native-webrtc`: Required peer dependency for WebRTC support in React Native.
- `expo-camera`: Existing dependency for accessing the device camera.
- **Expo Config Plugin**: Since this is an Expo project, `react-native-webrtc` will likely require the `@author.io/react-native-webrtc-expo-plugin` or similar manual configuration in `app.config.js` to handle native permissions and dependencies.

### B. Backend Proxy (Cloudflare Worker)
- **Role**: Secure the `ROBOFLOW_API_KEY`.
- **Endpoint**: `/v1/stream/init` (POST).
- **Function**: Receives initialization request from SDK, appends API key, calls Roboflow's WebRTC init endpoint, and returns the signaling data to the app.

### C. Technical Constraints
- **Latency**: Aiming for < 100ms for inference results.
- **Bandwidth**: WebRTC adjusts resolution based on network quality.
- **Data Channel**: Use the WebRTC Data Channel for structured JSON inference results (bounding boxes, classes).

## 4. Integration Plan

### Phase 1: Infrastructure & State
1.  **Add Dependencies**: Install `@roboflow/inference-sdk` and `react-native-webrtc`.
2.  **Update Store**: Add `isRealTimeEnabled` and `streamingSession` state to `useVisionStore`.
3.  **Proxy Refinement**: Ensure `proxy/index.ts` correctly handles the `/v1/stream/init` handshake for WebRTC.

### Phase 2: Logic Implementation
1.  **Create `useRealTimeInference` Hook**:
    - Use `connectors.withProxyUrl` to point to the Cloudflare Worker.
    - Implement `onData` callback to update `useVisionStore` with fresh detections.
    - Manage start/stop lifecycle based on `isRealTimeEnabled`.
2.  **Concurrency Management**:
    - When Real-time is ON, disable the manual polling/trigger of the standard `useInference` hook to save bandwidth and compute.

### Phase 3: UI/UX Updates
1.  **Toggle Button**: Add a "Real-time" switch/button to `CameraScreen.tsx`.
2.  **HUD Feedback**: Indicate active streaming state on the HUD (e.g., a "LIVE" indicator).
3.  **Error Handling**: Graceful fallback to request-response if WebRTC fails to connect.

## 5. Design Patterns
- **Zustand**: For global toggle state and shared detection data.
- **React Query**: For the initial session handshake and error tracking.
- **Modular Hooks**: Separation of concerns between `useInference` (request-response) and `useRealTimeInference` (streaming).

## 6. Security
- **No API Keys in Frontend**: All Roboflow credentials stay in the Cloudflare Worker environment variables.
- **CORS**: Maintain strict CORS policy in the proxy to only allow requests from the app's bundle ID/origin.

## 7. Success Metrics
- Inference updates at 15+ FPS (depending on model complexity).
- No perceptible lag between physical movement and HUD box alignment.
- Zero API key exposure in client-side code.

