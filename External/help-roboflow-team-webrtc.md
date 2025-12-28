Questions for Roboflow Support
Does the SDK support iceTransportPolicy in wrtcParams?
Is this parameter passed to the underlying RTCPeerConnection constructor?
Are there known limitations or issues with this setting?
How should iceTransportPolicy: 'relay' be configured?
Should it be in wrtcParams, webrtc_config, or another location?
Is there a different parameter name or format required?
Is there a way to verify the configuration is applied?
Can we access the underlying RTCPeerConnection to inspect its configuration?
Are there debug logs or methods to confirm the policy is enforced?
Are there known issues with react-native-webrtc and relay-only connections?
Any workarounds or recommended configurations?
Alternative approaches:
Should we provide only TURN servers in iceServers (no STUN) to force relay usage?
Is there a different way to enforce TURN-only connections?
Server-side configuration:
Does Roboflow's WebRTC worker respect iceTransportPolicy in webrtc_config?
Should this be configured differently on the server side?
What We've Tried
Setting iceTransportPolicy: 'relay' in wrtcParams
Passing iceTransportPolicy through proxy to webrtc_config
Setting iceCandidatePoolSize: 0 to prevent pre-gathering
Ensuring iceServers array is empty (relying on turnConfigUrl)
Verifying Twilio TURN servers are correctly fetched and returned
Increased connection timeout to 45 seconds to account for cold starts
Expected Behavior
When iceTransportPolicy: 'relay' is set, the client should:
Skip STUN candidate gathering entirely
Only gather relay (TURN) candidates
Connect successfully through the TURN server on restricted networks
Additional Context
This is critical for mobile deployments where users are on cellular networks
Without relay-only mode, connections fail on Symmetric NAT (common on cellular)
The Twilio TURN infrastructure is working correctly (verified independently)