# Feature Documentation: Phase 1 MVP Implementation

## Overview
The Phase 1 MVP of Extra Vision AI establishes a real-time mobile dashcam platform with AI-powered HUD. It utilizes a hybrid architecture combining local device camera control with cloud-based serverless inference via Roboflow and Cloudflare Workers.

## Technical Architecture

### 1. Mobile Frontend (Expo/React Native)
- **Framework**: Expo SDK 52 (TypeScript).
- **Camera Pipeline**: Uses `expo-camera` (CameraView) optimized for 480p/10FPS capture. Frames are converted to Base64 and transmitted via an optimized inference loop.
- **State Management (Zustand)**:
    - `useVisionStore`: Stores real-time detections, inference status, and timestamps.
    - `useCameraStore`: Manages camera permissions, resolution settings, and readiness state.
- **Networking (React Query)**:
    - `useInference`: A custom hook using `@tanstack/react-query`'s `useMutation` to handle asynchronous inference calls, providing robust error handling and loading states.
- **HUD UI**:
    - `HUDOverlay`: A high-performance SVG layer using `react-native-svg`.
    - **Coordinate Mapping**: Dynamic scaling of Roboflow's 640x480 coordinate space to the device's native screen dimensions.
    - **Priority Logic**: Implements a "Zone of Interest" (ZOI) detection system. Objects like pedestrians and emergency vehicles inside the ZOI are highlighted with urgent visual alerts (Red/Yellow coding).

### 2. Backend Proxy (Cloudflare Workers)
- **Name**: `extra-vision-inference-production` / `extra-vision-inference-staging`.
- **Role**: Acts as a secure middleware to protect Roboflow API keys and transform raw inference data.
- **Minification**: The worker reduces the heavy Roboflow JSON response into a lean array of `bbox`, `label`, and `score`, significantly reducing mobile bandwidth and parsing overhead.
- **Environments**: Configured with explicit `staging` and `production` blocks in `wrangler.toml` for safe feature testing.

## Implementation Details
- **Coordinate System**: Roboflow outputs are center-based (cx, cy, w, h). The mobile app transforms these to top-left coordinates for SVG rendering.
- **Alert Levels**:
    - **Urgent (Red)**: Pedestrians, cyclists, or emergency vehicles inside the central 60% of the screen.
    - **Warning (Yellow)**: Any object inside the central 60% of the screen.
    - **Standard (Green)**: Objects detected outside the central zone.

## Future Implementations & Roadmap
1. **Phase 2: Local Distillation**:
   - Migrate from `INFERENCE_WORKER_URL` to local **ExecuTorch** models.
   - Use **Unsloth** for QAT (Quantization-Aware Training) to maintain accuracy on iPhone 15 Pro hardware.
2. **Spatial Awareness**:
   - Integrate depth estimation and motion tracking (PHD distillation from SAM3).
   - Audio and haptic feedback for high-priority collision risks.
3. **Advanced HUD**:
   - Lane detection overlays.
   - Speed limit sign recognition and correlation with GPS.

## References
- [PRD](../../Requirements/extra-vision-product-definition/extra-vision-product-definition-prd.md)
- [Technical Spec](../../Requirements/extra-vision-product-definition/extra-vision-product-definition-spec.md)
- [Roboflow Workflow API Documentation](https://docs.roboflow.com/workflows)

