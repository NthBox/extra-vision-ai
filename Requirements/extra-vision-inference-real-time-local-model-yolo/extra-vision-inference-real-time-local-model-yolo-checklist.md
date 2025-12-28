# Checklist: Local On-Device Inference via YOLOv10 (MVP)

## Phase 1: State & UI
- [ ] `useVisionStore` updated with `isLocalMode` and `setLocalMode`.
- [ ] `setLocalMode(true)` correctly disables `isRealTimeEnabled`.
- [ ] "LOC" toggle button visible in `CameraScreen` bottom bar.
- [ ] Toggle button changes color based on `isLocalMode` state.

## Phase 2: Native & Model
- [ ] `yolov10n.mlmodel` (iOS) and/or `yolov10n.tflite` (Android) exported and available.
- [ ] `react-native-vision-camera` successfully installed and linked.
- [ ] Local inference native plugin configured in `app.json`.
- [ ] App builds and runs on a physical device with local model support.

## Phase 3: Inference Pipeline
- [ ] `useLocalInference` hook initialized and loading the model file.
- [ ] Frame processor capturing frames and passing them to the model.
- [ ] Label adapter mapping COCO classes to app-specific classes.
- [ ] Coordinates correctly normalized to device screen resolution.
- [ ] Detections being pushed to `setDetections` in the store.

## Phase 4: UX & Performance
- [ ] "LOCAL" indicator visible on `HUDOverlay` when active.
- [ ] HUD bounding boxes align correctly with physical objects in local mode.
- [ ] End-to-end latency measured and within < 50ms target.
- [ ] No significant thermal buildup after 5 minutes of usage.
