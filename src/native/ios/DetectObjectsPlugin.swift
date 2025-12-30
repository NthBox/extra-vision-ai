import Vision
import CoreML
import VisionCamera
import UIKit

@objc(DetectObjectsPlugin)
public class DetectObjectsPlugin: FrameProcessorPlugin {
  // Struct to hold tracker and its metadata
  private struct TrackedObject {
      let request: VNTrackObjectRequest
      let label: String
      let score: Double
  }

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

  // Debug flag to log letterbox params only once
  private static var _debugLogged: Bool? = nil
  
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

  // Tracking state
  private var _sequenceHandler = VNSequenceRequestHandler()
  private var _trackedObjects: [TrackedObject] = []
  private var _lastDebugLog: Double = 0
  private var _lastResetTime: TimeInterval = 0
  private let MIN_RESET_INTERVAL: TimeInterval = 0.1 // 100ms minimum between resets

  @objc(initWithProxy:withOptions:)
  public override init(proxy: VisionCameraProxyHolder, options: [AnyHashable: Any]?) {
    super.init(proxy: proxy, options: options)
    NSLog("[EVAI] DetectObjectsPlugin instance created with Tracking support.")
  }

  public override func callback(_ frame: Frame, withArguments arguments: [AnyHashable : Any]?) -> Any? {
    let mode = arguments?["mode"] as? String ?? "detect" // "detect" or "track"
    let maxObjects = arguments?["maxObjects"] as? Int ?? 10
    
    // DEBUG: Log ALL keys in arguments (only once per second to reduce spam)
    let now = Date().timeIntervalSince1970
    if now - _lastDebugLog > 1.0 {
      _lastDebugLog = now
      if let args = arguments {
        let keys = args.keys.map { String(describing: $0) }
        NSLog("[EVAI] NATIVE: All argument keys: %@", keys.joined(separator: ", "))
      }
    }
    
    // DEBUG: Check what type 'seeds' actually is before casting
    let rawSeeds = arguments?["seeds"]
    if rawSeeds != nil {
      NSLog("[EVAI] NATIVE: Raw seeds type: %@, value: %@", 
            String(describing: type(of: rawSeeds!)), 
            String(describing: rawSeeds!))
    }
    
    // Try multiple casting approaches
    var seeds: [[String: Any]]? = nil
    if let directCast = rawSeeds as? [[String: Any]] {
      seeds = directCast
      NSLog("[EVAI] NATIVE: Direct cast succeeded with %d items", seeds!.count)
    } else if let nsArray = rawSeeds as? NSArray {
      NSLog("[EVAI] NATIVE: Got NSArray with %d items", nsArray.count)
      seeds = nsArray.compactMap { $0 as? [String: Any] }
      if seeds!.count > 0 {
        NSLog("[EVAI] NATIVE: NSArray conversion succeeded with %d items", seeds!.count)
      }
    } else if let nsDict = rawSeeds as? NSDictionary {
      // JSI bridge sometimes converts arrays to dictionaries with numeric keys
      NSLog("[EVAI] NATIVE: Got NSDictionary (likely array converted by JSI), converting...")
      NSLog("[EVAI] NATIVE: Dictionary has %d keys: %@", nsDict.count, nsDict.allKeys)
      
      // Extract and sort keys by their numeric value
      var keyValuePairs: [(Int, Any)] = []
      for key in nsDict.allKeys {
        var intValue: Int? = nil
        if let num = key as? NSNumber {
          intValue = num.intValue
        } else if let num = key as? Int {
          intValue = num
        } else if let str = key as? String, let num = Int(str) {
          intValue = num
        }
        if let intVal = intValue {
          keyValuePairs.append((intVal, nsDict[key]!))
        }
      }
      keyValuePairs.sort { $0.0 < $1.0 }
      
      var convertedArray: [[String: Any]] = []
      for (_, value) in keyValuePairs {
        if let nsDictValue = value as? NSDictionary {
          // Convert NSDictionary to Swift Dictionary
          var swiftDict: [String: Any] = [:]
          for (k, v) in nsDictValue {
            if let keyStr = k as? String {
              swiftDict[keyStr] = v
            } else if let keyNum = k as? NSNumber {
              swiftDict[String(keyNum.intValue)] = v
            }
          }
          convertedArray.append(swiftDict)
        } else if let dict = value as? [String: Any] {
          convertedArray.append(dict)
        }
      }
      if convertedArray.count > 0 {
        seeds = convertedArray
        NSLog("[EVAI] NATIVE: Dictionary-to-array conversion succeeded with %d items", seeds!.count)
      } else {
        NSLog("[EVAI] NATIVE: Failed to convert dictionary to array - no valid items found")
      }
    } else if rawSeeds != nil {
      NSLog("[EVAI] NATIVE: Failed to cast seeds - unknown type: %@", String(describing: type(of: rawSeeds!)))
    }
    
    guard let imageBuffer = CMSampleBufferGetImageBuffer(frame.buffer) else { return nil }
    let orientation = self.getCGImageOrientation(frame.orientation)

    // 1. If seeds are provided (Ground Truth from Server/CoreML), reset tracking
    if let newSeeds = seeds {
      let now = Date().timeIntervalSince1970
      let timeSinceLastReset = now - _lastResetTime
      
      // Prevent rapid re-seeding that causes tracker accumulation
      if timeSinceLastReset < MIN_RESET_INTERVAL {
        NSLog("[EVAI] NATIVE: Ignoring seeds - too soon after last reset (%.3fs ago, need %.3fs)", 
              timeSinceLastReset, MIN_RESET_INTERVAL)
        // Just run tracking with existing trackers instead
        self.runTracking(imageBuffer, orientation: orientation)
        return self.getTrackerResults()
      }
      
      NSLog("[EVAI] NATIVE: About to reset trackers with %d seeds", newSeeds.count)
      _lastResetTime = now
      self.resetTrackers(with: newSeeds, maxObjects: maxObjects)
      // After seeding, we usually want to run one track cycle immediately to stay in sync with the current frame
      self.runTracking(imageBuffer, orientation: orientation)
      let results = self.getTrackerResults()
      NSLog("[EVAI] NATIVE: Returning %d tracking results", results.count)
      return results
    }

    // 2. Detect Mode (Run AI + Seed)
    if mode == "detect" {
      let detections = self.runDetection(imageBuffer, frame: frame)
      // Auto-seed tracking with the new detections
      self.resetTrackers(with: detections, maxObjects: maxObjects)
      return detections
    }

    // 3. Track Mode (Lightweight temporal tracking)
    if mode == "track" {
      self.runTracking(imageBuffer, orientation: orientation)
      return self.getTrackerResults()
    }

    return []
  }

