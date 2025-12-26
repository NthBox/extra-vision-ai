# Checklist: Extra Vision 3D Visualization Implementation

## Phase 1: Setup & State
- [ ] Dependencies installed
- [ ] `useVisionStore` updated with `visualizationMode`
- [ ] 3D Toggle button added to `CameraScreen`

## Phase 2: Basic 3D Environment
- [ ] Three.js Canvas rendering in App
- [ ] Dark grid ground plane visible
- [ ] Ego vehicle (user car) visible at bottom-center
- [ ] View toggles correctly between Camera and 3D

## Phase 3: Dynamic Detections
- [ ] Detection data piped into 3D scene
- [ ] 2D-to-3D projection math verified
- [ ] Cars appearing as 3D boxes in correct relative positions
- [ ] Pedestrians/Other objects appearing as distinct shapes

## Phase 4: UX & Polish
- [ ] Object movement is smooth (no flickering/jumping)
- [ ] Performance remains stable (>30 FPS)
- [ ] Lighting and colors match the "FSD" aesthetic
- [ ] HUD elements remain visible and functional
