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
    request.imageCropAndScaleOption = .scaleFill

    let handler = VNImageRequestHandler(cvPixelBuffer: imageBuffer, options: [:])
    do {
      try handler.perform([request])
    } catch {
      NSLog("[EVAI] Inference error: %@", "\(error)")
      return nil
    }

    guard let allResults = request.results else { return [] }

    // 1. Handle "Recognized Object" models (High-level / Wrapped)
    if let results = allResults as? [VNRecognizedObjectObservation] {
        return results.map { observation in
            let bounds = observation.boundingBox
            return [
                "label": observation.labels.first?.identifier ?? "unknown",
                "confidence": observation.confidence,
                "x": bounds.origin.x,
                "y": 1.0 - Double(bounds.origin.y) - Double(bounds.size.height),
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
        // features: 0:x_min, 1:y_min, 2:x_max, 3:y_max, 4:conf, 5:class
        // These are in 640x640 pixel space
        let shape = multiArray.shape
        if shape.count >= 3 {
            let numBoxes = shape[1].intValue
            
            for i in 0..<min(numBoxes, 100) {
                let conf = multiArray[ [0, i, 4] as [NSNumber] ].doubleValue
                
                if conf > 0.25 {
                    let x1 = multiArray[ [0, i, 0] as [NSNumber] ].doubleValue
                    let y1 = multiArray[ [0, i, 1] as [NSNumber] ].doubleValue
                    let x2 = multiArray[ [0, i, 2] as [NSNumber] ].doubleValue
                    let y2 = multiArray[ [0, i, 3] as [NSNumber] ].doubleValue
                    
                    // Normalize to 0.0 - 1.0 range based on 640x640 model input
                    detections.append([
                        "label": "object", 
                        "confidence": conf,
                        "x": x1 / 640.0,
                        "y": y1 / 640.0,
                        "w": (x2 - x1) / 640.0,
                        "h": (y2 - y1) / 640.0
                    ])
                }
            }
        }
        return detections
    }

    return []
  }
}
