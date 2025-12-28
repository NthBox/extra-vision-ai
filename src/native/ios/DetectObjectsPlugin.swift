import Vision
import CoreML
import VisionCamera

@objc(DetectObjectsPlugin)
public class DetectObjectsPlugin: FrameProcessorPlugin {
  private var _model: VNCoreMLModel?

  public override init(proxy: VisionCameraProxyHolder, options: [AnyHashable: Any]?) {
    super.init(proxy: proxy, options: options)
    
    do {
      let configuration = MLModelConfiguration()
      // Xcode generates the class name based on the physical filename (.mlpackage name)
      let model = try yolov10n(configuration: configuration).model
      _model = try VNCoreMLModel(for: model)
    } catch {
      print("Error loading CoreML model: \(error)")
    }
  }

  public override func callback(_ frame: Frame, withArguments arguments: [AnyHashable: Any]?) -> Any? {
    guard let model = _model, let imageBuffer = frame.buffer else { return nil }

    let request = VNCoreMLRequest(model: model)
    request.imageCropAndScaleOption = .scaleFill

    let handler = VNImageRequestHandler(cvPixelBuffer: imageBuffer, options: [:])
    do {
      try handler.perform([request])
    } catch {
      return nil
    }

    guard let results = request.results as? [VNRecognizedObjectObservation] else { return nil }

    return results.map { observation in
      let bounds = observation.boundingBox
      return [
        "label": observation.labels.first?.identifier ?? "unknown",
        "confidence": observation.confidence,
        "x": bounds.origin.x,
        "y": 1 - bounds.origin.y - bounds.size.height,
        "w": bounds.size.width,
        "h": bounds.size.height
      ]
    }
  }
}
