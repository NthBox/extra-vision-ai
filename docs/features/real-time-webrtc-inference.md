# Real-time Vision Inference via Roboflow WebRTC

## Overview
The "Real-time" mode enables low-latency object detection by streaming the camera feed directly to Roboflow's serverless inference infrastructure using WebRTC. This bypasses the overhead of individual HTTP POST requests for every frame, targeting a performance of 15-30 FPS depending on network conditions and device capabilities.

## Implementation Details

### 1. Technology Stack
- **Roboflow Inference SDK**: Used to manage the WebRTC handshake and data channel.
- **react-native-webrtc**: Provides the native WebRTC implementation for React Native, allowing access to `mediaDevices` and rendering via `RTCView`.
- **@config-plugins/react-native-webrtc**: An Expo config plugin that automates the complex native setup (permissions, bitcode, background modes) required for WebRTC on iOS and Android.
- **Cloudflare Worker Proxy**: Acts as a signaling server to securely inject the `ROBOFLOW_API_KEY` into the initialization request. It implements `/v1/stream/init` for signaling and `/v1/webrtc-turn-config` for NAT traversal.

### 2. State Management (`src/store/useVisionStore.ts`)
We added specific fields to track the streaming state:
- `isRealTimeEnabled`: Global toggle for the mode.
- `isStreaming`: Tracks if the WebRTC connection is active.
- `streamingError`: Captures any initialization or runtime errors.

### 3. Core Hook (`src/hooks/useRealTimeInference.ts`)
This hook encapsulates the WebRTC lifecycle:
- **Initialization**: Requests camera permissions via `mediaDevices.getUserMedia`.
- **Global Registration**: Calls `registerGlobals()` to polyfill WebRTC constructors for the SDK.
- **Connection**: Uses `connectors.withProxyUrl` with both signaling and TURN config endpoints.
- **Data Handling**: Listen to the WebRTC data channel for `predictions`.
- **Mapping**: Converts Roboflow's coordinate system to the app's internal `Detection` format.
- **Cleanup**: Ensures tracks are stopped and the peer connection is closed on unmount or mode switch.

### 4. UI Components
- **CameraScreen.tsx**: 
    - Conditional rendering: Swaps `CameraView` (Expo) for `RTCView` (WebRTC) when live.
    - Loop Control: Automatically pauses the manual capture-and-post loop when WebRTC is active.
    - Mode Toggle: A Switch UI to let users opt-in to high-performance mode.
- **HUDOverlay.tsx**:
    - Displays a red "LIVE" indicator when `isStreaming` is true to give visual feedback to the user.

## Future Considerations
- **Dynamic Resolution**: Implement logic to scale down the `RTCView` or source track if network bandwidth is limited.
- **Turn Server Configuration**: Currently relying on default STUN servers. For production robustness in restrictive networks, we should implement a `/v1/stream/turn` endpoint in the proxy to fetch Roboflow's TURN credentials.
- **Battery Optimization**: Monitor thermal impact. Real-time streaming is computationally expensive; we may want to add a "battery saver" auto-toggle.

## Reference
- [Roboflow WebRTC Documentation](https://docs.roboflow.com/inference/webrtc)
- [react-native-webrtc Github](https://github.com/react-native-webrtc/react-native-webrtc)
- [Expo Config Plugins](https://docs.expo.dev/config-plugins/introduction/)

