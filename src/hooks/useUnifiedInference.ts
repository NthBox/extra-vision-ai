import { useCallback, useEffect, useMemo } from 'react';
import { useVisionStore, Detection } from '../store/useVisionStore';
import { useFrameProcessor, VisionCameraProxy } from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';
import { Platform } from 'react-native';

/**
 * COCO Class Mapping for Extra Vision AI
 */
const COCO_LABEL_MAP: Record<string, string> = {
  'person': 'Pedestrian',
  'pedestrian': 'Pedestrian',
  'car': 'Vehicle',
  'vehicle': 'Vehicle',
  'truck': 'Vehicle',
  'bus': 'Vehicle',
  'motorcycle': 'Cyclist',
  'cyclist': 'Cyclist',
  'bicycle': 'Cyclist',
};

// Map internal names back to COCO labels for the native plugin
const REVERSE_LABEL_MAP: Record<string, string> = {
  'Pedestrian': 'person',
  'Vehicle': 'car',
  'Cyclist': 'bicycle',
};

export const useUnifiedInference = () => {
  const { 
    isLocalMode, 
    isRealTimeEnabled, 
    detections, 
    imageDimensions,
    setDetections, 
    setImageDimensions 
  } = useVisionStore();

  // 1. Hardware Detection (iPhone 15+ logic)
  const maxObjects = useMemo(() => {
    if (Platform.OS !== 'ios') return 10;
    return 20; 
  }, []);

  // 2. Shared state for cross-thread communication
  // SIMPLIFIED: Use separate SharedValues to avoid serialization issues
  const pendingSeeds = useMemo(() => Worklets.createSharedValue<any[] | null>(null), []);
  const seedTimestamp = useMemo(() => Worklets.createSharedValue(0), []);
  const shouldUpdateDims = useMemo(() => Worklets.createSharedValue(false), []);

  // Create thread-safe versions of store setters
  const setDetectionsJS = Worklets.createRunOnJS(setDetections);
  const setImageDimensionsJS = Worklets.createRunOnJS(setImageDimensions);

  // 3. Manual Mode Seeding Logic - SIMPLIFIED
  useEffect(() => {
    if (!isLocalMode && detections.length > 0) {
      const now = Date.now();
      
      // Simple debounce - avoid rapid updates
      if (now - seedTimestamp.value < 100) {
        return;
      }

      // Always use current imageDimensions as the source of truth
      const w = imageDimensions.width || 1;
      const h = imageDimensions.height || 1;
      
      // Filter out classes that aren't in our mapping (e.g., "tv", "laptop", etc.)
      const filteredDetections = detections.filter(d => {
        const lowerLabel = d.label.toLowerCase();
        return COCO_LABEL_MAP[lowerLabel] !== undefined;
      });
      
      if (filteredDetections.length === 0) {
        return; // No valid detections to track
      }
      
      if (filteredDetections.length < detections.length) {
        console.log(`[EVAI] JS: Filtered out ${detections.length - filteredDetections.length} invalid classes (e.g., tv, laptop, etc.)`);
      }
      
      console.log(`[EVAI] JS: Seeding tracker with ${filteredDetections.length} objects from ${w}x${h} source`);
      
      // Normalize coordinates to [0,1] space
      // Pass the COCO label directly to native plugin (it expects "car", "person", "bicycle", etc.)
      const normalizedSeeds = filteredDetections.map(d => ({
        label: REVERSE_LABEL_MAP[d.label] || d.label.toLowerCase(),
        confidence: d.score,
        x: Math.max(0, Math.min(1, d.bbox[0] / w)),
        y: Math.max(0, Math.min(1, d.bbox[1] / h)),
        w: Math.max(0, Math.min(1, d.bbox[2] / w)),
        h: Math.max(0, Math.min(1, d.bbox[3] / h)),
      }));

      // Update SharedValues separately (better serialization)
      pendingSeeds.value = normalizedSeeds;
      seedTimestamp.value = now;
      shouldUpdateDims.value = w > 3000; // Photo vs video heuristic
      
      console.log(`[EVAI] JS: Updated SharedValues with timestamp ${now}`);
      console.log(`[EVAI] JS: Seeds:`, JSON.stringify(normalizedSeeds));
    }
  }, [detections, isLocalMode, pendingSeeds, seedTimestamp, shouldUpdateDims, imageDimensions.width, imageDimensions.height]);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    
    if (isRealTimeEnabled) return;
    
    // 1. Initialize Frame Counter
    if ((global as any)._evaiCounter === undefined) (global as any)._evaiCounter = 0;
    (global as any)._evaiCounter++;

    // 2. Update Dimensions (ONLY in Local Mode)
    if (isLocalMode && ((global as any)._lastW !== frame.width || (global as any)._lastH !== frame.height)) {
      setImageDimensionsJS(frame.width, frame.height);
      (global as any)._lastW = frame.width;
      (global as any)._lastH = frame.height;
    }
    
    // 3. Persistent Plugin Initialization
    if ((global as any)._detectObjectsPlugin == null) {
      (global as any)._detectObjectsPlugin = VisionCameraProxy.initFrameProcessorPlugin('detectObjects', {});
    }
    const plugin = (global as any)._detectObjectsPlugin;
    if (!plugin) return;

    try {
      let mode = 'track';
      let seeds = null;
      let shouldUpdateDimensions = false;

      if (isLocalMode) {
        // Local Mode: Detect every 3rd frame, Track others
        mode = (global as any)._evaiCounter % 3 === 0 ? 'detect' : 'track';
      } else {
        // Manual Mode: Check for new seeds
        // CRITICAL: Only seed if timestamp is newer AND we haven't seeded recently (prevent rapid re-seeding)
        const timeSinceLastSeed = seedTimestamp.value - ((global as any)._lastSeedTimestamp || 0);
        const MIN_SEED_INTERVAL = 100; // Minimum 100ms between seeds to prevent tracker accumulation
        
        if (pendingSeeds.value && 
            seedTimestamp.value > ((global as any)._lastSeedTimestamp || 0) &&
            timeSinceLastSeed >= MIN_SEED_INTERVAL) {
          seeds = pendingSeeds.value;
          (global as any)._lastSeedTimestamp = seedTimestamp.value;
          
          // CRITICAL: Clear seeds IMMEDIATELY to prevent multiple frames from using the same seeds
          // This prevents rapid re-seeding that causes tracker accumulation
          pendingSeeds.value = null;
          
          // If seeds came from a photo, we need to update dimensions to match video
          if (shouldUpdateDims.value) {
            shouldUpdateDimensions = true;
          }
          
          // DEBUG: Log when we're about to seed
          console.log(`[EVAI] WORKLET: About to seed tracker with ${seeds.length} objects`);
          console.log(`[EVAI] WORKLET: Seeds data:`, JSON.stringify(seeds));
        }
      }

      // 4. Call Native Plugin
      const results = plugin.call(frame, { 
        mode, 
        seeds, 
        maxObjects 
      }) as any[];
      
      // 6. Update dimensions AFTER successful seeding (if needed)
      if (shouldUpdateDimensions) {
        setImageDimensionsJS(frame.width, frame.height);
      }
      
      // DEBUG: Log results
      if (seeds && results) {
        console.log(`[EVAI] WORKLET: Seeded tracker, got ${results.length} results back`);
      }
      
      if (results && results.length > 0) {
        // Dimension-based check handles all orientations
        const isPortrait = frame.height > frame.width;
        const effectiveW = isPortrait ? frame.height : frame.width;
        const effectiveH = isPortrait ? frame.width : frame.height;

        let mappedDetections: Detection[] = results.map((det) => {
          // Convert normalized coordinates back to pixels relative to the frame
          const x = det.x * effectiveW;
          const y = det.y * effectiveH;
          const w = det.w * effectiveW;
          const h = det.h * effectiveH;

          return {
            bbox: [x, y, w, h],
            label: COCO_LABEL_MAP[det.label] || det.label,
            score: det.confidence,
          };
        });

        // 8. LERPING (Linear Interpolation) for smoothness
        // Only apply lerping for tracking updates (not fresh seeds)
        if (!seeds && (global as any)._prevDetections) {
            const prev = (global as any)._prevDetections as Detection[];
            const LERP_FACTOR = 0.3; // Slightly more aggressive smoothing
            
            mappedDetections = mappedDetections.map((curr, i) => {
                const p = prev[i]; 
                if (!p) return curr;
                
                return {
                    ...curr,
                    bbox: [
                        p.bbox[0] + (curr.bbox[0] - p.bbox[0]) * LERP_FACTOR,
                        p.bbox[1] + (curr.bbox[1] - p.bbox[1]) * LERP_FACTOR,
                        p.bbox[2] + (curr.bbox[2] - p.bbox[2]) * LERP_FACTOR,
                        p.bbox[3] + (curr.bbox[3] - p.bbox[3]) * LERP_FACTOR,
                    ] as [number, number, number, number]
                };
            });
        }

        // 7. State Sync
        (global as any)._prevDetections = mappedDetections;
        setDetectionsJS(mappedDetections);
      } else if (seeds) {
          // If we seeded but got 0 results back, it might be a timing issue
          // Don't clear immediately - wait a frame to see if tracking recovers
          if ((global as any)._seedFailureCount === undefined) {
            (global as any)._seedFailureCount = 0;
          }
          (global as any)._seedFailureCount++;
          
          // Only clear after multiple consecutive failures (tracker might need a frame to initialize)
          if ((global as any)._seedFailureCount > 2) {
            console.log(`[EVAI] WORKLET: Seed failed after ${(global as any)._seedFailureCount} attempts, clearing`);
            setDetectionsJS([]);
            (global as any)._prevDetections = null;
            (global as any)._seedFailureCount = 0;
          }
      } else {
          // Tracking mode with no results - reset failure counter
          (global as any)._seedFailureCount = 0;
      }
    } catch (e) {
      if ((global as any)._evaiCounter % 60 === 0) {
        console.log(`[EVAI] Unified Inference Worklet Error: ${e}`);
      }
    }
  }, [isLocalMode, isRealTimeEnabled, maxObjects]);

  return {
    frameProcessor,
    modelType: isLocalMode ? 'CoreML + Native Tracking' : 'Server + Native Tracking'
  };
};