  // MARK: - CoreML Detection
  private func runDetection(_ imageBuffer: CVImageBuffer, frame: Frame) -> [[String: Any]] {
    guard let model = DetectObjectsPlugin._sharedModel else { return [] }
    
    let request = VNCoreMLRequest(model: model)
    request.imageCropAndScaleOption = .scaleFit

    let orientation = self.getCGImageOrientation(frame.orientation)
    let handler = VNImageRequestHandler(cvPixelBuffer: imageBuffer, orientation: orientation, options: [:])
    do {
      try handler.perform([request])
    } catch {
      NSLog("[EVAI] Inference error: %@", "\(error)")
      return []
    }

    // Calculate Letterbox params for normalization (reusing existing logic)
    let imgW = Double(CVPixelBufferGetWidth(imageBuffer))
    let imgH = Double(CVPixelBufferGetHeight(imageBuffer))
    
    // In VisionCamera v4, orientation is UIImage.Orientation. 
    // .right and .left are portrait orientations when the sensor is landscape.
    let isPortrait = frame.orientation == .right || frame.orientation == .left || frame.orientation == .rightMirrored || frame.orientation == .leftMirrored
    
    let effectiveW = isPortrait ? imgH : imgW
    let effectiveH = isPortrait ? imgW : imgH
    let modelSize = 640.0
    let scale = min(modelSize / effectiveW, modelSize / effectiveH)
    let padX = (modelSize - (effectiveW * scale)) / 2.0
    let padY = (modelSize - (effectiveH * scale)) / 2.0

    guard let allResults = request.results else { return [] }
    
    var detections: [[String: Any]] = []

    // Raw YOLO output (MultiArray)
    if let firstResult = allResults.first as? VNCoreMLFeatureValueObservation,
       let multiArray = firstResult.featureValue.multiArrayValue {
        let shape = multiArray.shape
        if shape.count >= 3 {
            let numBoxes = shape[1].intValue
            for i in 0..<min(numBoxes, 100) {
                let conf = multiArray[ [0, i, 4] as [NSNumber] ].doubleValue
                if conf > 0.30 {
                    let rawX1 = multiArray[ [0, i, 0] as [NSNumber] ].doubleValue
                    let rawY1 = multiArray[ [0, i, 1] as [NSNumber] ].doubleValue
                    let rawX2 = multiArray[ [0, i, 2] as [NSNumber] ].doubleValue
                    let rawY2 = multiArray[ [0, i, 3] as [NSNumber] ].doubleValue
                    let classId = Int(multiArray[ [0, i, 5] as [NSNumber] ].doubleValue)
                    
                    let normX = ((rawX1 - padX) / scale) / effectiveW
                    let normY = ((rawY1 - padY) / scale) / effectiveH
                    let normW = ((rawX2 - rawX1) / scale) / effectiveW
                    let normH = ((rawY2 - rawY1) / scale) / effectiveH

                    detections.append([
                        "label": DetectObjectsPlugin.COCO_CLASSES[classId] ?? "object", 
                        "confidence": conf,
                        "x": max(0.0, min(1.0, normX)),
                        "y": max(0.0, min(1.0, normY)),
                        "w": max(0.0, min(1.0, normW)),
                        "h": max(0.0, min(1.0, normH))
                    ])
                }
            }
        }
    }
    
    return detections
  }

