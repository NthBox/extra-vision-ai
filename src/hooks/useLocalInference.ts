import { useCallback } from 'react';
import { useVisionStore, Detection } from '../store/useVisionStore';
import { useFrameProcessor, VisionCameraProxy } from 'react-native-vision-camera';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { runAtTargetFps } from 'react-native-worklets-core';

/**
 * COCO Class Mapping for Extra Vision AI
 * Pre-trained YOLOv10 (COCO) has 80 classes.
 */
const COCO_LABEL_MAP: Record<string, string> = {
  'person': 'Pedestrian',
  'car': 'Vehicle',
  'truck': 'Vehicle',
  'bus': 'Vehicle',
  'motorcycle': 'Cyclist',
  'bicycle': 'Cyclist',
};

// This is a placeholder for the native Frame Processor Plugin.
// In a real project, you would implement 'detectObjects' in Swift using CoreML.
// @ts-ignore
const { detectObjects } = VisionCameraProxy.getFrameProcessorPlugin('detectObjects');

export const useLocalInference = () => {
  const { isLocalMode, setDetections } = useVisionStore();
  const { resize } = useResizePlugin();

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    
    if (!isLocalMode) return;

    runAtTargetFps(10, () => {
      // 1. Resize the frame to YOLOv10 input size (e.g., 640x640)
      // This uses the vision-camera-resize-plugin for high efficiency
      const resized = resize(frame, {
        size: {
          width: 640,
          height: 640,
        },
        pixelFormat: 'rgb',
        dataType: 'uint8',
      });

      // 2. Run the CoreML Inference via a Native Frame Processor Plugin
      // Note: This plugin must be implemented on the native (Swift) side.
      // It takes the resized frame and returns detected objects.
      if (detectObjects) {
        const results = detectObjects(resized) as any[];
        
        if (results) {
          const mappedDetections: Detection[] = results.map((det) => ({
            bbox: [det.x, det.y, det.w, det.h],
            label: COCO_LABEL_MAP[det.label] || det.label,
            score: det.confidence,
          }));

          setDetections(mappedDetections);
        }
      }
    });
  }, [isLocalMode, resize]);

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
