# Debug & Troubleshoot: 3D Alignment and Synthetic Simulated View

## Issue: 3D Object Misalignment and Depth Compression
- **Symptoms**: 3D objects were appearing at incorrect depths, "squashed" towards the center of the screen, or invisible (floating at infinity).
- **Cause**: 
    1.  **Coordinate Inconsistency**: Different hooks were providing mixed formats (center-based vs. top-left corner-based coordinates), causing 2D/3D math conflicts.
    2.  **Physical Model Limitations**: Pointing a phone at a flat computer monitor broke the Inverse Perspective Mapping (IPM) math, which assumes a horizontal ground plane.
    3.  **Lateral Collapse**: Near-car objects collapsed into the center because lateral scaling was linearly tied to depth (Z), which becomes zero at the bumper.
    4.  **Optical Center Mismatch**: The 3D world center was not aligned with the camera's physical center, causing objects to shift left and pedestrians to move into the vehicle's path.

## Debug Methods
- **Visual Cross-Verification**: Toggled between 2D HUD and 3D View to compare the bounding box base position against the 3D mesh base.
- **Log Inspection**: Monitored normalized coordinate values (`normX`, `normY`) to identify when objects were hitting the horizon/infinity math singularities.
- **Preset Isolation**: Tested across Wide, Ultra-Wide, and Tele presets to isolate lens-specific FOV errors.

## Troubleshoot Methods
- **Standardization**: Enforced a single top-left coordinate standard `[x, y, w, h]` across all inference hooks.
- **Synthetic Perspective (Tesla-style)**: Implemented a "Simulated View" that uses relative screen percentages rather than physical trigonometry, ensuring stability in non-ideal environments (like testing against monitors).
- **Decoupled Scaling**: Introduced a "Base Lane Width" in the 3D world that prevents side-lane objects from merging into the Ego car when close.
- **Trapezoidal Projection**: Implemented a road-width mapping that is narrower at the horizon (24m) and wider at the bumper (14m) to match real-world perspective.
- **Horizontal Calibration**: Added `L` (Left) and `R` (Right) nudge controls to calibrate the optical center offset dynamically.

## Approaches That Worked
- **Power-Curve Depth**: Using a quadratic/power curve (`Math.pow(1-t, 2.5)`) for simulated depth successfully pulled middle-ground objects closer, matching human intuition.
- **Low-Profile Chase Cam**: Moving the 3D camera to a tighter position (8m behind, 5m height) anchored the Ego car at the bottom edge and provided an intimate "one car behind" perspective.
- **Compact UIUX**: Consolidating 3D/SIM/REAL toggles into a single bottom row significantly improved the testing workflow.
- **Center Calibration**: Allowing for a `horizontalOffset` in the projection math successfully aligned the lead vehicle with the Ego path.

## Prevention for Future Implementation
- **Always stick to one coordinate standard** (Top-Left) for bounding boxes from the start of the data pipeline.
- **Distinguish between Physical and Synthetic views early**; physical math is for surveying, while synthetic math is for user-facing visualizations.
- **Include user calibration controls** for optical center offsets, as physical mounting will always vary between vehicles.
- **Use trapezoidal road mapping** for 3D views to prevent the "fan" distortion effect where objects drift out of their lanes.
