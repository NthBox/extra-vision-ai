/**
 * Validation utility to compare bounding box alignment between Local Mode and Manual Mode
 * 
 * This utility helps verify that the coordinate transformation fix ensures parity
 * between local model detection and server-based (manual) detection.
 */

import { Detection } from '../store/useVisionStore';

export interface CoordinateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    localMode: {
      detections: Detection[];
      coordinateSystem: 'normalized' | 'pixels';
      effectiveDimensions?: { width: number; height: number };
    };
    manualMode: {
      detections: Detection[];
      coordinateSystem: 'normalized' | 'pixels';
    };
    comparison: {
      sameObjectCount: boolean;
      averageIoU?: number;
      coordinateSystemMatch: boolean;
      dimensionMatch: boolean;
    };
  };
}

/**
 * Calculate Intersection over Union (IoU) between two bounding boxes
 */
function calculateIoU(
  bbox1: [number, number, number, number],
  bbox2: [number, number, number, number]
): number {
  const [x1_1, y1_1, w1, h1] = bbox1;
  const [x1_2, y1_2, w2, h2] = bbox2;
  
  const x2_1 = x1_1 + w1;
  const y2_1 = y1_1 + h1;
  const x2_2 = x1_2 + w2;
  const y2_2 = y1_2 + h2;
  
  // Calculate intersection
  const x1_i = Math.max(x1_1, x1_2);
  const y1_i = Math.max(y1_1, y1_2);
  const x2_i = Math.min(x2_1, x2_2);
  const y2_i = Math.min(y2_1, y2_2);
  
  if (x2_i <= x1_i || y2_i <= y1_i) {
    return 0; // No intersection
  }
  
  const intersection = (x2_i - x1_i) * (y2_i - y1_i);
  const area1 = w1 * h1;
  const area2 = w2 * h2;
  const union = area1 + area2 - intersection;
  
  return union > 0 ? intersection / union : 0;
}

/**
 * Normalize bounding box coordinates from pixels to 0-1 range
 */
function normalizeBbox(
  bbox: [number, number, number, number],
  imageWidth: number,
  imageHeight: number
): [number, number, number, number] {
  const [x, y, w, h] = bbox;
  return [
    x / imageWidth,
    y / imageHeight,
    w / imageWidth,
    h / imageHeight,
  ];
}

/**
 * Convert normalized bounding box to pixel coordinates
 */
function denormalizeBbox(
  bbox: [number, number, number, number],
  imageWidth: number,
  imageHeight: number
): [number, number, number, number] {
  const [x, y, w, h] = bbox;
  return [
    x * imageWidth,
    y * imageHeight,
    w * imageWidth,
    h * imageHeight,
  ];
}

/**
 * Calculate effective dimensions based on orientation
 * This matches the logic in DetectObjectsPlugin.swift
 */
function calculateEffectiveDimensions(
  frameWidth: number,
  frameHeight: number,
  isPortrait: boolean
): { width: number; height: number } {
  return {
    width: isPortrait ? frameHeight : frameWidth,
    height: isPortrait ? frameWidth : frameHeight,
  };
}

/**
 * Validate that local mode coordinates match manual mode coordinates
 * 
 * @param localDetections - Detections from local model (normalized 0-1 relative to effective dimensions)
 * @param manualDetections - Detections from server (pixel coordinates)
 * @param frameWidth - Raw frame width from camera
 * @param frameHeight - Raw frame height from camera
 * @param isPortrait - Whether the frame is in portrait orientation
 * @param tolerance - IoU threshold for considering boxes as matching (default: 0.7)
 */
