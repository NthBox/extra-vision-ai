# Checklist: WebRTC Twilio TURN Integration

Based on and derived from `extra-vision-inference-real-time-webrtc-turn-server-tasks.md`.

## Infrastructure & Backend
- [ ] Twilio Account SID and Auth Token secured
- [ ] Twilio NTS (Network Traversal Service) active
- [ ] Cloudflare Worker `Env` updated with new secrets
- [ ] `/v1/webrtc-turn-config/twilio` endpoint implemented and returning correct JSON structure
- [ ] Worker deployed with secrets (`wrangler secret put`)

## Frontend State & Logic
- [ ] `isEnhancedMode` added to `useVisionStore`
- [ ] `useRealTimeInference` correctly switches `turnConfigUrl` based on mode
- [ ] `webrtc-gpu-medium` plan explicitly requested in enhanced mode
- [ ] `workflowId` pinned to `extra-vision-ai-realtime` in enhanced mode

## UI/UX
- [ ] "ENH" button visible in `CameraScreen` main controls
- [ ] Button accurately reflects `isEnhancedMode` state (active/inactive)
- [ ] Stream correctly restarts when mode is toggled

## Verification
- [ ] Successful connection over cellular (LTE/5G)
- [ ] Verified `relay` candidate usage in browser/client logs
- [ ] Validated GPU plan on Roboflow dashboard
- [ ] Cost per minute within expected range ($0.07-$0.08)
