# Technical Specification: Extra Vision 3D Visualization

## 1. Component Architecture

### `ThreeViewContainer (src/components/ThreeView/index.tsx)`
- Renders the `<Canvas />` from `@react-three/fiber`.
- Configures `PerspectiveCamera` with a standard FOV (60-75 degrees).
- Setup basic lighting: `AmbientLight` and `DirectionalLight`.

### `EgoVehicle (src/components/ThreeView/EgoVehicle.tsx)`
- Position: `[0, 0, 0]` (ground level).
- Mesh: Stylized Box (initially) or low-poly Car model.
- Color: `#ffffff` or Tesla-inspired light grey.

### `GroundPlane (src/components/ThreeView/GroundPlane.tsx)`
- Large `PlaneGeometry` rotated -90 degrees on X.
- `GridHelper` or custom shader for a dark-themed, perspective-enhancing grid.
- Material: `MeshStandardMaterial` with dark color (`#050505`).

### `DetectionRenderer (src/components/ThreeView/DetectionRenderer.tsx)`
- Maps over the `detections` array from `useVisionStore`.
- For each `Detection`, renders a `WorldObject` component.

### `WorldObject (src/components/ThreeView/WorldObject.tsx)`
- Props: `detection: Detection`.
- State: Uses `useFrame` or `lerp` for smooth transitions.
- **Positioning Math**:
  - `groundY = 0`
  - `distZ = -(Math.pow(1 - (bbox.y + bbox.h) / imgHeight, 2) * depthScale)`
  - `posX = (bbox.x + bbox.w / 2 - imgWidth / 2) / imgWidth * distZ * lateralScale`
- **Visuals**:
  - Cars/Trucks: Cuboids scaled to standard vehicle dimensions.
  - Pedestrians: Tall cylinders.
  - Color: Based on `label` (e.g., Car = Blue, Person = Yellow).

## 2. Store Integration
- **New State**: `visualizationMode: 'CAMERA' | '3D'` (default: `'CAMERA'`).
- **New Action**: `setVisualizationMode(mode: 'CAMERA' | '3D')`.

## 3. Coordination Logic
- The 3D view must continue to receive updates even when the camera is hidden.
- Since `useRealTimeInference` is a hook in `CameraScreen`, it will stay active as long as `CameraScreen` is mounted.
- The 3D Canvas will be rendered *instead* of the video feed but *behind* the HUD.

## 4. Performance Optimizations
- Use `instancedMesh` if object count exceeds 50 (unlikely for road scenarios).
- Limit the draw distance of the ground plane.
- Throttle `useFrame` updates if device temperature rises.

## 5. UI Requirements
- Add a "3D" toggle button to the `CameraScreen` bottom controls.
- Ensure the toggle is accessible in both portrait and landscape modes.
