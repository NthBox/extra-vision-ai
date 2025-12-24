# PRD-LLM: Real-time Inference via Roboflow WebRTC

## 1. Product Vision
Transform the Extra-Vision AI from a static "snap-and-detect" app into a live, augmented reality-style experience by integrating low-latency, real-time object detection using Roboflow's WebRTC Streaming API.

## 2. Target Audience
Users requiring immediate feedback from visual data (e.g., driving assistance, security monitoring, real-time object counting) where polling latency is unacceptable.

## 3. Core Features
- **Live Video Streaming**: Stream camera frames to Roboflow's serverless infrastructure via WebRTC.
- **Real-time Metadata**: Receive inference results (bounding boxes, labels, confidence) via WebRTC Data Channels.
- **Toggleable Modes**: Allow users to switch between "Manual/Polling" (Battery Efficient) and "Real-time" (Performance Focused) modes.
- **Unified HUD**: The existing HUDOverlay must support data from both inference sources seamlessly.

## 4. User Experience (UX)
- **Activation**: A prominent "Real-time" toggle on the camera screen.
- **Visual Feedback**: A "LIVE" indicator when streaming is active.
- **Transition**: Smooth transition when switching modes without restarting the camera.
- **Persistence**: Real-time mode should automatically deactivate if the app goes to background to save data/battery.

## 5. Technical Constraints & Security
- **No Client-side Secrets**: All API keys must be handled by the Cloudflare Worker proxy.
- **Latency Target**: < 100ms end-to-end latency for inference results.
- **Platform Support**: Must work on both iOS and Android (via `react-native-webrtc`).
- **Resource Management**: Properly close WebRTC sessions to prevent memory leaks or unexpected billing.

## 6. Success Criteria
- Successful establishment of WebRTC connection via proxy.
- Inference results displayed on HUD with minimal lag.
- No regression in existing request-response inference functionality.

