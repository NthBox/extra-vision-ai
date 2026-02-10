# extra-vision-ai

AI-powered dashcam with real-time object detection, HUD overlay, and 3D Digital Twin visualization.

## App features

- **Real-time object detection** — Cars, pedestrians, trucks, bicycles, and more via Roboflow (cloud inference).
- **Two inference modes**
  - **Manual** — Capture-and-post loop; Expo camera frames sent to cloud. Play/Pause to control.
  - **LIVE** — WebRTC stream to Roboflow for low-latency, higher FPS inference.
- **Model modes** — **YOLO** (fast) or **SAM3** (accurate); toggle in the HUD.
- **HUD overlay** — 2D bounding boxes with Zone of Interest (ZOI): urgent (red), warning (yellow), standard (green) for central vs peripheral detections.
- **3D view (Digital Twin)** — Optional overlay with ego vehicle, ground plane, and 3D objects from detections; Real vs Simulated view; camera presets (Wide, Ultra-wide, Tele) and L/R calibration nudge.
- **Secure proxy** — Cloudflare Worker in front of Roboflow to keep API keys server-side and minify responses.

Built with Expo (React Native), Zustand, React Query, and (for 3D) Three.js via `@react-three/fiber` and `expo-gl`.

---

### Deployment checklist (TestFlight)

- Prerequisites
  - Install EAS CLI: `npm i -g eas-cli` (or use `npx eas` to avoid global install)
- Build
  - `npx eas build -p ios --profile production`
- Submit
  - `npx eas submit -p ios --latest`
- Post-submit
  - Monitor App Store Connect for processing
  - Add testers and notes in TestFlight as needed

- Notes
  - Ensure the iOS bundle identifier matches `app.config.js` (e.g., `com.extravisionai.app`).
