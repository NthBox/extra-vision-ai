# Technical Specification: Extra Vision AI - Phase 1

## 1. Architecture Overview
The system follows a Client-Proxy-Model architecture.
*   **Client:** Expo App (React Native + TypeScript).
*   **Proxy:** Cloudflare Worker (Node.js/TypeScript).
*   **Model:** Roboflow Serverless Workflow.

## 2. Component Specifications

### 2.1 Mobile Application (Expo)
*   **Expo Camera:** Uses `CameraView` from `expo-camera`.
    *   Target Resolution: `480p` (640x480).
    *   Capture Format: JPEG, Base64 encoded.
*   **State (Zustand):**
    ```typescript
    interface VisionState {
      detections: Detection[];
      isInferring: boolean;
      setDetections: (detections: Detection[]) => void;
      // ...
    }
    ```
*   **API (React Query):**
    *   `useMutation` for the inference request to the Cloudflare proxy.
    *   Polling or recursive logic to maintain 10-15 FPS.
*   **HUD Rendering:**
    *   Component: `HUDOverlay.tsx`.
    *   Coordinate Transformation: Map Roboflow coordinates (relative to 640x480) to screen dimensions using `useWindowDimensions`.

### 2.2 Cloudflare Proxy
*   **Input Schema:**
    ```json
    {
      "image": "base64_string"
    }
    ```
*   **Processing:**
    *   Append `api_key` from environment.
    *   Forward to: `https://serverless.roboflow.com/purple/workflows/find-people-cars...`
*   **Output Schema (Cleaned for Mobile):**
    ```json
    [
      {
        "bbox": [x, y, w, h],
        "label": "car",
        "score": 0.95
      }
    ]
    ```

### 2.3 Priority Logic (Front-end)
*   **Zone of Interest:** A central rectangle on the screen (e.g., center 60% width).
*   **Alert Trigger:** If `class === 'person'` or `class === 'emergency_vehicle'` and `bbox` intersects the Zone of Interest.

## 3. Data Flow
1.  `CameraView` captures frame -> `takePictureAsync`.
2.  React Query mutation sends Base64 to Cloudflare.
3.  Cloudflare sends to Roboflow -> Receives raw JSON.
4.  Cloudflare returns lean JSON to Client.
5.  Zustand updates `detections`.
6.  `HUDOverlay` re-renders bounding boxes via SVG.

## 4. Security & Performance
*   **Secrets:** Roboflow API Key stored in `Wrangler` secrets.
*   **Throttling:** Client-side delay between requests to prevent API overages and phone overheating.
*   **Error Handling:** Exponential backoff for failed inference calls via React Query.

