# Scope Document: Extra Vision 3D Visualization (Digital Twin Mode)

## 1. Executive Summary
The "Digital Twin" mode is a specialized visualization layer for the Extra Vision AI application. Inspired by the high-fidelity FSD (Full Self-Driving) displays found in Tesla and Waymo vehicles, this mode replaces the raw camera feed with a real-time, reconstructed 3D graphics environment. This view focuses on situational awareness by abstracting complex real-world imagery into clean, actionable geometric data.

## 2. Feature Objectives
- **Data Transparency**: Visually demonstrate what the AI is detecting and how it interprets the environment.
- **Cognitive Optimization**: Provide a high-contrast, distraction-free view of the road and surrounding obstacles.
- **Modern Aesthetic**: Elevate the app's UI to match industry-leading autonomous driving visualizations.

## 3. User Experience (UX)
### 3.1. Mode Switching
- A dedicated "View Toggle" on the main HUD will allow users to switch between **Camera Mode** and **Digital Twin Mode**.
- The transition should be seamless, with the 3D canvas mounting/unmounting or fading in/out over the camera view.

### 3.2. Visual Paradigm
- **Ego Vehicle**: A stylized 3D model or icon representing the user's vehicle, positioned at a fixed "home" point in the lower-center of the screen.
- **The World**: A perspective-based 3D grid or dark ground plane that extends toward a virtual horizon.
- **Dynamic Objects**: Detected entities (Cars, Pedestrians, Trucks, Bicycles) represented as 3D bounding boxes or simplified low-poly models.
- **Zero-Latency Feel**: Use of interpolation and smoothing algorithms to ensure objects move fluidly even if the inference frame rate fluctuates.

## 4. Technical Stack
- **Engine**: Three.js via `@react-three/fiber` (R3F) for declarative, component-based 3D rendering.
- **Environment**: `expo-gl` for hardware-accelerated WebGL performance within the React Native/Expo framework.
- **State Management**: `Zustand` to pipe real-time `Detection[]` data from the `useVisionStore` directly into the R3F loop.
- **Math Utilities**: `maath` or similar for smoothing (lerping) and coordinate transformations.

## 5. Functional Requirements
### 5.1. 2D-to-3D Projection Logic
The system must project 2D bounding box data (x, y, w, h) into a virtual 3D space:
- **Lateral (X-axis)**: Mapped based on the horizontal center of the 2D detection relative to the camera FOV.
- **Depth (Z-axis)**: Estimated using a combination of the detection's "y" coordinate (closer to the bottom = closer to the car) and the physical size/height of the bounding box (larger = closer).
- **Grounding**: All objects must be "snapped" to the Y=0 ground plane.

### 5.2. Asset Representation
- **Cars**: Blue/Grey 3D cuboids or car models.
- **Pedestrians**: Upright cylinders or humanoid icons.
- **Traffic Lights/Signs**: (Future expansion) Colored beacons or flat icons positioned in 3D space.

## 6. Project Scope & Constraints
### 6.1. In-Scope
- Implementation of the Three.js Canvas and Perspective Camera.
- Logic for translating Roboflow 2D detections into 3D positions.
- Basic smoothing/interpolation to handle jittery detections.
- Toggle UI for switching between Camera and 3D views.

### 6.2. Out-of-Scope (Phase 1)
- **SLAM (Simultaneous Localization and Mapping)**: The environment will be relative to the car (Ego-centric) and will not "map" the world permanently.
- **Complex Textures**: Focus will remain on stylized, high-performance geometry.
- **Physics Engine**: No collision detection or physics simulations; purely visual representation.

## 7. Success Metrics
- **Performance**: Maintaining a consistent 30+ FPS rendering speed on modern mobile devices while running inference.
- **Visual Accuracy**: Detected objects in the 3D view should correlate spatially with their real-world counterparts (e.g., a car passing on the left in real life passes on the left in 3D).
