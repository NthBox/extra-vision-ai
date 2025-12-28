# Debug & Troubleshooting: Local Inference Transition to CoreML

## Issue Overview
Transitioning from a cross-platform TFLite implementation to an iOS-native CoreML implementation for local YOLOv10 inference to optimize for hardware acceleration (ANE) and thermal efficiency.

## Debugging Methods
- **Benchmark Research**: Compared TFLite (CoreML Delegate) vs. Native CoreML. Results indicated native CoreML offers better "performance-per-watt" and lower overhead on ANE.
- **Dependency Audit**: Searched for compatible VisionCamera v4 plugins for CoreML. Identified that many older plugins (v2/v3) are incompatible with the new JSI/Worklet architecture of VisionCamera v4.
- **Model Format Analysis**: Identified that newer CoreML exports often use `.mlpackage` (folder-based) instead of the legacy single-file `.mlmodel` format.
- **Runtime Error Analysis**: Identified `TypeError: VisionCameraProxy.getFrameProcessorPlugin is not a function` which indicates that the native module was either not ready or the JS-to-Native bridge was broken by missing Babel configuration.
- **Babel Plugin Errors**: Encountered `Cannot find module '@babel/plugin-proposal-optional-chaining'` and `@babel/plugin-transform-template-literals` during worklet transformation.
- **Silent Crashes**: Found that passing JS arrays/buffers to Swift plugins expecting `Frame` objects causes memory violations. Fixed by passing raw `Frame` objects and handling resizing natively.

## Troubleshooting Methods
- **Plugin Search**: Tried several npm package variations (`vision-camera-v3-coreml`, `react-native-vision-camera-coreml`). Found that a manual Swift bridge is the most stable approach for v4.
- **Preprocessing Optimization**: Moved resizing from JS to Native (Swift) using optimized `VNCoreMLRequest` scaling.
- **Xcode Linking Issues**: Resolved `Build input file cannot be found` errors by:
    1.  Aggressively purging stale references in `project.pbxproj`.
    2.  Using deterministic 24-char hex UUIDs (`EVAI_MODEL_REF_UUID_0001`).
    3.  Structuring group paths correctly: Group `Models` with `path = ExtraVisionAI` and child with `path = yolov10n.mlpackage`. This avoids `null` or mangled paths.
- **Header Not Found Error**: Trace back to missing `react-native-worklets-core`.
- **Babel Configuration**: Created `babel.config.js` with `react-native-worklets-core/plugin` and required legacy proposal plugins.
- **Lazy Plugin Initialization**: Moved `VisionCameraProxy.getFrameProcessorPlugin` inside the `useFrameProcessor` worklet context.

## Approaches That Worked
- **Hybrid Native Bridge**: Direct `Frame` passing to Swift for CoreML processing.
- **Label Mapping**: Centralizing COCO-to-App label mapping in the hook.
- **Automated Linking (Expo Professional Way)**: Custom Expo Config Plugins for `.mlpackage` and native bridge files.
- **Native Resizing**: Using `request.imageCropAndScaleOption = .scaleFill` in Swift for zero-copy resizing.

## Lessons Learned & Prevention
- **Avoid JS Resizing**: For high-frequency frame processing, keep frame data in native memory as long as possible.
- **Version Compatibility**: Check VisionCamera v4 peer dependencies (`worklets-core`) and Babel plugins early.
- **Robust Config Plugins**: Use deterministic UUIDs and clear parent/child path relationships in `project.pbxproj` to avoid build system confusion.
- **Metro Cache**: Clear cache (`--clear`) after ANY change to `babel.config.js` or `package.json` affecting transforms.
