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

  public override func callback(_ frame: Frame, withArguments arguments: [AnyHashable: Any]?) -> Any? {
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

    guard let results = request.results as? [VNRecognizedObjectObservation] else {
      return nil
    }

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
}
