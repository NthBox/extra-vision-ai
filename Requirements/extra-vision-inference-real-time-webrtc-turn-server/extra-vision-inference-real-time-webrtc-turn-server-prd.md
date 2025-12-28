# PRD: Enhanced Real-time Inference via WebRTC + Twilio TURN

## 1. Goal
Provide a reliable real-time inference path for mobile devices on restricted networks (Cellular, Xfinity WiFi) by implementing a Twilio-backed TURN relay over Port 443 TLS.

## 2. Context & Rationale
The current WebRTC implementation relies on STUN for peer-to-peer hole punching. This fails on Symmetric NATs (common in cellular) and restrictive firewalls. Twilio TURN provides a guaranteed relay path. By using Port 443 TLS, we ensure the traffic looks like standard HTTPS, which is rarely blocked.

## 3. Targeted Changes

### 3.1. Proxy (Cloudflare Worker)
- **Path**: `proxy/index.ts`
- **Updates**:
    - Add `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` to the `Env` interface.
    - Implement a new route: `GET /v1/webrtc-turn-config/twilio`.
    - Logic: Call Twilio's Network Traversal Service API to get ephemeral `iceServers`.
    - Return the `iceServers` array in the standard WebRTC format.

### 3.2. Frontend State Management
- **Path**: `src/store/useVisionStore.ts`
- **Updates**:
    - Add `isEnhancedMode`: boolean.
    - Add `setEnhancedMode`: (enabled: boolean) => void.
    - Default `isEnhancedMode` to `false`.

### 3.3. Frontend Hooks
- **Path**: `src/hooks/useRealTimeInference.ts`
- **Updates**:
    - Read `isEnhancedMode` from `useVisionStore`.
    - Modify `connectors.withProxyUrl` options:
        - If `isEnhancedMode` is true, use `turnConfigUrl: ${INFERENCE_WORKER_URL}/v1/webrtc-turn-config/twilio`.
        - Else, keep using the default `/v1/webrtc-turn-config`.
    - Modify `wrtcParams`:
        - If `isEnhancedMode` is true, set `requestedPlan: 'webrtc-gpu-medium'`.
        - Ensure `workflowId` is pinned to the fast (YOLO) branch when in enhanced mode.

### 3.4. UI Components
- **Path**: `src/components/CameraScreen.tsx`
- **Updates**:
    - Add a new button in the `mainControls` group labeled "ENH".
    - Toggle `isEnhancedMode` on press.
    - Visual state: Highlight button when active.
    - Add a tooltip or small text indicator when starting a stream in Enhanced mode.

## 4. Non-Goals / Outside Scope
- No changes to the 3D rendering engine.
- No changes to the standard manual inference mode.
- No changes to SAM3 (Accurate) mode, as it is too slow for real-time cost-effective relaying.

## 5. Implementation Strategy
1.  **Backend First**: Update the proxy and deploy secrets to Cloudflare.
2.  **State & Hook**: Update the store and the WebRTC hook to handle the new configuration.
3.  **UI Integration**: Add the button to the HUD for user control.
4.  **Testing**: Verify on a cellular connection.
