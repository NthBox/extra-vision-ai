# Scoping: Local On-Device Inference via Pre-Trained YOLOv10 (MVP Generalization)

## 1. Objective
Rapidly verify the end-to-end integration of the local inference pipeline, HUD overlay, and 3D visualization logic by using pre-trained YOLOv10 Nano weights. This approach bypasses the immediate need for custom dataset collection and training, allowing for immediate testing of the hardware acceleration and UI/UX layers.

## 2. MVP Strategy: "Pre-Trained First"
By utilizing `yolov10n.pt` (pre-trained on the COCO dataset), the app can immediately detect 80 common object classes (cars, people, buses, trucks, etc.) to validate:
- **Native Frame Processing**: Ensuring `react-native-vision-camera` delivers frames to the local model with minimal latency.
- **HUD Alignment**: Verifying that bounding boxes for general traffic align correctly with the camera view.
- **3D World Mapping**: Testing the transformation of 2D detections into the 3D "Digital Twin" view.

## 3. Tech Stack (Simplified MVP)
- **AI Model**: Pre-trained **YOLOv10 Nano** (`yolov10n.pt`).
- **Inference Engine**: CoreML (iOS) / TensorFlow Lite (Android).
- **Bridge**: `react-native-vision-camera` frame processor.
- **Conversion**: Export `yolov10n.pt` directly to `.mlmodel` or `.tflite` via the Ultralytics library.
- **Training**: **NONE** (Skip training to focus on integration).

## 4. Comparison of Goals
| Goal | Use Training? | Data Source | Purpose |
| :--- | :--- | :--- | :--- |
| **Test HUD / 3D Logic** | **No (Skip)** | `yolov10n.pt` | Verify coordinate mapping and UI performance. |
| **Detect general Traffic** | **No (Skip)** | `yolov10n.pt` | Real-world validation of "Off-Grid" mode. |
| **Detect Emergency Vehicles**| **Yes (Future)**| Custom SAM3 Annotated | Production-ready specialized detection. |

## 5. Implementation Checklist (MVP)
- [ ] **Model Export**:
    - [ ] Install `ultralytics` in the local Python environment.
    - [ ] Run export command: `yolo export model=yolov10n.pt format=coreml imgsz=640`.
- [ ] **Mobile Integration**:
    - [ ] Add the exported `.mlmodel` to the Xcode project.
    - [ ] Implement the `LocalInferenceAdapter` to handle standard COCO labels.
- [ ] **Verification**:
    - [ ] Launch "Local Mode" on a physical device.
    - [ ] Confirm detections for standard "car" and "person" labels appear on the HUD.
    - [ ] Verify 3D View accurately reflects the distance and position of detected cars.

## 6. Future-Proofing for Phase 2
While the MVP uses pre-trained weights, the architecture remains model-agnostic. Once the HUD and 3D View logic is stabilized, the "Active Learning" pipeline (SAM3 distillation) can be swapped in by simply replacing the `.mlmodel` file with a custom-trained one without changing the frontend logic.
