# PRD-LLM: Extra Vision AI - Phase 1 MVP

## 1. Project Overview
Extra Vision AI is a mobile dashcam application designed to provide real-time object detection and visual assistance for drivers. Phase 1 focuses on a lean, cloud-integrated MVP using Expo and Roboflow to validate the core user experience: real-time "extra vision" on the road.

## 2. Core Features (Phase 1)
*   **Real-time Dashcam View:** A full-screen mobile camera interface optimized for automotive POV.
*   **Cloud AI Inference:** Integration with Roboflow's serverless workflow for object detection (cars, people, cyclists, etc.).
*   **HUD Overlay:** A high-performance SVG/Canvas layer to render bounding boxes and labels over the camera feed.
*   **Security Proxy:** A Cloudflare Worker to securely handle API communication and protect sensitive credentials.
*   **Priority Alerts:** Visual cues for high-priority objects (e.g., pedestrians or emergency vehicles) within critical zones.

## 3. Technical Roadmap
1.  **Setup:** Initialize Expo project with TypeScript, Zustand (state), and React Query (API fetching). Target iOS support.
2.  **Proxy:** Deploy a Cloudflare Worker as a middleware for Roboflow API requests.
3.  **Camera:** Implement a 480p/15fps camera stream with Base64 frame capture.
4.  **HUD UI:** Create a mapping system to transform Roboflow coordinates to mobile screen coordinates for SVG overlays.
5.  **Logic:** Develop "Priority Logic" to trigger alerts based on object class and proximity.

## 4. Success Metrics
*   **Latency:** < 100ms end-to-end (frame capture to HUD update).
*   **Accuracy:** Successful identification of standard road objects (cars, people) via the Roboflow model.
*   **Stability:** Sustained 15 FPS camera feed without significant thermal throttling.

## 5. Constraints & Trade-offs
*   **Connectivity Dependent:** Initial phase relies on 5G/LTE for cloud inference.
*   **Cloud Costs:** Usage-based pricing for Roboflow serverless workflows.
*   **Mobile Only:** Primary focus is iPhone 15 Pro optimization.

