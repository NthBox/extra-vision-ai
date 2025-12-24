# Tasks: Real-time Inference Implementation

## Phase 1: Environment & Store (Foundation)
- [ ] Task 1.1: Install dependencies (`@roboflow/inference-sdk`, `react-native-webrtc`).
- [ ] Task 1.2: Add Expo config plugin for `react-native-webrtc` in `app.config.js`.
- [ ] Task 1.3: Update `src/store/useVisionStore.ts` with `isRealTimeEnabled` and `isStreaming`.
- [ ] Task 1.4: Update Cloudflare Worker (`proxy/index.ts`) to finalize `/v1/stream/init` logic.

## Phase 2: Core Logic (Hook)
- [ ] Task 2.1: Implement `src/hooks/useRealTimeInference.ts`.
- [ ] Task 2.2: Implement Roboflow-to-App prediction mapping utility.
- [ ] Task 2.3: Integrate WebRTC Data Channel event listeners to update Zustand store.
- [ ] Task 2.4: Implement session cleanup logic on unmount.

## Phase 3: UI Integration (Camera)
- [ ] Task 3.1: Add "Real-time" toggle button to `src/components/CameraScreen.tsx`.
- [ ] Task 3.2: Update `CameraScreen` to conditionally pause the manual `captureFrame` loop when `isRealTimeEnabled` is true.
- [ ] Task 3.3: Add "LIVE" indicator to the HUD or status overlay.
- [ ] Task 3.4: Implement error handling UI (Toast/Alert) if WebRTC fails.

## Phase 4: Validation & Testing
- [ ] Task 4.1: Verify signaling handshake through proxy.
- [ ] Task 4.2: Verify WebRTC data flow and HUD alignment.
- [ ] Task 4.3: Test mode switching stability (Manual <-> Real-time).
- [ ] Task 4.4: Performance check: Compare FPS and battery/heat impact.