export function validateBoxingAlignment(
  localDetections: Detection[],
  manualDetections: Detection[],
  frameWidth: number,
  frameHeight: number,
  isPortrait: boolean = false,
  tolerance: number = 0.7
): CoordinateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Calculate effective dimensions (matches Swift logic)
  const effectiveDims = calculateEffectiveDimensions(frameWidth, frameHeight, isPortrait);
  
  // Convert local mode detections from normalized (effective) to pixel coordinates
  // This simulates the FIXED version of useLocalInference.ts
  const localDetectionsInPixels = localDetections.map(det => {
    const [normX, normY, normW, normH] = det.bbox;
    
    // FIXED: Use effective dimensions (matches Swift normalization)
    const pixelX = normX * effectiveDims.width;
    const pixelY = normY * effectiveDims.height;
    const pixelW = normW * effectiveDims.width;
    const pixelH = normH * effectiveDims.height;
    
    return {
      ...det,
      bbox: [pixelX, pixelY, pixelW, pixelH] as [number, number, number, number],
    };
  });
  
  // Manual mode detections are already in pixel coordinates
  const manualDetectionsInPixels = manualDetections;
  
  // Compare detections
  const sameObjectCount = localDetectionsInPixels.length === manualDetectionsInPixels.length;
  if (!sameObjectCount) {
    warnings.push(
      `Object count mismatch: Local=${localDetectionsInPixels.length}, Manual=${manualDetectionsInPixels.length}`
    );
  }
  
  // Calculate average IoU for matching detections
  let totalIoU = 0;
  let matchCount = 0;
  const minDetections = Math.min(localDetectionsInPixels.length, manualDetectionsInPixels.length);
  
  for (let i = 0; i < minDetections; i++) {
    const localBbox = localDetectionsInPixels[i].bbox;
    const manualBbox = manualDetectionsInPixels[i].bbox;
    const iou = calculateIoU(localBbox, manualBbox);
    
    if (iou >= tolerance) {
      totalIoU += iou;
      matchCount++;
    } else {
      warnings.push(
        `Box ${i} IoU too low: ${iou.toFixed(3)} (threshold: ${tolerance}). ` +
        `Local: [${localBbox.map(v => v.toFixed(1)).join(', ')}], ` +
        `Manual: [${manualBbox.map(v => v.toFixed(1)).join(', ')}]`
      );
    }
  }
  
  const averageIoU = matchCount > 0 ? totalIoU / matchCount : 0;
  
  // Validate coordinate system consistency
  // Both should be in pixel coordinates at this point
  const coordinateSystemMatch = true; // Both converted to pixels
  
  // Check if dimensions match
  const dimensionMatch = 
    Math.abs(effectiveDims.width - frameWidth) < 1 && 
    Math.abs(effectiveDims.height - frameHeight) < 1;
  
  if (!dimensionMatch && isPortrait) {
    // This is expected in portrait mode - effective dims are swapped
    // No error, but log for verification
  }
  
  // Validate that coordinates are reasonable (within image bounds)
  const allLocalValid = localDetectionsInPixels.every(det => {
    const [x, y, w, h] = det.bbox;
    return x >= 0 && y >= 0 && 
           x + w <= effectiveDims.width && 
           y + h <= effectiveDims.height;
  });
  
  if (!allLocalValid) {
    errors.push('Some local mode detections are outside image bounds');
  }
  
  const allManualValid = manualDetectionsInPixels.every(det => {
    const [x, y, w, h] = det.bbox;
    return x >= 0 && y >= 0 && 
           x + w <= frameWidth && 
           y + h <= frameHeight;
  });
  
  if (!allManualValid) {
    errors.push('Some manual mode detections are outside image bounds');
  }
  
  // Final validation
  const isValid = 
    errors.length === 0 && 
    averageIoU >= tolerance &&
    coordinateSystemMatch;
  
  return {
    isValid,
    errors,
    warnings,
    details: {
      localMode: {
        detections: localDetectionsInPixels,
        coordinateSystem: 'pixels',
        effectiveDimensions: effectiveDims,
      },
      manualMode: {
        detections: manualDetectionsInPixels,
        coordinateSystem: 'pixels',
      },
      comparison: {
        sameObjectCount,
        averageIoU,
        coordinateSystemMatch,
        dimensionMatch,
      },
    },
  };
}

/**
 * Simulate the BROKEN coordinate transformation (current implementation)
 * This helps verify the fix by showing the difference
 */
export function simulateBrokenTransformation(
  normalizedDetections: Detection[],
  frameWidth: number,
  frameHeight: number,
  isPortrait: boolean
): Detection[] {
  const effectiveDims = calculateEffectiveDimensions(frameWidth, frameHeight, isPortrait);
  
  return normalizedDetections.map(det => {
    const [normX, normY, normW, normH] = det.bbox;
    
    // BROKEN: Uses raw frame dimensions instead of effective dimensions
    const pixelX = normX * frameWidth;  // WRONG - should use effectiveDims.width
    const pixelY = normY * frameHeight; // WRONG - should use effectiveDims.height
    const pixelW = normW * frameWidth;
    const pixelH = normH * frameHeight;
    
    return {
      ...det,
      bbox: [pixelX, pixelY, pixelW, pixelH] as [number, number, number, number],
    };
  });
}

/**
 * Simulate the FIXED coordinate transformation
 */
export function simulateFixedTransformation(
  normalizedDetections: Detection[],
  frameWidth: number,
  frameHeight: number,
  isPortrait: boolean
): Detection[] {
  const effectiveDims = calculateEffectiveDimensions(frameWidth, frameHeight, isPortrait);
  
  return normalizedDetections.map(det => {
    const [normX, normY, normW, normH] = det.bbox;
    
    // FIXED: Uses effective dimensions (matches Swift normalization)
    const pixelX = normX * effectiveDims.width;
    const pixelY = normY * effectiveDims.height;
    const pixelW = normW * effectiveDims.width;
    const pixelH = normH * effectiveDims.height;
    
    return {
      ...det,
      bbox: [pixelX, pixelY, pixelW, pixelH] as [number, number, number, number],
    };
  });
}

/**
 * Compare broken vs fixed transformations to demonstrate the fix
 */
export function compareTransformations(
  normalizedDetections: Detection[],
  manualDetections: Detection[],
  frameWidth: number,
  frameHeight: number,
  isPortrait: boolean
): {
  broken: { detections: Detection[]; iou: number };
  fixed: { detections: Detection[]; iou: number };
} {
  const brokenDetections = simulateBrokenTransformation(
    normalizedDetections,
    frameWidth,
    frameHeight,
    isPortrait
  );
  
  const fixedDetections = simulateFixedTransformation(
    normalizedDetections,
    frameWidth,
    frameHeight,
    isPortrait
  );
  
  // Calculate average IoU for broken vs manual
  let brokenIoU = 0;
  if (brokenDetections.length > 0 && manualDetections.length > 0) {
    const ious = brokenDetections.slice(0, Math.min(brokenDetections.length, manualDetections.length))
      .map((det, i) => calculateIoU(det.bbox, manualDetections[i].bbox));
    brokenIoU = ious.reduce((a, b) => a + b, 0) / ious.length;
  }
  
  // Calculate average IoU for fixed vs manual
  let fixedIoU = 0;
  if (fixedDetections.length > 0 && manualDetections.length > 0) {
    const ious = fixedDetections.slice(0, Math.min(fixedDetections.length, manualDetections.length))
      .map((det, i) => calculateIoU(det.bbox, manualDetections[i].bbox));
    fixedIoU = ious.reduce((a, b) => a + b, 0) / ious.length;
  }
  
  return {
    broken: { detections: brokenDetections, iou: brokenIoU },
    fixed: { detections: fixedDetections, iou: fixedIoU },
  };
}
