# Tasks: Extra Vision AI - Phase 1 Incremental Implementation

## Phase 1: Foundation & Setup
- [ ] **Task 1: Initialize Expo Project**
  - Run `npx create-expo-app@latest -t expo-template-blank-typescript`.
  - Install dependencies: `zustand`, `@tanstack/react-query`, `expo-camera`, `lucide-react-native`.
  - Setup basic folder structure (`src/components`, `src/store`, `src/hooks`, `src/api`).
- [ ] **Task 2: Configure iOS Settings**
  - Update `app.json` for camera permissions.
  - Test initial build on physical iPhone (Simulator doesn't support camera well for this).

## Phase 2: Backend Proxy (Cloudflare)
- [ ] **Task 3: Initialize Cloudflare Worker**
  - Create `wrangler.toml` in a `proxy` folder.
  - Implement the `fetch` handler to proxy requests to Roboflow.
- [ ] **Task 4: Secure & Deploy Proxy**
  - Add Roboflow API Key to Cloudflare Secrets: `npx wrangler secret put ROBOFLOW_API_KEY`.
  - Deploy to production: `npx wrangler deploy`.
  - Validate endpoint with a sample Base64 image via `curl`.

## Phase 3: Mobile Vision Pipeline
- [ ] **Task 5: Implement Camera View**
  - Create `CameraScreen.tsx` using `expo-camera`.
  - Configure for 480p capture.
- [ ] **Task 6: Setup Zustand & React Query Hooks**
  - Implement `useVisionStore` for global detection state.
  - Create `useInference` hook using `useMutation` to call the Cloudflare Proxy.
- [ ] **Task 7: Frame Capture Loop**
  - Implement a timer or recursive call to capture frames and send them to the `useInference` hook.

## Phase 4: HUD & UI
- [ ] **Task 8: Develop HUD Overlay**
  - Create `HUDOverlay.tsx` using `react-native-svg`.
  - Implement coordinate transformation logic (640x480 -> screen size).
- [ ] **Task 9: Visual Alert Logic**
  - Implement conditional styling for bounding boxes based on object class and proximity.
  - Add high-priority alerts for pedestrians and emergency vehicles.

## Phase 5: Testing & Optimization
- [ ] **Task 10: Performance Profiling**
  - Measure end-to-end latency.
  - Adjust frame rate (throttling) to manage battery and heat.

