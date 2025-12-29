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

---

## Issue Resolution (2025-01-XX): TypeScript Coordinate Denormalization Mismatch

### Problem Identified
After implementing Swift-side effective dimension normalization, TypeScript was still using raw frame dimensions for denormalization, causing coordinate system mismatch:
- **Swift**: Normalizes coordinates relative to effective dimensions (swapped for portrait)
- **TypeScript (Broken)**: Denormalizes using raw frame dimensions
- **Result**: Misalignment, especially in portrait orientation

### Debug Methods
- **Coordinate Flow Analysis**: Traced coordinates from Swift normalization through TypeScript denormalization to HUDOverlay rendering
- **Log Comparison**: Compared `[EVAI] COORD DEBUG` (Swift) with `[EVAI] Box 0` (TypeScript) to identify dimension mismatch
- **Mathematical Verification**: Calculated expected vs actual pixel coordinates for portrait and landscape cases
- **Cross-Mode Comparison**: Compared local mode vs manual mode coordinate systems to ensure parity

### Troubleshoot Methods
- **Code Path Isolation**: Verified manual mode uses separate code path (`useInference.ts`) to ensure fix wouldn't break it
- **Orientation Matrix Testing**: Verified fix handles all 4 orientations (landscapeLeft, landscapeRight, portrait, portraitUpsideDown)
- **Effective Dimension Calculation**: Matched TypeScript logic exactly to Swift's `DetectObjectsPlugin.swift:76-78`
- **Validation Code Creation**: Built validation utilities to compare local vs manual mode detections

### Approaches That Worked
1. **Effective Dimension Calculation in TypeScript**: Added dimension-based portrait detection (`frame.height > frame.width`) matching Swift's orientation-based logic
2. **Coordinate Denormalization Fix**: Changed from `det.x * frame.width` to `det.x * effectiveW` to match Swift's normalization
3. **Enhanced Debug Logging**: Added effective dimensions to debug output for verification: `Effective: WxH`
4. **Validation Utilities**: Created `validateBoxingAlignment.ts` and `useBoxingAlignmentValidation.ts` for automated testing

### Implementation Details
**File Modified**: `src/hooks/useLocalInference.ts` (lines 73-90)

**Change**:
```typescript
// BEFORE (BROKEN):
const x = det.x * frame.width;   // Uses raw dimensions

// AFTER (FIXED):
const isPortrait = frame.height > frame.width;
const effectiveW = isPortrait ? frame.height : frame.width;
const effectiveH = isPortrait ? frame.width : frame.height;
const x = det.x * effectiveW;   // Uses effective dimensions (matches Swift)
```

### Lessons Learned & Prevention
- **Coordinate System Consistency**: When Swift normalizes to effective dimensions, TypeScript MUST denormalize using the same effective dimensions. Never mix raw and effective dimensions in the same coordinate transformation pipeline.
- **Dimension-Based Detection**: Use `frame.height > frame.width` for portrait detection in worklets - it's more reliable than orientation enums and works for all 4 orientations.
- **Cross-Language Parity**: Always verify that normalization in one language matches denormalization in another. Log both sides with the same coordinate values to catch mismatches early.
- **Validation First**: Create validation utilities before implementing fixes to verify the solution works and prevent regressions.
- **Code Path Isolation**: Verify that fixes only affect the intended code path (local mode) and don't break other modes (manual mode) that use separate code paths.
