# Technical Specification: WebRTC Twilio TURN Integration

## 1. Backend (Proxy) Architecture

### 1.1. Twilio Integration
The Cloudflare Worker will act as a secure gateway to Twilio.

**Endpoint**: `GET /v1/webrtc-turn-config/twilio`
**Internal Call**:
```bash
POST https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Tokens.json
Authorization: Basic base64(SID:TOKEN)
```
**Response Transformation**:
Transform Twilio's `ice_servers` response into the standard WebRTC `iceServers` format:
```json
{
  "iceServers": [
    {
      "urls": ["turn:...", "turns:..."],
      "username": "...",
      "credential": "..."
    }
  ]
}
```

## 2. Frontend Integration

### 2.1. Vision Store (`useVisionStore.ts`)
```typescript
interface VisionState {
  // ... existing
  isEnhancedMode: boolean;
  setEnhancedMode: (enabled: boolean) => void;
}

// implementation:
isEnhancedMode: false,
setEnhancedMode: (isEnhancedMode) => set({ isEnhancedMode }),
```

### 2.2. WebRTC Hook (`useRealTimeInference.ts`)
Logic flow when `isEnhancedMode` is active:
1.  Set `turnConfigUrl` to the `/twilio` endpoint.
2.  Set `requestedPlan` to `webrtc-gpu-medium`.
3.  Set `workflowId` to `extra-vision-ai-realtime`.
4.  Optionally set `iceTransportPolicy: 'relay'` in `wrtcParams` to force use of the TURN server for testing, though normally `all` is preferred for efficiency.

## 3. UI/UX Specifications

### 3.1. HUD Button (`CameraScreen.tsx`)
- **Label**: `ENH`
- **Location**: To the left of the `LIVE` button in the `mainControls` bar.
- **Color**: `#FFCC00` (Gold) when active to indicate "Premium/Enhanced" connectivity.
- **Behavior**: Toggling this while a stream is active should stop the current stream and restart with the new configuration.

## 4. Security
- Ephemeral credentials from Twilio are used.
- No Twilio secrets are bundled in the React Native binary.
- All backend communication is over HTTPS.

## 5. Performance Considerations
- **Latency**: Adding a TURN relay adds a small amount of latency (typically <50ms) as packets bounce off a relay.
- **Bandwidth**: 640x480 resolution at 5-10 FPS keeps bandwidth usage low, minimizing Twilio data costs.
