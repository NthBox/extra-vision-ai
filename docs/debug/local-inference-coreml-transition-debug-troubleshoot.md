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
- **Config Plugin Robustness**: Fixed a critical issue where `config.modRequest.projectName` was returning `null`, leading to invalid paths. Implemented fallback to the sanitized project name.
- **Header Not Found Error**: Trace back to missing `react-native-worklets-core`.
- **Babel Configuration**: Created `babel.config.js` with `react-native-worklets-core/plugin` and required legacy proposal plugins.
- **Lazy Plugin Initialization**: Moved `VisionCameraProxy.getFrameProcessorPlugin` inside the `useFrameProcessor` worklet context.

## Approaches That Worked
- **Hybrid Native Bridge**: Direct `Frame` passing to Swift for CoreML processing.
- **Label Mapping**: Centralizing COCO-to-App label mapping in the hook.
- **Automated Linking (Expo Professional Way)**: Custom Expo Config Plugins for `.mlpackage` and native bridge files.
- **Native Resizing**: Using `request.imageCropAndScaleOption = .scaleFill` in Swift for zero-copy resizing.
- **Thread-Safe State Updates**: Using `Worklets.createRunOnJS` to update Zustand stores from the high-speed worklet thread.
- **Manual Frame Throttling**: Bypassing broken `runAtTargetFps` by using `frame.timestamp % N` for deterministic FPS control.
- **Singleton Model Pattern**: Using `static` shared variables in Swift and `global` persistence in Worklets to prevent massive memory leaks from multiple model instances.
- **Direct Bundle Loading**: Loading `.mlmodelc` directly via URL to bypass Xcode auto-generation sync issues.
- **Objective-C Macro Alignment**: Using `@objc(initWithProxy:withOptions:)` to resolve naming mismatches between Swift and the VisionCamera registration macro.

## Debugging Session Log (Dec 28, 2025)
### Issue: App crash on LOC + PLAY
- **Symptoms**: Immediate crash or freeze when starting the local inference worklet.
- **Debug Methods**:
    -   Used `NSLog` instead of `print` for reliable physical device logging in macOS Console app.
    -   Used Xcode Internal Console to catch `JSINativeException` (empty parentheses error).
    -   Implemented a "Safe Mode" heartbeat in the worklet to isolate library vs. logic failures.
- **Troubleshoot Methods**:
    -   Identified `VisionCameraProxy.getFrameProcessorPlugin` was renamed to `initFrameProcessorPlugin` in v4.
    -   Verified "Target Membership" and "Compile Sources" in Xcode for local `.swift` and `.m` files.
    -   Analyzed memory crash (Code 11) using Xcode Debugger to identify singleton necessity.
- **Approaches that Worked**:
    -   Moved plugin lookup inside the worklet to avoid JS-thread `undefined` errors.
    -   Fixed `babel.config.js` by removing redundant plugins that interfered with Worklet AST transformation.
    -   Added `@objc` selector to Swift `init` to satisfy Objective-C macro expectations.

## Lessons Learned & Prevention
- **Avoid JS Resizing**: For high-frequency frame processing, keep frame data in native memory as long as possible.
- **Version Compatibility**: Check VisionCamera v4 peer dependencies (`worklets-core`) and Babel plugins early.
- **Robust Config Plugins**: Use deterministic UUIDs and clear parent/child path relationships in `project.pbxproj`.
- **Project Name Fallbacks**: In Config Plugins, provide fallbacks for project-related variables.
- **Metro Cache**: Clear cache (`--clear`) after ANY change to `babel.config.js`.
- **Memory Management**: AI models must be singletons. Never initialize native plugins or models inside a high-frequency loop without persistence.
- **Native Linking**: Manual local files in Expo `ios/` folders often need explicit "Target Membership" checks if config plugins are out of sync with new React Native architectures.
- **Macro Strictness**: Objective-C macros for Swift integration are extremely sensitive to naming labels (e.g., `withOptions`). Always use `@objc` labels to guarantee mapping.