  // MARK: - Tracking Logic
  private func resetTrackers(with detections: [[String: Any]], maxObjects: Int) {
    // CRITICAL: Cancel all existing tracking requests before removing them
    // This releases the underlying VNTrackObjectRequest objects from Vision framework memory
    for trackedObj in _trackedObjects {
      trackedObj.request.cancel()
    }
    
    // Clear the array
    _trackedObjects.removeAll()
    
    // Create a new sequence handler to ensure clean state
    // This helps prevent accumulation of internal Vision framework state
    _sequenceHandler = VNSequenceRequestHandler()
    
    NSLog("[EVAI] Resetting trackers with %d potential objects (cleaned up old trackers)", detections.count)

    for (index, det) in detections.enumerated() {
        if index >= maxObjects { break }
        
        guard let label = det["label"] as? String,
              let conf = det["confidence"] as? Double,
              let x = det["x"] as? Double,
              let y = det["y"] as? Double,
              let w = det["w"] as? Double,
              let h = det["h"] as? Double else { 
                NSLog("[EVAI] Failed to parse detection %d", index)
                continue 
              }

        // Vision tracking uses normalized coordinates [0,1] with origin at bottom-left
        // Ensure coordinates are clamped to [0, 1] to avoid tracker failure
        let clampedX = max(0.0, min(1.0, x))
        let clampedY = max(0.0, min(1.0, y))
        let clampedW = max(0.0, min(1.0 - clampedX, w))
        let clampedH = max(0.0, min(1.0 - clampedY, h))

        let visionRect = CGRect(x: clampedX, y: 1.0 - clampedY - clampedH, width: clampedW, height: clampedH)
        
        let request = VNTrackObjectRequest(detectedObjectObservation: VNDetectedObjectObservation(boundingBox: visionRect))
        request.trackingLevel = .fast // .accurate is better but .fast is needed for 60fps
        
        _trackedObjects.append(TrackedObject(request: request, label: label, score: conf))
        NSLog("[EVAI] Tracker %d initialized for '%@' at [%.2f, %.2f]", index, label, clampedX, clampedY)
    }
  }

