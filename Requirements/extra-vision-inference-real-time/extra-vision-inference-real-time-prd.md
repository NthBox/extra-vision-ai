# PRD: Real-time Inference via Roboflow WebRTC

## 1. Objective
Enable a high-performance "Real-time" mode in the Extra-Vision AI app that uses Roboflow's WebRTC Streaming API to provide live, low-latency object detection overlays.

## 2. User Stories
- As a user, I want to toggle "Real-time" mode so I can see objects detected instantly without the delay of individual photo captures.
- As a developer, I want to keep the existing request-response mode as a fallback and for battery saving.
- As a user, I want to see a "LIVE" indicator when real-time mode is active.

## 3. Implementation Details (Codebase Impact)

### A. Store (`src/store/useVisionStore.ts`)
- Add `isRealTimeEnabled: boolean`.
- Add `realTimeSessionId: string | null` to track the current streaming session.
- Add `setRealTimeEnabled: (enabled: boolean) => void`.

### B. Hook (`src/hooks/useRealTimeInference.ts`) - NEW
- Initialize `@roboflow/inference-sdk`.
- Connect to the proxy initialization endpoint.
- Handle WebRTC `onData` events to update `detections` in the store.
- Manage cleanup (closing the stream) when the component unmounts or mode is disabled.

### C. UI (`src/components/CameraScreen.tsx`)
- Add a Toggle/Switch component to control `isRealTimeEnabled`.
- Conditional logic in the `useEffect` loop:
    - If `isRealTimeEnabled` is TRUE: Disable the manual `captureFrame` loop.
    - If `isRealTimeEnabled` is FALSE: Enable the manual `captureFrame` loop (existing behavior).
- Display a "LIVE" badge when streaming is active.

### D. Proxy (`proxy/index.ts`)
- Refine the `/v1/stream/init` endpoint to correctly forward requests to `https://serverless.roboflow.com/webrtc/stream/init` with the `ROBOFLOW_API_KEY`.

## 4. Non-Functional Requirements
- **Performance**: Real-time mode should target 15+ FPS.
- **Robustness**: If WebRTC fails to initialize, the app should show a toast/error and revert to manual mode.
- **Efficiency**: Ensure the camera track is shared or correctly handed over between `expo-camera` and the WebRTC track.

## 5. Scope Boundaries
- This change only affects the project folder (app and proxy).
- No changes to the core HUD drawing logic (it already consumes `detections` from the store).

