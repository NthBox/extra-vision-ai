# Debug & Troubleshooting: Mobile Camera & EAS Pipeline

## Issue 1: CameraView Component Warnings
- **Symptoms**: `WARN The <CameraView> component does not support children. This may lead to inconsistent behaviour or crashes.`
- **Debug Method**: Observed Expo console warnings during app startup.
- **Troubleshoot Method**: Review of Expo Camera SDK documentation.
- **Approach that worked**: 
    - Refactored `CameraScreen.tsx` to move `HUDOverlay` and status UI outside of the `CameraView` component.
    - Used `StyleSheet.absoluteFillObject` to layer the HUD on top of the camera feed using standard React Native absolute positioning.
- **Prevention**: Never nest UI components inside `<CameraView>`. Use sibling components with absolute positioning for overlays.

## Issue 2: Sequential Frame Capture Failures
- **Symptoms**: `ERROR Failed to capture frame: [Error: Camera unmounted during taking photo process]` and `[Error: Image could not be captured]`.
- **Debug Method**: Real-time log monitoring during high-frequency inference loop (~10 FPS).
- **Troubleshoot Method**: 
    - Tested `skipProcessing: true` (caused sync issues).
    - Tested `setInterval` (caused overlapping capture requests).
- **Approach that worked**: 
    - Migrated from `setInterval` to a **sequential `setTimeout` loop**. This ensures a capture request only starts after the previous one finishes or fails.
    - Added a **500ms hardware readiness delay** after `onCameraReady` to ensure the sensor is stable.
    - Removed `skipProcessing: true` to allow the native driver to stabilize the frame.
    - Reduced quality to `0.3` to minimize memory buffer pressure.
- **Prevention**: Hardware sensors (Camera) should be treated as "single-threaded" resources. Use sequential loops instead of intervals to prevent race conditions.

## Issue 3: EAS CLI Execution Failures
- **Symptoms**: `npm error could not determine executable to run` when running `npx eas build`.
- **Debug Method**: Command line execution testing across different shells.
- **Troubleshoot Method**: Tried local `npx` execution and binary pathing.
- **Approach that worked**: 
    - Installed `eas-cli` **globally** (`npm install -g eas-cli`) to ensure consistent binary resolution across the environment.
- **Prevention**: For complex CLIs like EAS that manage native credentials, global installation is more stable than `npx` in environments with complex `node_modules` structures.

## Issue 4: Apple Developer Portal Authentication
- **Symptoms**: `Authentication with Apple Developer Portal failed! You have no team associated...`
- **Debug Method**: Checked EAS interactive logs.
- **Troubleshoot Method**: Verified membership status at developer.apple.com.
- **Approach that worked**: 
    - Added `ITSAppUsesNonExemptEncryption: false` to `app.config.js` to satisfy App Store Connect requirements.
    - Waited for Apple's membership activation sync.
- **Prevention**: Account for 1-4 hours of sync time after purchasing a new Apple Developer membership before attempting native builds.