  private func runTracking(_ imageBuffer: CVImageBuffer, orientation: CGImagePropertyOrientation) {
    guard !_trackedObjects.isEmpty else { return }

    let requests = _trackedObjects.map { $0.request }
    do {
      try _sequenceHandler.perform(requests, on: imageBuffer, orientation: orientation)
    } catch {
      NSLog("[EVAI] Tracking execution error: %@", "\(error)")
      
      // If we hit the tracker limit error, reset everything to recover
      if let nsError = error as NSError?, nsError.domain == "com.apple.Vision" && nsError.code == 9 {
        NSLog("[EVAI] CRITICAL: Tracker limit exceeded, performing full cleanup")
        // Cancel all trackers
        for trackedObj in _trackedObjects {
          trackedObj.request.cancel()
        }
        _trackedObjects.removeAll()
        // Create fresh sequence handler
        _sequenceHandler = VNSequenceRequestHandler()
      }
    }
  }

  private func getTrackerResults() -> [[String: Any]] {
    // Filter out failed/lost trackers and build results
    var validTrackedObjects: [TrackedObject] = []
    var results: [[String: Any]] = []
    
    for obj in _trackedObjects {
      guard let observation = obj.request.results?.first as? VNDetectedObjectObservation else {
        // Tracker lost the object - cancel it to free resources
        obj.request.cancel()
        continue
      }
      
      // Check if observation is still valid (not empty bounds)
      let bounds = observation.boundingBox
      guard bounds.width > 0 && bounds.height > 0 else {
        obj.request.cancel()
        continue
      }
      
      // Validate bounds are within reasonable range (Vision sometimes returns invalid values)
      guard bounds.origin.x >= 0 && bounds.origin.x <= 1.0 &&
            bounds.origin.y >= 0 && bounds.origin.y <= 1.0 &&
            bounds.origin.x + bounds.width <= 1.0 &&
            bounds.origin.y + bounds.height <= 1.0 else {
        NSLog("[EVAI] Tracking: Invalid bounds for '%@': [%.3f, %.3f, %.3f, %.3f], canceling", 
              obj.label, bounds.origin.x, bounds.origin.y, bounds.width, bounds.height)
        obj.request.cancel()
        continue
      }
      
      // Keep this tracker
      validTrackedObjects.append(obj)
      
      // Convert back to Top-Left normalized
      // Vision uses bottom-left origin, we use top-left
      let topLeftY = 1.0 - bounds.origin.y - bounds.size.height
      results.append([
        "label": obj.label,
        "confidence": obj.score,
        "x": Double(bounds.origin.x),
        "y": Double(max(0.0, min(1.0, topLeftY))), // Clamp to [0,1]
        "w": Double(bounds.size.width),
        "h": Double(bounds.size.height)
      ])
    }
    
    // Update tracked objects array to only include valid ones
    // This prevents accumulation of failed trackers
    if validTrackedObjects.count < _trackedObjects.count {
      let lostCount = _trackedObjects.count - validTrackedObjects.count
      NSLog("[EVAI] Tracking: Removed %d lost trackers, %d still active", lostCount, validTrackedObjects.count)
      _trackedObjects = validTrackedObjects
    }
    
    return results
  }

  private func getCGImageOrientation(_ orientation: UIImage.Orientation) -> CGImagePropertyOrientation {
    switch orientation {
    case .up: return .up
    case .down: return .down
    case .left: return .left
    case .right: return .right
    case .upMirrored: return .upMirrored
    case .downMirrored: return .downMirrored
    case .leftMirrored: return .leftMirrored
    case .rightMirrored: return .rightMirrored
    @unknown default: return .up
    }
  }
}
