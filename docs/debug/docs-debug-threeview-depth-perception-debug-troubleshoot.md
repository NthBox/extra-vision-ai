# Debug & Troubleshoot: ThreeView Object Depth and Scale Alignment

## Issue Description
When testing in real-world environments with cars and pedestrians, detected objects in the 3D "Simulated" view appeared significantly further away and smaller than they appeared in the actual camera feed. This created a lack of realism and made the 3D visualization feel disconnected from the physical environment.

---

## Debugging Methods
1.  **Code Review**: Analyzed the mathematical mapping in `WorldObject.tsx` specifically for the `SIMULATED` mode.
2.  **Visual Comparison**: Compared bounding box positions (y-coordinates) in the camera view with their corresponding Z-depth in the 3D world.
3.  **Parameter Analysis**: Evaluated the impact of `MAX_RANGE` (visual horizon) and the power curve exponent used for depth interpolation.

---

## Troubleshooting & Analysis
The "distant" feel was caused by a depth mapping that was too linear/shallow:
*   `MAX_RANGE` of 80 meters was too expansive for a mobile screen, pushing objects towards the horizon too quickly.
*   A power curve exponent of `2.5` didn't bring objects towards the bottom of the screen (the "near field") fast enough.
*   The virtual 3D camera was positioned too high (8m) and too far back (12m), making objects appear smaller in screen-space.

---

## Approaches That Worked

### 1. Compressing the Depth World (Implemented)
By reducing `MAX_RANGE` from `80` to `60`, the entire 3D world was "squashed" closer to the ego-vehicle. This ensures that an object at the edge of detection range is perceived as 60m away instead of 80m.

### 2. Steepening the Depth Curve (Implemented)
Changing the depth power curve exponent from `2.5` to `3.5`.
*   **Math**: `distZ = -Math.pow(1 - t, 3.5) * MAX_RANGE`
*   **Result**: As an object moves down the camera frame (increasing `t`), its 3D position moves towards the car much more aggressively. This replicates the "looming" effect seen in advanced ADAS visualizations like Tesla's.

### 3. Virtual Camera Nudging (Proposed/Documented)
Moving the virtual chase-camera lower (`8m` -> `6m`) and closer (`12m` -> `10m`) to increase the visual scale of 3D objects. (Documented in `Refactor/ToDo/refactor-3d-camera-tuning.md` for future use).

---

## Lessons Learned & Prevention
*   **Simulated vs. Real IPM**: Simulated "top-down" views require much more aggressive non-linear curves than real Inverse Perspective Mapping (IPM) to feel "right" to a human user.
*   **Screen Space is King**: On mobile devices, visual scale is often more important than mathematical accuracy. Pulling objects closer than they "actually" are often results in a better UX.
*   **Dual Lever Control**: Always treat depth mapping (Object Z) and camera position (Chase Cam Z/Y) as separate levers. Fix the mapping first, then tune the camera for scale.
