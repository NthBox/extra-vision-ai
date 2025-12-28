# Scoping: Local On-Device Inference via YOLOv10 (Model-Agnostic)

## 1. Objective
Eliminate recurring cloud costs and connectivity dependency by implementing high-performance, on-device inference using a local YOLOv10 model. The architecture will be strictly model-agnostic to allow seamless future swaps to YOLOX or other open-source models (e.g., Apache 2.0 / MIT licensed models).

## 2. Tech Stack
- **AI Model**: YOLOv10 Nano (MIT License).
- **Inference Engine**: Native Mobile ML Frameworks (CoreML for iOS / TensorFlow Lite for Android).
- **Bridge**: `react-native-vision-camera` or equivalent high-performance native frame processor.
- **Training Environment**: MacBook Air M3 (2024), 16GB RAM, using Apple Silicon GPU acceleration (`device='mps'`).
- **State Management**: Zustand (useVisionStore) using a model-agnostic interface.

## 3. Training & Data Pipeline
To obtain the local model weights without Roboflow export fees:

### A. Data Acquisition
- **Source**: Export the labeled dataset from Roboflow in **YOLOv8** format (compatible with YOLOv10).
- **Secondary Sources**: Support for other datasets (COCO, OpenImages) by converting them to the standard YOLO `.yaml` format used by Ultralytics.

### B. Local Training (MacBook Air M3)
- **Framework**: Ultralytics Python library.
- **Acceleration**: Utilize Metal Performance Shaders (MPS) for ~10x speedup over CPU.
- **Estimated Duration**: 
    - YOLOv10n: ~1.5 - 2.5 hours for 100 epochs.
- **Command**:
  ```python
  model.train(data='data.yaml', epochs=100, imgsz=640, device='mps')
  ```

## 4. Model-Agnostic Architecture
Following the guide in `Refactor/ToDo/local-model-agnostic.md`:

### A. Standard Inference Interface
The UI components (HUD, 3D View) will only consume a standardized detection array:
```typescript
interface Detection {
  id: string;
  label: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, w, h] normalized
}
```

### B. Adapter Pattern
- **YOLOv10 Adapter**: Maps the `[x,y,w,h]` output directly to the interface.
- **Future YOLOX Adapter**: Will handle raw tensor decoding and NMS before mapping to the same interface.

## 5. UI/UX Implementation
- **Additive Feature**: A new "Local" or "Off-Grid" mode button in the compact control bar.
- **Mode Logic**: When active, the app stops WebRTC/HTTP traffic and initializes the native frame processor.
- **Non-Breaking**: Manual and Cloud Real-time modes remain fully functional as alternatives.

## 6. Implementation Checklist
- [ ] Set up local Python environment with `ultralytics` and `yolov10`.
- [ ] Export Roboflow dataset and train YOLOv10n on M3 MacBook.
- [ ] Convert `.pt` weights to `.mlmodel` (iOS) and `.tflite` (Android).
- [ ] Implement `LocalInferenceAdapter` to standardize box formats.
- [ ] Add the "Local Mode" button to `CameraScreen.tsx`.
- [ ] Integrate native frame processing loop.
