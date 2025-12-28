# Feature Solution: Local On-Device Inference (MVP)

## 1. Executive Summary
The "Local Mode" feature introduces on-device computer vision inference to the Extra Vision AI platform. By shifting from cloud-based (WebRTC/HTTP) inference to local execution using YOLOv10 Nano, the application achieves zero-latency visual assistance, eliminates data transfer costs, and ensures operational stability in "off-grid" environments where cellular connectivity is intermittent or restricted.

## 2. Problem Statement
Cloud-based real-time inference, while powerful, faces several critical challenges:
- **Network Dependency**: P2P WebRTC often fails on restricted WiFi (e.g., Xfinity) or symmetric NAT (cellular) without expensive TURN relays.
- **Latency**: Even with optimized proxies, round-trip times are subject to network jitter.
- **Cost**: High-frequency inference (10+ FPS) incurs significant per-image costs on platforms like Roboflow.
- **Privacy**: Streaming driver POV video to the cloud may be a concern for some users.

## 3. The Solution: MVP Generalization
To rapidly validate local performance, we utilize a **Pre-Trained First** strategy. Instead of waiting for custom dataset collection, the MVP uses `yolov10n.pt` weights pre-trained on the COCO dataset.

### 3.1 Architectural Overview
The solution implements a model-agnostic bridge within the React Native application:
- **Frame Processor**: Integrates with `react-native-vision-camera` to tap into the raw hardware camera feed.
- **Native Inference**: Executes `.mlmodel` (iOS/CoreML) or `.tflite` (Android) binaries directly on the device's GPU/NPU.
- **Inference Adapter**: A lightweight translation layer that maps COCO labels (e.g., "car") to internal system labels (e.g., "Vehicle") and normalizes coordinates for the SVG HUD.

### 3.2 Technical Specifications
- **Model**: YOLOv10 Nano (MIT License).
- **Target Latency**: < 50ms end-to-end.
- **Input Resolution**: 640x640 (standard YOLOv10 input).
- **Coordinate Mapping**: Top-left [x, y, w, h] normalized to [0, 1].

## 4. Implementation Details

### State Integration
A new `isLocalMode` state is added to `useVisionStore`. When active, it:
1. Suspends WebRTC/HTTP inference loops.
2. Initializes the `useLocalInference` hook.
3. Updates the `HUDOverlay` to show a "LOCAL" status indicator.

### Component Changes
- **CameraScreen**: Updated with a "LOC" toggle button in the control bar.
- **HUDOverlay**: Updated to render bounding boxes from the local detections array, ensuring consistent visualization across all modes.

## 5. Future Roadmap & Iterations

### Phase 2: Active Learning Distillation
Once the local pipeline is validated, we will swap the general COCO model with a specialized model distilled from **Meta SAM3**.
- **Specialized Classes**: Emergency Vehicles (Ambulance, Police), School Buses, and specific road hazards.
- **Active Learning**: Throttled auto-annotation on-device to continuously improve the model without manual labeling.

### Phase 3: Spatial Awareness
- **Depth Estimation**: Incorporating lightweight monocular depth models alongside YOLO.
- **Temporal Tracking**: Utilizing the temporal consistency of video frames to improve detection stability and reduce flicker.

## 6. References
- [Local Inference Scope](../../Requirements/extra-vision-inference-real-time-local-model-yolo/extra-vision-inference-real-time-local-model-yolo-mvp-generalization.md)
- [Technical Spec](../../Requirements/extra-vision-inference-real-time-local-model-yolo/extra-vision-inference-real-time-local-model-yolo-spec.md)
- [Implementation Tasks](../../Requirements/extra-vision-inference-real-time-local-model-yolo/extra-vision-inference-real-time-local-model-yolo-tasks.md)
- [Ultralytics YOLOv10 Documentation](https://docs.ultralytics.com/models/yolov10/)
