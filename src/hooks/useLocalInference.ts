import { useCallback } from 'react';
import { useVisionStore, Detection } from '../store/useVisionStore';
import { useFrameProcessor, VisionCameraProxy } from 'react-native-vision-camera';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { Worklets } from 'react-native-worklets-core';

/**
 * COCO Class Mapping for Extra Vision AI
 */
const COCO_LABEL_MAP: Record<string, string> = {
  'person': 'Pedestrian',
  'car': 'Vehicle',
  'truck': 'Vehicle',
  'bus': 'Vehicle',
  'motorcycle': 'Cyclist',
  'bicycle': 'Cyclist',
};

export const useLocalInference = () => {
  const { isLocalMode, setDetections, setImageDimensions } = useVisionStore();
  const { resize } = useResizePlugin();

  // Create thread-safe versions of store setters
  const setDetectionsJS = Worklets.createRunOnJS(setDetections);
  const setImageDimensionsJS = Worklets.createRunOnJS(setImageDimensions);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    
    if (!isLocalMode) return;
    
    // 1. Initialize and increment Frame Counter
    if ((global as any)._evaiCounter === undefined) (global as any)._evaiCounter = 0;
    (global as any)._evaiCounter++;

    // 2. Heartbeat Log (Every 1 second / 30 frames)
    if ((global as any)._evaiCounter % 30 === 0) {
      console.log(`[EVAI] Worklet Heartbeat - Frame: ${(global as any)._evaiCounter}`);
    }

    // 3. Update Dimensions (only on change or first frame) to ensure scaling is correct
    if ((global as any)._lastW !== frame.width || (global as any)._lastH !== frame.height) {
      setImageDimensionsJS(frame.width, frame.height);
      (global as any)._lastW = frame.width;
      (global as any)._lastH = frame.height;
    }
    
    // 4. PERSISTENT INITIALIZATION: Only run this once per session
    if ((global as any)._detectObjectsPlugin == null) {
      console.log('[EVAI] Initializing plugin singleton in worklet...');
      (global as any)._detectObjectsPlugin = VisionCameraProxy.initFrameProcessorPlugin('detectObjects');
    }
    const plugin = (global as any)._detectObjectsPlugin;

    // Defensive check
    if (!plugin) {
      if ((global as any)._evaiCounter % 60 === 0) {
        console.log('[EVAI] CRITICAL: "detectObjects" plugin not found in worklet');
      }
      return;
    }

    // 5. Throttling: Run inference every 3rd frame (~10 FPS)
    if ((global as any)._evaiCounter % 3 !== 0) return;

    try {
      const results = plugin.call(frame) as any[];
      
      if (results && results.length > 0) {
        // Aggressive logging: show every detection until we confirm it works
        console.log(`[EVAI] SUCCESS! Detected ${results.length} objects`);
        
        const mappedDetections: Detection[] = results.map((det, index) => {
          // Convert normalized (0-1) coordinates to pixel coordinates
          const x = det.x * frame.width;
          const y = det.y * frame.height;
          const w = det.w * frame.width;
          const h = det.h * frame.height;

          // Log the first box's coordinates every 2 seconds
          if (index === 0 && (global as any)._evaiCounter % 60 === 0) {
            console.log(`[EVAI] Box 0 - Normalized: [${det.x.toFixed(2)}, ${det.y.toFixed(2)}], Pixels: [${x.toFixed(0)}, ${y.toFixed(0)}]`);
          }

          return {
            bbox: [x, y, w, h],
            label: COCO_LABEL_MAP[det.label] || det.label,
            score: det.confidence,
          };
        });

        setDetectionsJS(mappedDetections);
      } else {
        // Log even if nothing is detected, but only once a second
        if ((global as any)._evaiCounter % 30 === 0) {
          console.log('[EVAI] Plugin called - 0 objects found');
        }
      }
    } catch (e) {
      console.log(`[EVAI] Local Inference Worklet Error: ${e}`);
    }
  }, [isLocalMode, setDetectionsJS, setImageDimensionsJS]);

  return {
    frameProcessor,
    modelType: 'CoreML (Native iOS)'
  };
};

/**
 * NATIVE IMPLEMENTATION HINT (Swift):
 * 
 * 1. Create a file 'DetectObjectsPlugin.swift'
 * 2. Add the yolov10n.mlmodel to Xcode
 * 3. Use the following structure:
 * 
 * @objc(DetectObjectsPlugin)
 * public class DetectObjectsPlugin: FrameProcessorPlugin {
 *   public override func callback(_ frame: Frame, withArguments arguments: [AnyHashable : Any]?) -> Any? {
 *     guard let imageBuffer = frame.buffer else { return nil }
 *     // ... run CoreML VNCoreMLRequest ...
 *     // return array of dicts: [[x: 10, y: 10, w: 100, h: 100, label: "car", confidence: 0.9], ...]
 *   }
 * }
 */
