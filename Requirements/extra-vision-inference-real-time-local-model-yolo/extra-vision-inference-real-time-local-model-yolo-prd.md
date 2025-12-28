# PRD: Local On-Device Inference via Pre-Trained YOLOv10 (MVP Generalization)

## 1. Objective
Implement a local inference path in the Extra Vision AI mobile app using a pre-trained YOLOv10 Nano model. This "Local Mode" eliminates cloud dependency and latency for common object detection (cars, pedestrians), serving as a foundation for future specialized model distillation.

## 2. Integration with Existing Codebase

### 2.1 State Management (`src/store/useVisionStore.ts`)
- **Action**: Add `isLocalMode` boolean and `setLocalMode` setter to the store.
- **Action**: Update `modelMode` to potentially include 'LOCAL' or handle it as a separate toggle. Given the current structure, a separate `isLocalMode` toggle is cleaner for MVP to switch between Cloud (WebRTC/HTTP) and Native.

### 2.2 UI Layer (`src/components/CameraScreen.tsx`)
- **Action**: Add a "LOCAL" button to the `bottomControlsBar`.
- **Logic**: 
    - When `isLocalMode` is active, disable `isRealTimeEnabled` (WebRTC) and the manual capture loop.
    - Switch the camera view from `expo-camera` (or `RTCView`) to a frame-processor-enabled camera component. Note: For high performance, we will eventually need `react-native-vision-camera`, but for MVP testing, we can implement the logic toggle first.

### 2.3 Inference Logic
- **New Hook**: `src/hooks/useLocalInference.ts`.
- **Role**: This hook will initialize the local model (CoreML/TFLite) and provide a `processFrame` function.
- **Mapping**: It must map the raw output of YOLOv10 (COCO labels) to the existing `Detection` interface used by the `HUDOverlay` and `ThreeView`.

### 2.4 HUD & Visualization (`src/components/HUDOverlay.tsx`)
- **Non-Destructive**: The `HUDOverlay` already consumes `detections` from the store. No changes are needed to the rendering logic if the `LocalInferenceAdapter` maps the output correctly.
- **Indicator**: Add a "LOCAL" SVG indicator (similar to the "LIVE" one) to show when the local model is active.

## 3. Technical Constraints
- **Model Format**: Must be converted from `.pt` to `.mlmodel` (iOS) or `.tflite` (Android) using the `ultralytics` export tool.
- **Performance**: Targeting < 50ms per frame on iPhone 15 Pro hardware.
- **Library Change**: Integrating `react-native-vision-camera` will be required in a subsequent task to support real-time frame processors.

## 4. Implementation Scope
This PRD focuses strictly on the **Mobile Project Folder**. No changes to the `proxy` or `Requirements` folder are required for this implementation phase.
