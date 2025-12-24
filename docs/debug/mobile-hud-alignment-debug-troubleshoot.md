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

## Approaches That Worked
- **Dynamic Dimension Capture**: Updating the store with the exact width/height of every captured photo.
- **Coordinate Transformation**: 
    - `mappedX = y`
    - `mappedY = INPUT_WIDTH - x`
- **SVG Scaling & Offsets**: Correctly calculating `scale` and `offsetX/Y` to account for the "cover" crop mode of the camera preview.
- **Rotation-Aware Labels**: Applying SVG `transform` to labels to keep text readable in horizontal mode.
- **Pro Orientation Mapping (V2)**: Integrated `expo-screen-orientation` to handle all 4 device orientations (Portrait, Portrait Down, Landscape Left, Landscape Right). This ensures that bboxes and text remain perfectly aligned even when the phone is flipped 180 degrees.

## Lessons Learned & Prevention
- **Sensor vs. UI**: Mobile camera sensors are almost always landscape. The UI must handle the 90-degree rotation manually if the OS hasn't already rotated the image.
- **Native Dependency Caution**: Avoid adding new native modules (`expo-screen-orientation`) mid-debugging if the user is using a standard Expo Go environment, as it triggers a "native module not found" crash.
- **Pro Mode Requirement**: Upgrading to `expo-screen-orientation` requires a native build or Development Client. The code now includes a `try-catch` safety net to prevent crashes on standard Expo Go while still supporting the pro feature.
- **Device Differences**: Landscape Left vs. Landscape Right can invert coordinates; the pro mapping now explicitly handles both to prevent upside-down boxes.

