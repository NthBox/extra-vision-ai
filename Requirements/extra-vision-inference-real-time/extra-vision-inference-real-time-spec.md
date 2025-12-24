# Technical Specification: Real-time Inference via Roboflow WebRTC

## 1. System Architecture
The real-time system follows a WebRTC signaling and data exchange pattern:
1.  **Signaling**: App -> Cloudflare Worker (`/v1/stream/init`) -> Roboflow (Init).
2.  **Streaming**: App (Camera Track) -> Roboflow (WebRTC Video Track).
3.  **Inference**: Roboflow (Inference) -> App (WebRTC Data Channel).

## 2. Dependencies & Integration
- **`@roboflow/inference-sdk`**: Primary client for managing the WebRTC session.
- **`react-native-webrtc`**: Native module for WebRTC support. 
    - *Note*: Requires `expo-dev-client` or a custom development client since it contains native code.
- **`@author.io/react-native-webrtc-expo-plugin`**: Expo config plugin to automate native project configuration.

## 3. Data Flow & State Management

### Zustand State (`useVisionStore`)
```typescript
{
  isRealTimeEnabled: boolean,
  isStreaming: boolean,
  streamingError: string | null,
  // Existing fields
  detections: Detection[],
  isInferring: boolean,
}
```

### Hook Logic (`useRealTimeInference`)
- **Initialization**: 
    ```typescript
    const sdk = new RoboflowInferenceSDK();
    const session = await sdk.connect({
        connector: connectors.withProxyUrl(`${INFERENCE_WORKER_URL}/v1/stream/init`),
        source: cameraStream // Track from expo-camera or react-native-webrtc
    });
    ```
- **Data Handling**:
    ```typescript
    session.on('data', (data) => {
        const predictions = data.predictions;
        setDetections(mapRoboflowToDetection(predictions));
    });
    ```

## 4. Native Interface (Camera)
- Integration between `expo-camera` and `react-native-webrtc`:
    - Since `expo-camera` doesn't natively export a `MediaStream` for WebRTC on all platforms, we may need to use `react-native-webrtc`'s `mediaDevices.getUserMedia` to obtain the track for the SDK, while potentially keeping `expo-camera` for the preview if they can coexist, or switching to a `RTCView` for preview during real-time mode.

## 5. Proxy API Specification
- **Endpoint**: `POST /v1/stream/init`
- **Request Body**: (Sent by SDK)
- **Response Body**: (Returned by Roboflow)
    ```json
    {
      "session_id": "...",
      "webrtc_config": { ... }
    }
    ```

## 6. Error Handling
- **Connection Timeout**: 10 seconds.
- **Retry Strategy**: 3 attempts for signaling, then fallback to manual mode.
- **Permissions**: Ensure `NSCameraUsageDescription` and Android permissions are correctly requested.

