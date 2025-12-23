# PRD: Extra Vision AI - Phase 1 MVP Implementation

## 1. Introduction
This document refines the Phase 1 MVP plan for Extra Vision AI, focusing on the technical implementation using Expo, Zustand, React Query, and Cloudflare. The goal is to establish a modular, scalable foundation for future on-device AI distillation.

## 2. Target Audience
*   Drivers seeking real-time POV visual assistance.
*   Early adopters of mobile AI dashcam technology.

## 3. Product Scope (Phase 1)
The application will be built as a native iOS app using Expo.

### 3.1 Mobile Frontend (Expo)
*   **Navigation:** Simple single-view or tab-based navigation (Focus: Dashcam HUD).
*   **State Management (Zustand):**
    *   `useVisionStore`: Manages detection results, active labels, and HUD settings.
    *   `useCameraStore`: Manages camera permissions, resolution settings, and capture state.
*   **Data Fetching (React Query):**
    *   `useInference`: Custom hook to trigger the Cloudflare/Roboflow inference pipeline and handle results/retries.
*   **UI Components:**
    *   `CameraScreen`: Main POV view.
    *   `HUDOverlay`: SVG-based layer for bounding boxes.
    *   `AlertBar`: Top/Bottom notification area for priority detections.

### 3.2 Backend Infrastructure (Cloudflare)
*   **Cloudflare Worker:**
    *   Endpoint: `POST /v1/inference`
    *   Function: Securely proxies requests to `serverless.roboflow.com` using environment-stored API keys.
    *   Optimization: Normalizes the Roboflow response to reduce mobile payload size.

### 3.3 Vision Workflow (Roboflow)
*   Utilize Workflow ID: `find-people-cars-dogs-animals-cyclists...`
*   Input: 480p Base64 images.
*   Output: Bounding boxes (x, y, width, height), confidence, and class labels.

## 4. Technical Requirements
*   **Framework:** Expo (SDK 50+) with TypeScript.
*   **Inference Frequency:** 10-15 FPS (throttled based on network/thermal conditions).
*   **Security:** API Keys strictly stored in Cloudflare Secrets; no exposure in mobile code.

## 5. Implementation Strategy
*   **Modularity:** Keep camera logic separate from detection logic.
*   **Non-Destructive:** Ensure the setup allows for Phase 2's local ExecuTorch migration without rewriting the HUD or State layers.
*   **Simplicity:** Minimal UI, focusing strictly on detection accuracy and HUD latency.

