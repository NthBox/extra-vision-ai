# HUD Bounding Box Alignment Debug & Troubleshoot

## Issue Description
Bounding boxes from Roboflow inference were "way off" and not lining up with the objects in the camera view. The misalignment worsened when rotating the device from portrait to landscape.

## Debug Methods
- **Resolution Logging**: Added real-time debug text to the HUD showing `Img` (sensor resolution) vs `Scr` (UI resolution).
- **Visual Analysis**: Used user screenshots to identify that the sensor was returning landscape images (1920x886) while the UI was in portrait (393x852), confirming a 90-degree rotation mismatch.
- **Aspect Ratio Matching**: Calculated and compared aspect ratios to detect orientation shifts.

## Troubleshoot Methods
1. **Initial Approach**: Fixed scaling using hardcoded 640x480. (Failed: Real sensor resolutions vary).
2. **Dynamic Scaling**: Updated store to track actual `imageDimensions` from `takePictureAsync`. (Partial Success: Boxes aligned in portrait but failed in landscape).
3. **Rotation-Aware Mapping**: Implemented a 90-degree coordinate transformation (X->Y, Y->X) when aspect ratios mismatched. (Success for Portrait).
4. **4-Way Orientation**: Attempted `expo-screen-orientation` for precise Landscape Left/Right detection. (Failed: Required native rebuild/Development Client).
5. **Aspect-Ratio Fallback**: Reverted to `useWindowDimensions` with improved "needsRotation" detection logic.
6. **Unified Hybrid Logic (Final)**: Unlocked app orientation in `app.config.js`. This allowed the OS to handle coordinate rotation natively. Switched to 1:1 mapping for all Landscape modes and 90-deg CCW for Portrait.

## Approaches That Worked
- **Unlocked App Orientation**: Changing `app.config.js` to `orientation: "default"` allowed the OS to handle coordinate system shifts correctly.
- **Dynamic Dimension Capture**: Updating the store with the exact width/height of every captured photo.
- **Hybrid Mapping Logic (V4 - Final Solution)**: 
    - **Portrait**: 90-degree CCW transformation (`mappedX = y`, `mappedY = INPUT_WIDTH - x`).
    - **Landscape**: Direct 1:1 mapping for both Left and Right orientations, relying on native OS rotation.
- **SVG Scaling & Offsets**: Correctly calculating `scale` and `offsetX/Y` to account for the "cover" crop mode of the camera preview.
- **Native Readability**: Removing forced SVG text rotations in Landscape mode and allowing the native UI rotation to level the labels.

## Lessons Learned & Prevention
- **Leverage Native OS Rotation**: Don't try to manually rotate coordinates if you can unlock the app orientation and let the OS handle it. Manual rotations often fight against built-in sensor-to-UI transforms.
- **Sensor vs. UI**: Mobile camera sensors are almost always landscape. The UI must handle the 90-degree rotation manually *only* in Portrait mode.
- **Native Dependency Caution**: Avoid adding new native modules (`expo-screen-orientation`) mid-debugging if the user is using a standard Expo Go environment. Rebuilding the development client is necessary after adding `expo-screen-orientation`.
- **Reference Error Prevention**: Always initialize variables used in SVG transforms (like `textRotation`) outside of conditional blocks.
- **Pro Mode Stability**: Adding a `try-catch` wrapper around `ScreenOrientation` calls allows the app to run on standard Expo Go while still providing pro features on Development Clients.
