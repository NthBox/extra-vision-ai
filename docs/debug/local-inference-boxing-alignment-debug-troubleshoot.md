# Debug & Troubleshoot: Local Inference Boxing Alignment

## Issue Description
Bounding boxes were significantly misaligned with the objects in the camera preview, particularly when switching between portrait and landscape orientations or when the sensor was in a different orientation than the UI.

## Debug Methods
- **Log Analysis**: Inspected `[EVAI] LETTERBOX DEBUG` and `[EVAI] COORD DEBUG` logs from the native Swift plugin.
- **Visual Inspection**: Observed that wide objects (cars) were being boxed with tall rectangles, suggesting an orientation swap.
- **Coordinate Tracing**: Mapped the raw model outputs (640x640 space) to the original image dimensions and then to the screen space.

## Troubleshoot Methods
- Investigated `DetectObjectsPlugin.swift` to see how frames were passed to Vision.
- Analyzed `HUDOverlay.tsx` scaling and rotation logic.
- Verified coordinate normalization math in the native plugin.

## Approaches That Worked
1. **Explicit Orientation Handling**: Passed `CGImagePropertyOrientation` to `VNImageRequestHandler` based on `frame.orientation`. This tells Vision which way is "up" so it can rotate the buffer before inference.
2. **Effective Dimension Scaling**: Updated the letterbox calculation in Swift to use "effective" width and height (swapping if portrait) to match how Vision handles the rotated buffer.
3. **Refined Normalization**: Normalized coordinates relative to the effective dimensions instead of the raw buffer dimensions.
4. **HUD Scaling Sync**: Updated `HUDOverlay.tsx` to match the `aspectFill` behavior of the camera view, ensuring the SVG overlay exactly covers the visible camera area.

## Lessons Learned & Prevention
- **Vision & Orientation**: Always specify orientation when creating a `VNImageRequestHandler` from a `CMSampleBuffer`. Vision does not automatically detect orientation from the buffer metadata in all cases.
- **Sensor vs UI**: Be extremely careful with "width" and "height" when the camera sensor is in landscape but the UI is in portrait. Use "effective dimensions" for any coordinate math.
- **Letterbox Math**: If using `.scaleFit` (letterboxing) in Vision, the padding calculation must match the orientation of the image *after* rotation.
