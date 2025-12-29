/**
 * Hook to validate bounding box alignment between Local Mode and Manual Mode
 * 
 * This hook can be used in development to verify that the coordinate transformation
 * fix ensures parity between local model detection and server-based detection.
 */

import { useEffect, useRef } from 'react';
import { useVisionStore } from '../store/useVisionStore';
import { 
  validateBoxingAlignment, 
  compareTransformations,
  CoordinateValidationResult 
} from '../utils/validateBoxingAlignment';

interface ValidationState {
  lastLocalDetections: any[];
  lastManualDetections: any[];
  lastFrameDimensions: { width: number; height: number } | null;
  lastIsPortrait: boolean | null;
  validationResult: CoordinateValidationResult | null;
}

export const useBoxingAlignmentValidation = (enabled: boolean = false) => {
  const { detections, imageDimensions, isLocalMode } = useVisionStore();
  const validationStateRef = useRef<ValidationState>({
    lastLocalDetections: [],
    lastManualDetections: [],
    lastFrameDimensions: null,
    lastIsPortrait: null,
    validationResult: null,
  });

  useEffect(() => {
    if (!enabled) return;

    // Store detections based on mode
    if (isLocalMode) {
      validationStateRef.current.lastLocalDetections = detections;
      validationStateRef.current.lastFrameDimensions = imageDimensions;
      // Determine if portrait based on dimensions
      validationStateRef.current.lastIsPortrait = imageDimensions.height > imageDimensions.width;
    } else {
      validationStateRef.current.lastManualDetections = detections;
    }

    // Run validation when we have both local and manual detections
    const state = validationStateRef.current;
    if (
      state.lastLocalDetections.length > 0 &&
      state.lastManualDetections.length > 0 &&
      state.lastFrameDimensions
    ) {
      const result = validateBoxingAlignment(
        state.lastLocalDetections,
        state.lastManualDetections,
        state.lastFrameDimensions.width,
        state.lastFrameDimensions.height,
        state.lastIsPortrait ?? false,
        0.7 // IoU threshold
      );

      state.validationResult = result;

      // Log validation results
      if (result.isValid) {
        console.log('[VALIDATION] ✅ Boxing alignment is valid!', {
          averageIoU: result.details.comparison.averageIoU?.toFixed(3),
          objectCount: {
            local: state.lastLocalDetections.length,
            manual: state.lastManualDetections.length,
          },
        });
      } else {
        console.warn('[VALIDATION] ⚠️ Boxing alignment issues detected:', {
          errors: result.errors,
          warnings: result.warnings,
          averageIoU: result.details.comparison.averageIoU?.toFixed(3),
        });
      }
    }
  }, [enabled, detections, imageDimensions, isLocalMode]);

  // Function to manually trigger validation comparison
  const compareBrokenVsFixed = () => {
    const state = validationStateRef.current;
    if (
      state.lastLocalDetections.length > 0 &&
      state.lastManualDetections.length > 0 &&
      state.lastFrameDimensions
    ) {
      // Note: This requires normalized detections from Swift
      // In practice, you'd need to capture the normalized values before conversion
      console.log('[VALIDATION] To compare broken vs fixed, capture normalized detections from Swift');
    }
  };

  return {
    validationResult: validationStateRef.current.validationResult,
    compareBrokenVsFixed,
  };
};
