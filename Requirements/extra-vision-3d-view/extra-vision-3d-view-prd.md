# PRD: Extra Vision 3D Visualization (Digital Twin)

## 1. Goal
Implement a 3D visualization mode that replaces the live camera feed with a "Digital Twin" view of the environment, inspired by Tesla and Waymo's FSD displays.

## 2. Existing Infrastructure Analysis
- **Framework**: React Native with Expo.
- **State Management**: `useVisionStore` (Zustand) manages detections, real-time status, and image dimensions.
- **Inference**: `useRealTimeInference` provides a WebRTC stream and updates the `detections` array.
- **UI**: `CameraScreen` currently toggles between `RTCView` (WebRTC) and `CameraView` (local).

## 3. Implementation Plan

### 3.1. State Updates (`src/store/useVisionStore.ts`)
- Add `visualizationMode`: `'CAMERA' | '3D'`.
- Add `setVisualizationMode` action.

### 3.2. 3D Component Architecture (`src/components/ThreeView/`)
- Create a new directory for 3D components.
- **`ThreeViewContainer.tsx`**: The main entry point using `@react-three/fiber`'s `Canvas`.
- **`EgoVehicle.tsx`**: Renders the user's car at the center/bottom.
- **`GroundPlane.tsx`**: Renders a dark grid with perspective.
- **`DetectedObject.tsx`**: Renders 3D boxes/meshes for each detection.
- **`SceneManager.tsx`**: Orchestrates the camera and lights.

### 3.3. Projection Logic
- **Coordinate System**: Three.js standard (X: left/right, Y: up/down, Z: forward/back).
- **Depth Estimation**: 
    - Use the vertical position of the bounding box bottom to calculate distance.
    - `z = constant / (bbox_y_bottom / screen_height)`.
- **Lateral Positioning**: 
    - `x = (bbox_center_x / screen_width - 0.5) * z * fov_correction`.

### 3.4. Integration in `CameraScreen.tsx`
- Add a toggle in the `HUDOverlay` or `CameraScreen` controls to switch `visualizationMode`.
- Conditional rendering:
    ```tsx
    {visualizationMode === '3D' ? (
      <ThreeViewContainer detections={detections} />
    ) : (
      isRealTimeEnabled ? <RTCView ... /> : <CameraView ... />
    )}
    ```

## 4. Dependencies to Add
- `three`
- `@types/three`
- `@react-three/fiber`
- `expo-gl`
- `expo-three`
- `@react-three/drei` (optional but recommended for helper components)

## 5. Non-Destructive Patterns
- The new 3D view will be an optional layer.
- No changes to existing inference logic or WebRTC handling.
- Existing `HUDOverlay` will remain visible on top of the 3D view.
