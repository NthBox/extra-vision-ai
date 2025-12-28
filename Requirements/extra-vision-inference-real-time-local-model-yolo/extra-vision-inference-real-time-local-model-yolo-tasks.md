# Tasks: Local On-Device Inference via YOLOv10 (Incremental Implementation)

## Phase 1: State & UI Preparation
- [ ] **Task 1: Update Vision Store**
  - Add `isLocalMode` to `VisionState`.
  - Add `setLocalMode` setter.
  - Ensure `setLocalMode(true)` clears `isRealTimeEnabled`.
  - **Validation**: Verify state change in React DevTools or via temporary debug text.

- [ ] **Task 2: Add Local Toggle to HUD**
  - Add "LOC" button to `bottomControlsBar` in `CameraScreen.tsx`.
  - Style the button to match existing icons (Green when active).
  - **Validation**: Verify button toggles `isLocalMode` and turns green.

## Phase 2: Native Setup & Model Export
- [ ] **Task 3: Export YOLOv10 to Mobile Format**
  - Use Python: `yolo export model=yolov10n.pt format=coreml imgsz=640`.
  - **Validation**: Verify `.mlmodel` file is generated and opens in Xcode.

- [ ] **Task 4: Native Configuration**
  - Add `react-native-vision-camera` and a local inference plugin (e.g., `vision-camera-coreml` or `fast-tflite`).
  - Configure `app.json` for native plugins.
  - Run `npx expo prebuild` to update native projects.
  - **Validation**: Successful build on physical iPhone 15 Pro.

## Phase 3: Inference Bridge & Adapter
- [ ] **Task 5: Implement `useLocalInference` Hook**
  - Create the hook to load the model.
  - Implement the Frame Processor logic.
  - **Validation**: Log raw model outputs to console to verify detection counts.

- [ ] **Task 6: Implement Label Adapter**
  - Map COCO labels to `extra-vision-ai` labels ("Pedestrian", "Vehicle", etc.).
  - Normalize coordinates to screen space.
  - **Validation**: Verify mapped detections appear in `useVisionStore` and match the physical location of objects.

## Phase 4: HUD & Optimization
- [ ] **Task 7: Update HUD Overlay Indicator**
  - Add a "LOCAL" indicator to `HUDOverlay.tsx` (next to the "LIVE" indicator).
  - Ensure it only shows when `isLocalMode` is active.
  - **Validation**: Visual confirmation in the app.

- [ ] **Task 8: Latency Benchmarking**
  - Use `performance.now()` to measure capture-to-HUD latency.
  - Adjust frame rate and resolution to hit < 50ms target.
  - **Validation**: Log average latency over 100 frames.
