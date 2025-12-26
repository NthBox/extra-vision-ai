# PRD-LLM: Extra Vision 3D Visualization (Digital Twin)

## Overview
The Digital Twin mode provides a high-fidelity, data-driven 3D reconstruction of the vehicle's environment. It replaces the live camera feed with a stylized 3D scene that visually represents detected objects (cars, pedestrians, etc.) in a spatial context relative to the user's vehicle.

## User Goals
- Switch between real-world camera view and a simplified 3D "world model".
- Understand the spatial relationship and distance of detected objects at a glance.
- Experience a smooth, high-performance visualization that mirrors real-world movement.

## Core Features (MVP)
1.  **3D Rendering Engine**: Integration of `@react-three/fiber` and `expo-gl` for hardware-accelerated 3D graphics.
2.  **3D Environment**:
    *   Dynamic 3D grid/ground plane.
    *   Fixed ego-vehicle representation (placeholder 3D model or stylized icon).
    *   Perspective camera centered on the ego-vehicle.
3.  **Real-time Object Projection**:
    *   Map 2D bounding boxes from `useVisionStore` (Zustand) to 3D coordinates.
    *   Depth estimation based on box height and Y-position.
    *   Lateral positioning based on box X-center relative to FOV.
4.  **Smoothing & Interpolation**:
    *   Implementation of lerping (linear interpolation) to ensure fluid object movement and reduce jitter from inference frames.
5.  **View Toggle**:
    *   HUD control to switch between `CAMERA` and `3D_VIEW` states.

## Technical Requirements
- **Framework**: React Native (Expo).
- **3D Stack**: `@react-three/fiber`, `three`, `expo-gl`, `@react-three/drei`.
- **Inference Integration**: Subscribe to `useVisionStore` and react to `detections` array updates.
- **Performance**: Must maintain high frame rates on mobile devices while inference is active.

## Success Criteria
- Toggle works instantly.
- 3D view renders without crashing on mobile.
- Objects in 3D view move consistently with objects in the camera view.
- Visual style matches the "Tesla/Waymo" high-tech aesthetic.
