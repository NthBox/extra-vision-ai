# Scoping: Enhanced Real-time Inference via WebRTC + Twilio TURN

## 1. Objective
Enable 100% reliable real-time video inference on cellular (LTE/5G) and restricted WiFi networks (e.g., Xfinity Advanced Security) by integrating a global TURN relay. This feature will provide a stable, high-FPS experience that current peer-to-peer WebRTC fails to deliver due to NAT/firewall restrictions.

## 2. Tech Stack
- **AI Model**: YOLO11 Nano (optimized for high speed and accuracy).
- **Inference Engine**: Roboflow Serverless Video Streaming (WebRTC).
- **Compute Plan**: `webrtc-gpu-medium` (Cloud GPU).
- **Connectivity Relay**: Twilio Network Traversal Service (TURN over Port 443 TLS).
- **Infrastructure Proxy**: Cloudflare Workers (handling credential generation).

## 3. Scope of Implementation

### A. Connectivity (Twilio TURN Integration)
- Implement a dedicated endpoint in the Cloudflare Worker to fetch ephemeral credentials from Twilio.
- Update the client-side WebRTC handshake to prioritize **Port 443 TCP/TLS** candidates.
- **Success Metric**: Establish a WebRTC connection on cellular data without `ICE timeout` errors.

### B. UI/UX (Additive Feature)
- Add a new "Enhanced" or "Reliable" mode toggle/button in the compact control bar.
- This mode will explicitly use the `webrtc-gpu-medium` plan and the Twilio TURN server.
- Existing "Manual" and standard "Real-time" modes remain unchanged as fallbacks.

### C. Performance & Cost Optimization
- **Model**: Force use of YOLO11 Nano for maximum FPS on the Medium GPU.
- **Instance**: Configure `requestedPlan: 'webrtc-gpu-medium'` to reduce Roboflow costs by ~50% vs Large GPU.
- **Data Usage**: Limit stream resolution to 640x480 to keep Twilio relay costs below $0.01/min.

## 4. Cost Analysis (Simulation)
Based on `webrtc-gpu-medium` ($0.067/min) + Twilio TURN ($0.006/min):

| Duration | Est. Total Cost |
| :--- | :--- |
| 1 Minute | $0.07 |
| 10 Minutes | $0.73 |
| 1 Hour | $4.38 |

## 5. Non-Functional Requirements
- **No Breaking Changes**: The integration must be modular and not affect the existing `useInference` or `useRealTimeInference` logic.
- **Privacy**: No image data is stored on Twilio; they only act as a packet relay.
- **Security**: Twilio credentials must be generated server-side (Cloudflare) and expire after 24 hours.

## 6. Implementation Checklist
- [ ] Sign up for Twilio Network Traversal and obtain SID/Auth Token.
- [ ] Add `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` to Cloudflare Worker secrets.
- [ ] Create `/v1/webrtc-turn-config/twilio` endpoint in `proxy/index.ts`.
- [ ] Update `useRealTimeInference.ts` to support the new `webrtc-gpu-medium` plan and Twilio ICE servers.
- [ ] Add the "Enhanced" button to `CameraScreen.tsx`.
