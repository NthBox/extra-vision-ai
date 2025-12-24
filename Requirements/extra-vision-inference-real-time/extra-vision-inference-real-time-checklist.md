# Checklist: Real-time Inference Implementation

## Pre-Implementation
- [ ] Dependencies installed: `@roboflow/inference-sdk`, `react-native-webrtc`.
- [ ] Expo config plugin added to `app.config.js`.
- [ ] Environment variables (Proxy URL) verified.

## Backend (Proxy)
- [ ] `/v1/stream/init` endpoint handles POST requests correctly.
- [ ] API Key is securely appended in the proxy.
- [ ] Roboflow signaling response is correctly returned to the app.

## Frontend (Logic)
- [ ] `useVisionStore` tracks `isRealTimeEnabled`.
- [ ] `useRealTimeInference` hook initializes correctly.
- [ ] WebRTC Data Channel receives predictions.
- [ ] Predictions are mapped correctly to the HUD coordinate system.
- [ ] Cleanup function closes WebRTC session and camera tracks.

## Frontend (UI)
- [ ] Toggle button added to Camera Screen.
- [ ] Manual capture loop is paused during real-time mode.
- [ ] "LIVE" indicator appears when streaming is active.
- [ ] Error messages display if connection fails.

## Verification
- [ ] Latency is visibly lower than manual mode.
- [ ] Mode switching does not crash the app.
- [ ] HUD boxes align with objects in real-time.
- [ ] App stays stable after multiple mode switches.

