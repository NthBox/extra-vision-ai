# Spec: Local On-Device Inference via YOLOv10 (MVP)

## 1. Data Structures

### 1.1 Store Additions (`VisionState`)
```typescript
interface VisionState {
  // ... existing
  isLocalMode: boolean;
  setLocalMode: (enabled: boolean) => void;
}
```

### 1.2 Detection Mapping (Adapter)
The local model output must be normalized to the project's `Detection` interface:
```typescript
interface Detection {
  bbox: [number, number, number, number]; // [x, y, w, h] (top-left, pixels)
  label: string;
  score: number;
}
```
**Label Mapping (COCO -> Extra Vision)**:
- `person` -> "Pedestrian"
- `car`, `truck`, `bus` -> "Vehicle"
- `bicycle`, `motorcycle` -> "Cyclist"

## 2. Component Architecture

### 2.1 `LocalModeToggle`
- **Location**: `src/components/CameraScreen.tsx`
- **Icon**: Text "LOC"
- **Style**: 
  - Default: `rgba(255,255,255,0.1)`
  - Active: `#4CAF50` (Green)
- **Mutual Exclusivity**: Turning on `isLocalMode` must set `isRealTimeEnabled` to `false`.

### 2.2 `useLocalInference` Hook
- **Input**: Camera Frame (via Frame Processor).
- **Output**: Array of `Detection` objects.
- **Dependencies**: 
  - `react-native-fast-tflite` or `react-native-vision-camera-coreml`.
  - Native `.mlmodel` or `.tflite` file.

## 3. Workflow Logic

### 3.1 Local Mode Activation
1. User taps "LOC" button.
2. `useVisionStore` updates `isLocalMode: true`.
3. `CameraScreen` switches from `expo-camera` to `VisionCamera` (or initializes the local frame processor).
4. Local model starts receiving frames at ~10 FPS.
5. Results are written directly to `setDetections`.

### 3.2 Coordination Mapping
- The local model will likely operate on a 640x640 or 640x480 square/rectangle.
- The `HUDOverlay` scaling logic must be verified against the local model's input resolution vs. the device screen resolution.

## 4. Native Requirements
- **iOS**: Add `yolov10n.mlmodel` to the app bundle.
- **Android**: Add `yolov10n.tflite` to `assets/`.
- **Config**: Update `app.json` for any necessary native plugins for local inference.
