# Boxing Alignment Fix Verification

## Problem Summary

The local model's bounding boxes were misaligned because of a coordinate system mismatch:

1. **Swift (DetectObjectsPlugin.swift)**: Normalizes coordinates relative to **effective dimensions** (swapped for portrait)
   ```swift
   let effectiveW = isPortrait ? imgH : imgW
   let effectiveH = isPortrait ? imgW : imgH
   let normX = origX1 / effectiveW  // Normalized relative to effective dimensions
   ```

2. **TypeScript (useLocalInference.ts) - BROKEN**: Multiplies by **raw frame dimensions**
   ```typescript
   const x = det.x * frame.width;  // Uses RAW dimensions, not effective!
   ```

3. **Result**: When orientation differs (portrait UI, landscape sensor), coordinates are misaligned.

## The Fix

Update `useLocalInference.ts` to use the same effective dimensions logic:

```typescript
// Calculate effective dimensions (matches Swift logic)
const isPortrait = frame.height > frame.width;
const effectiveW = isPortrait ? frame.height : frame.width;
const effectiveH = isPortrait ? frame.width : frame.height;

// Convert normalized coordinates using EFFECTIVE dimensions
const x = det.x * effectiveW;
const y = det.y * effectiveH;
const w = det.w * effectiveW;
const h = det.h * effectiveH;
```

## Verification Strategy

### 1. Coordinate System Parity

Both modes should produce bounding boxes in the same coordinate system:
- **Manual Mode**: Server returns pixel coordinates → `useInference` passes through → `HUDOverlay` scales
- **Local Mode (Fixed)**: Swift normalizes to effective dims → TypeScript multiplies by effective dims → Same pixel coordinate system

### 2. Validation Tools

#### `validateBoxingAlignment.ts`
Utility functions to:
- Compare local vs manual detections
- Calculate IoU (Intersection over Union) between boxes
- Validate coordinate system consistency
- Simulate broken vs fixed transformations

#### `useBoxingAlignmentValidation.ts`
React hook to:
- Automatically validate when both modes have detections
- Log validation results
- Compare broken vs fixed implementations

### 3. Testing Procedure

1. **Capture Test Frame**:
   - Point camera at a scene with clear objects (cars, people)
   - Capture the same frame in both modes

2. **Run Manual Mode**:
   - Disable local mode
   - Let manual mode detect objects
   - Note the bounding box positions

3. **Run Local Mode**:
   - Enable local mode
   - Let local model detect objects
   - Note the bounding box positions

4. **Compare Results**:
   ```typescript
   import { validateBoxingAlignment } from '../utils/validateBoxingAlignment';
   
   const result = validateBoxingAlignment(
     localDetections,      // From local mode
     manualDetections,      // From manual mode
     frameWidth,           // e.g., 1920
     frameHeight,          // e.g., 1080
     isPortrait,           // false for landscape
     0.7                   // IoU threshold
   );
   
   console.log('Validation:', result.isValid);
   console.log('Average IoU:', result.details.comparison.averageIoU);
   ```

5. **Expected Results**:
   - ✅ **Fixed**: Average IoU > 0.7, boxes align visually
   - ❌ **Broken**: Average IoU < 0.5, boxes misaligned (especially in portrait)

### 4. Visual Verification

The easiest way to verify is visual:
1. Switch between local and manual modes
2. Observe bounding boxes on the same objects
3. **Fixed**: Boxes should align perfectly
4. **Broken**: Boxes will be offset, especially in portrait orientation

### 5. Log Analysis

Check console logs for coordinate transformations:

**Swift Logs** (DetectObjectsPlugin.swift):
```
[EVAI] LETTERBOX DEBUG - ImgSize: 1920x1080, Scale: 0.333, Pad: 0.0,140.0
[EVAI] COORD DEBUG - Raw: [1.1,151.6,257.2,494.8] -> Orig: [3.4,34.9,771.8,1064.2] -> Norm: [0.002,0.032,0.400,0.953]
```

**TypeScript Logs** (useLocalInference.ts):
```
[EVAI] Box 0 - Normalized: [0.00, 0.05], Pixels: [3, 51], Effective: 1920x1080
```

**Verification**:
- Normalized values from Swift should match what TypeScript receives
- Pixel values should use effective dimensions (not raw frame dimensions)
- In portrait: effective dimensions should be swapped (height x width)

## Why This Fix Works

1. **Consistent Normalization**: Swift normalizes relative to effective dimensions
2. **Consistent Denormalization**: TypeScript multiplies by the same effective dimensions
3. **Same Coordinate System**: Both produce pixel coordinates in the same space
4. **HUDOverlay Compatibility**: Both modes feed the same coordinate format to `HUDOverlay`

## Edge Cases to Test

1. **Portrait Orientation**: UI portrait, sensor landscape
2. **Landscape Orientation**: UI landscape, sensor landscape
3. **Orientation Changes**: Rotate device during detection
4. **Different Resolutions**: Test with different camera presets
5. **Multiple Objects**: Verify all objects align, not just the first

## Success Criteria

- ✅ Average IoU > 0.7 between local and manual detections
- ✅ Visual alignment: boxes appear in same positions
- ✅ No coordinate system errors in validation
- ✅ Works in both portrait and landscape orientations
- ✅ Consistent behavior across different camera resolutions
