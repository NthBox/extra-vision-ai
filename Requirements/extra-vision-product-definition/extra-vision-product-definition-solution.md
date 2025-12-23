# Feature Documentation: Extra Vision AI - Phase 1 MVP Solution

## 1. Feature Overview
This feature covers the planning and architectural design for the Phase 1 MVP of Extra Vision AI. The goal is to provide a low-latency, cloud-powered mobile dashcam experience on iOS that detects and labels road objects in real-time.

## 2. Technical Solution

### 2.1 Mobile Application (Expo)
- **Framework**: Expo (React Native) with TypeScript.
- **State Management**: **Zustand** for lightweight, persistent global state (`useVisionStore`, `useCameraStore`).
- **Networking**: **React Query** for managing inference requests, handling retries, and providing loading/error states.
- **Vision Feed**: Integrated `expo-camera` (CameraView) configured for 480p capture to balance latency and processing power.

### 2.2 Backend Proxy (Cloudflare Workers)
- **Middleware**: A Cloudflare Worker acts as a secure proxy between the mobile app and the Roboflow API.
- **Security**: Roboflow API keys are stored as **Cloudflare Secrets**, preventing exposure in the client-side code.
- **Optimization**: The worker transforms raw Roboflow responses into a minified JSON format to reduce payload size and mobile parsing overhead.

### 2.3 Computer Vision (Roboflow)
- **Model**: Serverless Workflow ID `find-people-cars-dogs-animals-cyclists...`.
- **Labels**: Cars, Pedestrians, Cyclists, Emergency Vehicles, etc.
- **Input**: Base64 encoded JPEG frames.

## 3. Future Implementations & Roadmap
This Phase 1 solution is designed with a **non-destructive modular pattern** to allow for the following future upgrades:

- **Phase 2: Local Distillation**: Migrate from cloud-based inference to on-device execution using Meta's **ExecuTorch** and distilled **YOLOv11** models (trained via Unsloth).
- **Phase 3: Spatial Awareness**: Integrate motion estimation and distance calculation derived from SAM3 tracking logic.
- **Phase 4: Advanced Alerts**: Audio/haptic alerts based on collision risk scores and object velocity.

## 4. References
- [Extra Vision AI Scope](./extra-vision-product-definition-scope.md)
- [PRD-LLM](./extra-vision-product-definition-prd-llm.md)
- [Technical Specification](./extra-vision-product-definition-spec.md)
- [Implementation Tasks](./extra-vision-product-definition-tasks.md)

