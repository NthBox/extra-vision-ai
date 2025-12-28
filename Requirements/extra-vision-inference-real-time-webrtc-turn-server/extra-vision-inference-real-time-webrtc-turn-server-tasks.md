# Implementation Tasks: WebRTC Twilio TURN Integration

## Phase 1: Infrastructure & Backend
- [x] **Task 1: Twilio Setup**
    - Obtain Twilio Account SID, API Key SID, and API Key Secret.
    - Configure Twilio Network Traversal Service.
- [x] **Task 2: Cloudflare Worker Update**
    - Update `proxy/index.ts` `Env` interface.
    - Implement `/v1/webrtc-turn-config/twilio` endpoint with credential fetching logic.
    - Add CORS headers to the new endpoint.
- [ ] **Task 3: Secret Deployment**
    - Use `wrangler secret put` to add `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY_SID`, and `TWILIO_API_KEY_SECRET` to the worker.

## Phase 2: Store & State
- [ ] **Task 4: Vision Store Update**
    - Add `isEnhancedMode` and `setEnhancedMode` to `src/store/useVisionStore.ts`.

## Phase 3: WebRTC Hook Integration
- [ ] **Task 5: Hook Logic Update**
    - Update `src/hooks/useRealTimeInference.ts` to conditionally use the Twilio TURN endpoint.
    - Update `requestedPlan` and `workflowId` based on `isEnhancedMode`.
    - Ensure session restart logic works correctly when toggling mode.

## Phase 4: UI Integration
- [ ] **Task 6: HUD Button Implementation**
    - Add the "ENH" toggle button to `src/components/CameraScreen.tsx`.
    - Style the button to match the existing UI and indicate active state.

## Phase 5: Validation & Testing
- [ ] **Task 7: Connectivity Testing**
    - Test standard mode on WiFi (P2P/STUN).
    - Test enhanced mode on Cellular LTE/5G (Relay/TURN).
    - Monitor Cloudflare logs for successful Twilio API calls.
- [ ] **Task 8: Performance Monitoring**
    - Verify FPS and latency in Enhanced mode.
    - Check Roboflow usage dashboard for correct `gpu-medium` plan utilization.
