# Implementation Tasks: Extra Vision 3D Visualization

## Phase 1: Foundation & State
- [ ] Task 1.1: Install dependencies (`three`, `@react-three/fiber`, `expo-gl`, `expo-three`, `@react-three/drei`).
- [ ] Task 1.2: Update `useVisionStore` to include `visualizationMode` and `setVisualizationMode`.
- [ ] Task 1.3: Add "3D" toggle button to `CameraScreen` UI and verify state changes.

## Phase 2: Core 3D Scene
- [ ] Task 2.1: Create `ThreeViewContainer` with basic `<Canvas />` and camera setup.
- [ ] Task 2.2: Implement `GroundPlane` with a dark grid aesthetic.
- [ ] Task 2.3: Implement `EgoVehicle` placeholder at the center of the scene.
- [ ] Task 2.4: Integrate `ThreeViewContainer` into `CameraScreen` conditional rendering.

## Phase 3: Object Projection & Mapping
- [ ] Task 3.1: Create `DetectionRenderer` to subscribe to store detections.
- [ ] Task 3.2: Implement the math for 2D-to-3D coordinate transformation in `WorldObject`.
- [ ] Task 3.3: Map labels to 3D shapes (Cuboids for cars, Cylinders for people).
- [ ] Task 3.4: Implement color coding for different detection classes.

## Phase 4: Refinement & Performance
- [ ] Task 4.1: Implement smooth interpolation (lerping) for object movement.
- [ ] Task 4.2: Add labels/HUD text inside the 3D scene (using `@react-three/drei` Text).
- [ ] Task 4.3: Optimize rendering for mobile devices (culling, low-poly geometry).
- [ ] Task 4.4: Final visual polish (lighting, shadows, grid fading).
