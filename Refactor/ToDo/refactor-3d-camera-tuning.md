# Refactor: 3D Camera Tuning for Realism

## Overview
Based on real-world testing with cars and pedestrians, the current 3D visualization feels "distant." While depth mapping in `WorldObject.tsx` handles the relative positioning of objects, the virtual 3D camera's position and orientation dictate the perceived scale and intimacy of the scene.

This document outlines the proposed changes to the 3D camera configuration to make detected objects appear larger, closer, and more realistic (Tesla-style "chase cam").

---

## 1. Current 3D Camera Configuration
In `src/components/ThreeView/index.tsx`, the camera is currently positioned significantly high and far back:

*   **Position**: `[0, 8, 12]` (8 meters high, 12 meters behind ego-vehicle)
*   **Rotation**: `[-0.45, 0, 0]` (~25 degrees tilt down)
*   **FOV**: `65`

### Issues:
1.  **Distant Perspective**: Being 12 meters behind the car makes even large objects (trucks/buses) look small on the mobile screen.
2.  **Birds-Eye Feel**: The 8m height creates a "drone" perspective rather than a "driving" perspective.
3.  **Scale Mismatch**: Objects at the horizon look like miniatures rather than looming vehicles.

---

## 2. Proposed Tuning
Moving the "virtual eye" closer to the action increases the screen-space occupied by 3D objects.

### Implementation Details (`src/components/ThreeView/index.tsx`):

```typescript
// Proposed update to ThreeViewContainer
export const ThreeViewContainer = () => {
  const { cameraConfig, threeViewMode } = useVisionStore();
  
  // Camera settings based on mode
  const cameraPos: [number, number, number] = threeViewMode === 'SIMULATED' 
    ? [0, 6, 10] // Lower (6m) and closer (10m) for more realism and larger objects
    : [0, cameraConfig.height, 0]; 
    
  const cameraRot: [number, number, number] = threeViewMode === 'SIMULATED'
    ? [-0.5, 0, 0] // Slightly steeper tilt (from -0.45) to match the closer position
    : [cameraConfig.pitch, 0, 0]; 

  const cameraFov = threeViewMode === 'SIMULATED' ? 65 : cameraConfig.fov;
  // ...
}
```

---

## 3. Expected Impact

### Visual Scale
By moving the camera from `12m` to `10m` back and `8m` to `6m` down:
*   **Object Size**: Detected objects will appear ~20-30% larger on screen.
*   **Perspective**: The "steeper" tilt (`-0.5` rad) ensures the ground plane remains dominant and the ego-vehicle stays grounded in the frame.
*   **Intimacy**: The view feels more like an integrated part of the driving experience rather than a remote observation.

### Depth Perception
Combined with the `MAX_RANGE` and `Power Curve` adjustments in `WorldObject.tsx`, this camera move completes the "Simulated" look by matching the virtual lens to the aggressive depth mapping.

---

## 4. Next Steps
*   [ ] Apply the `cameraPos` and `cameraRot` changes in `src/components/ThreeView/index.tsx`.
*   [ ] Test in various lighting conditions to ensure shadows and fog still behave correctly with the closer camera.
*   [ ] Consider adding a "User Offset" in the store to allow fine-tuning the chase-cam height/distance via UI sliders.
