WebRTC Relay Policy - Debug & Troubleshooting

Issue overview
- The WebRTC relay policy (iceTransportPolicy: 'relay') does not appear to be enforced by the SDK, causing STUN candidates to be gathered on restricted networks and leading to connection failures even when Twilio TURN is available.

Debug methods
- Confirm TURN config is retrieved from Cloudflare proxy and contains Twilio TURN servers.
- Monitor ICE candidate events on the client (host, srflx, relay) to verify candidate types.
- Inspect the actual WebRTC PeerConnection configuration if the SDK exposes it (or surface logs from the SDK).
- Use webrtc-internals-like tooling (where available) to observe ICE state transitions and candidate gathering.

Troubleshooting approaches
- Verify that iceTransportPolicy is being passed to the correct WebRTC constructor path used by the SDK.
- Remove or replace STUN servers in the ICE list when Enhanced mode is active and ensure only TURN servers are offered.
- Validate that the proxy forwards the policy to Roboflow's webrtc_config correctly (iceTransportPolicy and iceCandidatePoolSize).
- Test across multiple network environments (cellular, corporate wifi, NAT) to reproduce reliably.
- If the SDK cannot honor the policy, consider a workaround: filter candidates to relay-only on the client, or provide a patch/workaround with the SDK maintainers.

What worked (notes from experiments)
- Enabling relay-only flow via explicit webrtc_config parameters helped reduce some failures, but behavior depends on SDK internals.
- Increasing connection timeouts and adding retry/backoff improved resilience during cold starts.
- TURN logs in the proxy show Twilio credentials and TURN server usage; the remaining issue is client-side candidate selection.

Questions for Roboflow support
- Does the Roboflow SDK respect iceTransportPolicy in the actual RTCPeerConnection construction?
- Where should iceTransportPolicy live (wrtcParams vs webrtc_config) for guaranteed propagation?
- Any known caveats with react-native-webrtc in this context?
- Are there recommended workarounds if the policy isn’t honored by the SDK?
- Is there a way to surface or inspect the underlying RTCPeerConnection to verify policy?

Notes for preventing recurrence
- If SDK bug, capture the exact version and environment to report to Roboflow.
- Document observed behavior and workaround in project docs for future onboarding.
- Consider a minimal reproducible test harness to verify policy in CI.
