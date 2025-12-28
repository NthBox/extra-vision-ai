# Debug & Troubleshooting: Local Inference Transition to CoreML

## Issue Overview
Transitioning from a cross-platform TFLite implementation to an iOS-native CoreML implementation for local YOLOv10 inference to optimize for hardware acceleration (ANE) and thermal efficiency.

## Debugging Methods
- **Benchmark Research**: Compared TFLite (CoreML Delegate) vs. Native CoreML. Results indicated native CoreML offers better "performance-per-watt" and lower overhead on ANE.
- **Dependency Audit**: Searched for compatible VisionCamera v4 plugins for CoreML. Identified that many older plugins (v2/v3) are incompatible with the new JSI/Worklet architecture of VisionCamera v4.

## Troubleshooting Methods
- **Plugin Search**: Tried several npm package variations (`vision-camera-v3-coreml`, `react-native-vision-camera-coreml`). Found that a manual Swift bridge is the most stable approach for v4.
- **Preprocessing Optimization**: Identified that image resizing is a bottleneck. Resolved by integrating `vision-camera-resize-plugin` which uses GPU/Metal for scaling before passing to CoreML.

## Approaches That Worked
- **Hybrid Native Bridge**: Using the `vision-camera-resize-plugin` in the JS worklet and defining a clear Swift interface for the CoreML prediction.
- **Label Mapping**: Centralizing COCO-to-App label mapping in the hook to decouple the model's output from the HUD logic.
- **Automated Linking (Expo Professional Way)**: Implemented a custom Expo Config Plugin (`plugins/withMLModel.js`) to automatically inject the `.mlmodel` file into the Xcode project during the `prebuild` phase. This ensures the model is always correctly bundled and targeted without manual Xcode intervention.

## Lessons Learned & Prevention
- **Hardware-Specific Optimizations**: For real-time mobile AI, cross-platform wrappers (like TFLite) should be secondary to native frameworks (CoreML/NNAPI) when performance and thermals are critical.
- **Version Compatibility**: Always verify VisionCamera plugin compatibility with the current major version (v4) and its JSI/Worklet requirements before starting implementation.
- **Documenting Native Bridges**: Always provide clear Swift/Kotlin hints in the TS code when a task requires a native implementation to prevent friction in the handoff.
- **Automate Native Config**: Use Expo Config Plugins to handle native file injection. This prevents human error and ensures consistency across development environments and CI/CD pipelines.
- **EAS Compatibility**: Move native bridge source files (`.swift`, `.m`) to a tracked directory (e.g., `src/native/ios`) instead of the ephemeral `ios` directory. Update the config plugin to copy these files during the `prebuild` phase so they are available to EAS Build.
