# Checklist: Extra Vision AI - Phase 1 MVP

## 1. Setup & Environment
- [ ] Expo Project Initialized (TS)
- [ ] Zustand & React Query Installed
- [ ] iOS Camera Permissions Configured (`app.json`)
- [ ] Initial Physical Device Build Successful

## 2. Cloudflare Proxy
- [ ] Worker Initialized (`wrangler.toml`)
- [ ] Proxy Logic Implemented (Base64 -> Roboflow)
- [ ] Roboflow API Key Secured (Secrets)
- [ ] Proxy Deployment Verified

## 3. Vision Core
- [ ] Camera Feed (480p) Rendering
- [ ] Frame Capture Loop Functional
- [ ] Inference Hook (React Query) Integrated
- [ ] Detection State (Zustand) Updating

## 4. HUD & Logic
- [ ] Coordinate Mapping (640x480 -> View) Verified
- [ ] SVG Bounding Boxes Rendering on Feed
- [ ] Priority Object Alerting Functional
- [ ] Latency < 200ms (Soft Target for MVP)

## 5. Deployment
- [ ] Final Mobile App Testing on iOS
- [ ] Thermal Throttling Strategy Implemented
- [ ] MVP Demo Ready

