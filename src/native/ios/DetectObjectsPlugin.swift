import Vision
import CoreML
import VisionCamera

@objc(DetectObjectsPlugin)
public class DetectObjectsPlugin: FrameProcessorPlugin {
  // Use a static shared model to prevent creating multiple copies in memory
  private static var _sharedModel: VNCoreMLModel? = {
    NSLog("[EVAI] Lazy-loading CoreML Model (Shared)...")
    let configuration = MLModelConfiguration()
    
    // Approach 1: Try the compiled model file directly
    if let modelURL = Bundle.main.url(forResource: "yolov10n", withExtension: "mlmodelc") {
      do {
        let model = try MLModel(contentsOf: modelURL, configuration: configuration)
        let vnModel = try VNCoreMLModel(for: model)
        NSLog("[EVAI] CoreML Model loaded successfully.")
        return vnModel
      } catch {
        NSLog("[EVAI] URL loading failed: %@", "\(error)")
      }
    }
    
    NSLog("[EVAI] CRITICAL: Model loading failed.")
    return nil
  }()

  // Complete COCO classes for YOLOv10
  private static let COCO_CLASSES = [
    0: "person", 1: "bicycle", 2: "car", 3: "motorcycle", 4: "airplane", 5: "bus", 6: "train", 7: "truck", 8: "boat", 9: "traffic light",
    10: "fire hydrant", 11: "stop sign", 12: "parking meter", 13: "bench", 14: "bird", 15: "cat", 16: "dog", 17: "horse", 18: "sheep", 19: "cow",
    20: "elephant", 21: "bear", 22: "zebra", 23: "giraffe", 24: "backpack", 25: "umbrella", 26: "handbag", 27: "tie", 28: "suitcase", 29: "frisbee",
    30: "skis", 31: "snowboard", 32: "sports ball", 33: "kite", 34: "baseball bat", 35: "baseball glove", 36: "skateboard", 37: "surfboard", 38: "tennis racket", 39: "bottle",
    40: "wine glass", 41: "cup", 42: "fork", 43: "knife", 44: "spoon", 45: "bowl", 46: "banana", 47: "apple", 48: "sandwich", 49: "orange",
    50: "broccoli", 51: "carrot", 52: "hot dog", 53: "pizza", 54: "donut", 55: "cake", 56: "chair", 57: "couch", 58: "potted plant", 59: "bed",
    60: "dining table", 61: "toilet", 62: "tv", 63: "laptop", 64: "mouse", 65: "remote", 66: "keyboard", 67: "cell phone", 68: "microwave", 69: "oven",
    70: "toaster", 71: "sink", 72: "refrigerator", 73: "book", 74: "clock", 75: "vase", 76: "scissors", 77: "teddy bear", 78: "hair drier", 79: "toothbrush"
  ]

  @objc(initWithProxy:withOptions:)
  public override init(proxy: VisionCameraProxyHolder, options: [AnyHashable: Any]?) {
    super.init(proxy: proxy, options: options)
    NSLog("[EVAI] DetectObjectsPlugin instance created.")
  }

  public override func callback(_ frame: Frame, withArguments arguments: [AnyHashable : Any]?) -> Any? {
    // Use the shared static model
    guard let model = DetectObjectsPlugin._sharedModel else { return nil }
    
    guard let imageBuffer = CMSampleBufferGetImageBuffer(frame.buffer) else {
      return nil
    }

    let request = VNCoreMLRequest(model: model)
    // Use ScaleFit to preserve aspect ratio (Letterboxing)
    request.imageCropAndScaleOption = .scaleFit

    let handler = VNImageRequestHandler(cvPixelBuffer: imageBuffer, options: [:])
    do {
      try handler.perform([request])
    } catch {
      NSLog("[EVAI] Inference error: %@", "\(error)")
      return nil
    }

    // CALCULATE LETTERBOX PARAMETERS
    // We need these to un-map the coordinates from the square model space back to the original rect.
    let imgW = Double(CVPixelBufferGetWidth(imageBuffer))
    let imgH = Double(CVPixelBufferGetHeight(imageBuffer))
    let modelSize = 640.0
    
    // Scale factor used by Vision to fit the image into 640x640
    let scale = min(modelSize / imgW, modelSize / imgH)
    
    // The dimensions of the image inside the 640x640 buffer
    let scaledW = imgW * scale
    let scaledH = imgH * scale
    
    // Padding added by Vision (Letterboxing)
    let padX = (modelSize - scaledW) / 2.0
    let padY = (modelSize - scaledH) / 2.0

    guard let allResults = request.results else { return [] }

    // 1. Handle "Recognized Object" models (High-level / Wrapped)
    if let results = allResults as? [VNRecognizedObjectObservation] {
        return results.map { observation in
            let bounds = observation.boundingBox
            return [
                "label": observation.labels.first?.identifier ?? "unknown",
                "confidence": observation.confidence,
                "x": bounds.origin.x,
                "y": 1.0 - bounds.origin.y - bounds.size.height,
                "w": bounds.size.width,
                "h": bounds.size.height
            ]
        }
    }

    // 2. Handle "Feature Value" models (Raw YOLO output / MultiArray)
    if let firstResult = allResults.first as? VNCoreMLFeatureValueObservation,
       let multiArray = firstResult.featureValue.multiArrayValue {
        
        var detections: [[String: Any]] = []
        
        // Handling [1, 300, 6] shape: [batch, box_index, feature_index]
        // features: 0:x1, 1:y1, 2:x2, 3:y2, 4:conf, 5:class
        // These coords are in the 640x640 Letterboxed space.
        let shape = multiArray.shape
        if shape.count >= 3 {
            let numBoxes = shape[1].intValue
            
            for i in 0..<min(numBoxes, 100) {
                let conf = multiArray[ [0, i, 4] as [NSNumber] ].doubleValue
                
                if conf > 0.30 {
                    // Raw coordinates in 640x640 space
                    let rawX1 = multiArray[ [0, i, 0] as [NSNumber] ].doubleValue
                    let rawY1 = multiArray[ [0, i, 1] as [NSNumber] ].doubleValue
                    let rawX2 = multiArray[ [0, i, 2] as [NSNumber] ].doubleValue
                    let rawY2 = multiArray[ [0, i, 3] as [NSNumber] ].doubleValue
                    let classId = Int(multiArray[ [0, i, 5] as [NSNumber] ].doubleValue)
                    
                    // Un-map Letterboxing to get coordinates relative to the actual image area
                    // (x - pad) / scale = original_pixel_coord
                    let origX1 = (rawX1 - padX) / scale
                    let origY1 = (rawY1 - padY) / scale
                    let origX2 = (rawX2 - padX) / scale
                    let origY2 = (rawY2 - padY) / scale
                    
                    // Normalize to 0-1 relative to original image dimensions
                    let normX = origX1 / imgW
                    let normY = origY1 / imgH
                    let normW = (origX2 - origX1) / imgW
                    let normH = (origY2 - origY1) / imgH

                    detections.append([
                        "label": DetectObjectsPlugin.COCO_CLASSES[classId] ?? "object", 
                        "confidence": conf,
                        "x": normX,
                        "y": normY,
                        "w": normW,
                        "h": normH
                    ])
                }
            }
        }
        return detections
    }

    return []
  }
}
