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

---

## Issue Resolution (2025-01-XX): Local Model Distraction Filtering (TV/Monitor Removal)

### Problem Identified
During home testing, the local nano model (YOLOv10n) was detecting the TV/Laptop/Monitor as the primary object with high confidence, effectively "blocking" detection of the cars/people inside the screen. The label mapping was renaming road objects but allowing all other COCO categories (like `tv`, `laptop`) to pass through to the HUD.

### Debug Methods
- **Visual Verification**: Noticed `tv` and `laptop` labels appearing on screen in local mode.
- **Code Review**: Identified that `COCO_LABEL_MAP[det.label] || det.label` in `useLocalInference.ts` was explicitly falling back to the raw label if not found in the map, instead of filtering it out.

### Troubleshoot Methods
- **Class Analysis**: Reviewed `src/native/ios/DetectObjectsPlugin.swift` to see the full list of 80 COCO classes available to the model.
- **Filter Implementation**: Tested adding a `.filter()` stage to the worklet pipeline.

### Approaches That Worked
1. **Explicit Road Object Filtering**: Added `results.filter(det => COCO_LABEL_MAP[det.label] !== undefined)` to ensure only Pedestrians, Vehicles, and Cyclists are processed.
2. **Strict Label Mapping**: Changed the mapping logic to strictly use the mapped label from `COCO_LABEL_MAP`, removing the raw label fallback.
3. **Filtered Log Output**: Added a debug log when objects are found but all are filtered out (e.g., pointing at a TV).

### Implementation Details
**File Modified**: `src/hooks/useLocalInference.ts`

**Change**:
```typescript
// Filter out labels not in our road-object map (ignore tv, laptop, etc.)
const roadResults = results.filter(det => COCO_LABEL_MAP[det.label] !== undefined);

const mappedDetections: Detection[] = roadResults.map((det, index) => {
  // ... transformation logic ...
  return {
    bbox: [x, y, w, h],
    label: COCO_LABEL_MAP[det.label], // Strictly use mapped label
    score: det.confidence,
  };
});
```

### Lessons Learned & Prevention
- **Strict Allow-lists**: For domain-specific AI apps (like automotive safety), always use a strict allow-list for labels rather than a fallback. This prevents "noise" from general-purpose datasets (COCO) from interfering with the specific use case.
- **Model Hierarchy Awareness**: Be aware that nano models often latch onto dominant geometric shapes (like screens). Filtering these at the post-processing layer forces the system to remain useful even in non-ideal testing environments.
- **Worklet Lints**: VisionCamera worklets are sensitive to API changes. Always verify `VisionCameraProxy` method signatures (like adding `{}` to `initFrameProcessorPlugin`) when updating worklet logic.

