# PRD-LLM: Local On-Device Inference via Pre-Trained YOLOv10 (MVP Generalization)

## 1. Vision & Objective
The primary goal is to bypass the complexity of custom model training and dataset collection to immediately validate the core "Off-Grid" (Local Mode) capability of Extra Vision AI. By leveraging a pre-trained YOLOv10 Nano model, we can verify the high-performance native frame processing pipeline and the accuracy of HUD/3D visualizations in real-time on-device environments.

## 2. Core Feature: MVP Local Mode
- **Zero-Latency Inference**: Use native mobile hardware (CoreML/TFLite) to process camera frames locally.
- **Pre-Trained Intelligence**: Utilize `yolov10n.pt` weights (COCO dataset) to detect standard traffic participants (cars, pedestrians, trucks, buses).
- **Validation Focus**: 
    - Smoothness of the `react-native-vision-camera` frame processor bridge.
    - Precision of the SVG HUD overlay alignment with detected objects.
    - Accuracy of depth/distance estimation in the 3D ThreeView.

## 3. Tech Stack Requirements
- **Model**: YOLOv10 Nano (MIT License).
- **Runtime**: CoreML for iOS (primary target for iPhone 15 Pro).
- **Bridge**: High-performance Native Frame Processor.
- **State Management**: Zustand `useVisionStore` with local inference toggle.
- **Frontend**: React Native / Expo.

## 4. User Experience (MVP)
- A "Local" button in the HUD controls.
- When toggled on:
    - WebRTC/Cloud inference stops.
    - Local CoreML model starts processing frames.
    - HUD shows "LOCAL" indicator.
    - Detections are rendered instantly with lower latency than cloud modes.

## 5. Success Metrics
- End-to-end latency < 50ms (capture to HUD update).
- Correct mapping of COCO labels (e.g., "car" -> "Vehicle", "person" -> "Pedestrian") in the HUD.
- No thermal throttling or app crashes during 5 minutes of continuous local inference.

## 6. Future Roadmap (Phase 2)
Transition from general COCO weights to specialized emergency vehicle weights (Ambulance, Police) using the same architectural adapters, once the integration is validated.
