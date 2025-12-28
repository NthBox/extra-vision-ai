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
  const { isLocalMode, setDetections } = useVisionStore();
  const { resize } = useResizePlugin();

  // Create a thread-safe version of the store setter
  const setDetectionsJS = Worklets.createRunOnJS(setDetections);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    
    if (!isLocalMode) return;
    
    // PERSISTENT INITIALIZATION: Only run this once per session
    if ((global as any)._detectObjectsPlugin == null) {
      console.log('[EVAI] Initializing plugin singleton in worklet...');
      (global as any)._detectObjectsPlugin = VisionCameraProxy.initFrameProcessorPlugin('detectObjects');
    }
    const plugin = (global as any)._detectObjectsPlugin;

    // Defensive check
    if (!plugin) {
      if (frame.timestamp % 60 === 0) {
        console.log('[EVAI] CRITICAL: "detectObjects" plugin not found in worklet');
      }
      return;
    }

    // Diagnostic log: Check what VisionCameraProxy actually is
    if (typeof (global as any)._evaiFirstFrame === 'undefined') {
      console.log('[EVAI] Worklet started. VisionCameraProxy type:', typeof VisionCameraProxy);
      (global as any)._evaiFirstFrame = true;
    }

    // Log once every 60 frames (approx 2 seconds at 30fps)
    if (frame.timestamp % 60 === 0) {
      console.log('[EVAI] Worklet Alive - Frames flowing');
    }

    // Manual Throttling: Run only every 3rd frame (~10 FPS)
    if (Math.floor(frame.timestamp * 1000) % 3 !== 0) return;

    try {
      const results = plugin.call(frame) as any[];
      
      if (results && results.length > 0) {
        const mappedDetections: Detection[] = results.map((det) => ({
          bbox: [det.x, det.y, det.w, det.h],
          label: COCO_LABEL_MAP[det.label] || det.label,
          score: det.confidence,
        }));

        setDetectionsJS(mappedDetections);
      }
    } catch (e) {
      console.log(`[EVAI] Local Inference Worklet Error: ${e}`);
    }
  }, [isLocalMode, setDetectionsJS]);

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
