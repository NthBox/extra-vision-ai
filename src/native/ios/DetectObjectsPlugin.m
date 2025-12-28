#import <VisionCamera/FrameProcessorPlugin.h>
#import <VisionCamera/FrameProcessorPluginRegistry.h>

// Forward declaration to help the compiler
@class DetectObjectsPlugin;

// Conditional import - only if the Swift header exists
#if __has_include("ExtraVisionAI-Swift.h")
#import "ExtraVisionAI-Swift.h"
#endif

// The macro MUST NOT be inside an @interface block
VISION_EXPORT_SWIFT_FRAME_PROCESSOR(DetectObjectsPlugin, detectObjects)
