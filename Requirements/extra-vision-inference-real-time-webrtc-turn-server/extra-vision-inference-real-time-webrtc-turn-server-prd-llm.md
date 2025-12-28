# PRD-LLM: Enhanced Real-time Inference via WebRTC + Twilio TURN

## 1. Purpose
The standard WebRTC peer-to-peer connection used for real-time inference often fails in restricted network environments such as cellular data (LTE/5G) or high-security WiFi (e.g., Xfinity Advanced Security). This results in "ICE timeout" errors and failure to establish a stream. This feature integrates a Twilio TURN relay to ensure 100% connectivity by relaying traffic over Port 443 TLS, which bypasses most NAT and firewall restrictions.

## 2. User Experience
- **Reliable Connectivity**: Users on cellular networks or restricted WiFi will now be able to use real-time inference without connection failures.
- **Enhanced Mode Toggle**: A new "Enhanced" button in the HUD controls allows users to explicitly enable the high-reliability mode.
- **Visual Feedback**: The UI will indicate when "Enhanced" mode is active and show the connection status.

## 3. Technical Requirements
- **Relay Infrastructure**: Integrate Twilio Network Traversal Service (TURN) as a global relay.
- **Secure Credentials**: Use the existing Cloudflare Worker to fetch ephemeral Twilio credentials (valid for 24h) to avoid exposing permanent API keys in the mobile app.
- **Port 443 TLS**: Configure the TURN relay to use Port 443 with TLS to camouflage WebRTC traffic as standard HTTPS.
- **Cost Optimization**: 
  - Use `webrtc-gpu-medium` plan on Roboflow (approx. $0.067/min).
  - Use YOLO11 Nano for high FPS on medium GPU.
  - Limit resolution to 640x480 to minimize Twilio relay costs.

## 4. Implementation Scope
- **Backend (Cloudflare Worker)**:
  - Add Twilio secrets (`TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`).
  - Create `/v1/webrtc-turn-config/twilio` endpoint to return ephemeral TURN servers.
- **Store (Zustand)**:
  - Add `isEnhancedModeEnabled` to `useVisionStore`.
- **Hook (useRealTimeInference)**:
  - Update `connector` to fetch TURN config from the new Twilio endpoint when enhanced mode is active.
  - Set `requestedPlan` to `webrtc-gpu-medium`.
  - Force `modelMode` to YOLO-based fast inference.
- **UI (CameraScreen)**:
  - Add an "ENH" (Enhanced) button in the control bar.
  - Provide feedback during initialization.

## 5. Success Metrics
- 100% connection success rate on cellular (LTE/5G) networks.
- Successful bypass of Xfinity "Advanced Security" blocks.
- Maintaining >10 FPS in Enhanced mode.
- Operational cost below $0.08/minute.
