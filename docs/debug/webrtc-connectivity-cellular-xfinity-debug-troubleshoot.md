# Debug & Troubleshoot: WebRTC Connectivity on Cellular and Xfinity Networks

## Issue: WebRTC ICE Timeout and Connection Failure
- **Symptoms**: `ERROR [ICE] timeout with NO srflx candidate! Connection may fail.` and `Failed to start real-time streaming: [Error: WebRTC connection failed]`.
- **Cause**: Mobile carriers and residential ISP routers (like Xfinity) often use **Symmetric NAT**, which prevents WebRTC from establishing a direct peer-to-peer connection via STUN. The default Roboflow TURN servers may also be blocked on non-standard ports by these networks.

## Debug Methods
- **Log Analysis**: Identified `srflx` (Server Reflexive) candidate failures, indicating the STUN server could not identify the device's public IP or the port is blocked.
- **Environment Cross-Testing**: Verified that manual inference (HTTPS) works on the same network while real-time (WebRTC/UDP) fails.
- **Network Profiling**: Identified that the failure is exclusive to cellular and certain residential "Advanced Security" WiFi environments.

## Troubleshoot Methods
- **Port 443 TURN Relay**: Researched switching to a TURN provider (Twilio, Metered.ca) that supports **TLS over Port 443**. This makes WebRTC traffic indistinguishable from standard HTTPS traffic.
- **Cloudflare WARP/VPN**: Verified that using a VPN/WARP tunnel bypasses carrier NAT restrictions and resolves the ICE timeout immediately.
- **Architecture Shift**: Evaluated **WebSocket-to-HTTP** relay through the Cloudflare Worker as a 100% reliable alternative to WebRTC's fragile handshake.

## Approaches That Worked
- **Manual Optimization**: Improved manual polling frequency by standardizing coordinates and reducing image payload size to provide a "pseudo-real-time" experience while WebRTC is unstable.
- **Cost-Optimized GPU Selection**: Identified that switching from `webrtc-gpu-large` to `webrtc-gpu-medium` for YOLO11 models reduces costs by ~50% with negligible performance impact.

## Prevention for Future Implementation
- **Always provide a fallback**: Real-time apps should automatically fallback from WebRTC to high-frequency HTTP/WebSocket polling when ICE timeouts are detected.
- **Use standard ports**: Configure TURN servers to use Port 443 TCP/TLS to ensure compatibility with strict cellular and corporate firewalls.
- **On-Device Migration**: For production scale, move to on-device inference (YOLO10 with MIT license) to eliminate all WebRTC and cloud operational costs.
