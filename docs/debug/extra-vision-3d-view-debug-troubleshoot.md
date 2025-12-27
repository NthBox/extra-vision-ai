# Debug & Troubleshoot: Extra Vision 3D Visualization

## Issue: 3D Visualization Implementation Conflicts

### 1. Dependency Mismatches (Expo 54 + React 19)
- **Symptoms**: Build failures on iOS during the "Install dependencies" phase; `TypeError: Cannot read property 'ReactCurrentOwner' of undefined`.
- **Cause**: Standard 3D libraries (Three.js, R3F) had peer dependency conflicts with React 19 and were incorrectly versioned (0.182.0).
- **Solution**: 
    - Forced stable versions: `three@0.166.1`, `@react-three/fiber@8.16.8`, `@react-three/drei@9.106.0`.
    - Added `legacy-peer-deps=true` to `.npmrc`.
    - Added React 19 overrides in `package.json` to deduplicate instances.

### 2. Native Module Linking & New Architecture
- **Symptoms**: `TypeError: NativeJSLogger.default.addListener is not a function`.
- **Cause**: React Native 0.81 (Expo 54) requires the New Architecture for certain internal bridge functionalities, but `react-native-webrtc` and `expo-gl` needed specific config plugin registration.
- **Solution**: 
    - Enabled `newArchEnabled: true` in `app.config.js`.
    - Added `expo-gl` and `expo-asset` to `plugins` in `app.config.js`.
    - Performed `eas build --clear-cache` to ensure clean native linking.

### 3. Three.js Initialization Crash
- **Symptoms**: `TypeError: Cannot read property 'S' of undefined`; "Multiple instances of Three.js being imported" warning.
- **Cause**: `expo-three` was pulling in an older version of Three.js, causing a dual-instance conflict that broke the WebGL renderer.
- **Solution**: 
    - Removed `expo-three`.
    - Upgraded to modern stack: `three@0.170.0`, `@react-three/fiber@9.4.2`, `@react-three/drei@10.7.7`.
    - Forced exact version overrides in `package.json`.

### 4. Browser-Specific Crashes (Troika Text)
- **Symptoms**: `Property 'document' doesn't exist`.
- **Cause**: `@react-three/drei`'s `<Text />` component uses Troika, which attempts to access the browser DOM (`document.createElement`).
- **Solution**: Removed 3D text components; relied on the 2D `HUDOverlay` for object labels.

### 5. iOS Camera Connection Crash
- **Symptoms**: `NSInvalidArgumentException: No active and enabled video connection`.
- **Cause**: Moving the camera off-screen or shrinking it to 1x1 caused iOS to disable the video connection, breaking the background inference loop.
- **Solution**: Kept the camera full-screen but visually covered it with an opaque 3D canvas layer using `zIndex` and `absoluteFill`.

## Prevention for Future Implementation
- **Always deduplicate Three.js** using `overrides` in `package.json` immediately when adding 3D features.
- **Avoid off-screen/miniature camera views** on iOS if background photo capture is required.
- **Verify New Architecture compatibility** early when mixing WebGL and WebRTC.
- **Use standard 3D primitives** (Box, Cylinder) instead of complex text components to avoid `document` dependencies in React Native.
